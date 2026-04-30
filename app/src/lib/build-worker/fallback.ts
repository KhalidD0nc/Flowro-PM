import type { Stage3BuildJob } from "./agentPrompt"

function js(value: string): string {
    return JSON.stringify(value)
}

function routePathToPageFile(routePath: string): string | null {
    if (routePath === "/") return "src/app/page.tsx"
    const segments = routePath
        .split("/")
        .filter(Boolean)
        .map((segment) => segment.replace(/[^a-zA-Z0-9_[\]-]/g, "-"))
        .filter(Boolean)

    if (!segments.length) return null
    return `src/app/${segments.join("/")}/page.tsx`
}

export function buildFallbackFiles(job: Stage3BuildJob): Record<string, string> {
    const plan = job.projectPlan
    const productName = plan.metadata.productName
    const routes = plan.routes.slice(0, 8)
    const checks = plan.acceptanceChecks.slice(0, 5)
    const models = plan.dataModels.slice(0, 4)
    const tasks = plan.buildTasks.slice(0, 6)

    const files: Record<string, string> = {
        "src/app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #f7f3ec;
  --foreground: #122033;
}

body {
  background: radial-gradient(circle at top left, rgba(47, 143, 255, 0.16), transparent 34rem), linear-gradient(135deg, #f7f3ec 0%, #eef5ff 100%);
  color: var(--foreground);
}
`,
        "src/lib/mock-data.ts": `export const productName = ${js(productName)};

export const appSummary = ${js(plan.appSummary)};

export const routes = ${JSON.stringify(routes, null, 2)} as const;

export const successCriteria = ${JSON.stringify(plan.successCriteria.slice(0, 5), null, 2)} as const;

export const dataModels = ${JSON.stringify(models, null, 2)} as const;

export const buildTasks = ${JSON.stringify(tasks, null, 2)} as const;

export const acceptanceChecks = ${JSON.stringify(checks, null, 2)} as const;
`,
        "src/app/layout.tsx": `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${js(productName)},
  description: ${js(plan.appSummary)},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
        "src/app/page.tsx": `import { acceptanceChecks, appSummary, buildTasks, dataModels, productName, routes, successCriteria } from "@/lib/mock-data";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 text-slate-950">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/82 p-8 shadow-[0_30px_90px_-60px_rgba(18,32,51,0.45)] backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2f8fff]">Generated preview</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">{productName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{appSummary}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric label="Routes" value={String(routes.length)} />
            <Metric label="Models" value={String(dataModels.length)} />
            <Metric label="Checks" value={String(acceptanceChecks.length)} />
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#101827] p-6 text-white shadow-[0_30px_90px_-55px_rgba(16,24,39,0.7)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Build scope</p>
          <div className="mt-5 space-y-3">
            {buildTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{task.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 lg:grid-cols-3">
        <Panel title="Primary routes">
          {routes.map((route) => (
            <div key={route.path} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold">{route.name}</p>
              <p className="mt-1 text-xs text-slate-500">{route.path}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{route.purpose}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Data model">
          {dataModels.length ? dataModels.map((model) => (
            <div key={model.name} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold">{model.name}</p>
              <p className="mt-1 text-sm text-slate-500">{model.purpose}</p>
            </div>
          )) : <p className="text-sm text-slate-500">Local mock data powers this preview.</p>}
        </Panel>
        <Panel title="Acceptance checks">
          {successCriteria.map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-4 text-white">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/86 p-6 shadow-[0_20px_60px_-50px_rgba(18,32,51,0.35)]">
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
`,
    }

    for (const route of routes) {
        const filePath = routePathToPageFile(route.path)
        if (!filePath || filePath === "src/app/page.tsx") continue

        files[filePath] = `const actions = ${JSON.stringify(route.primaryActions.slice(0, 4), null, 2)} as const;

export default function RoutePage() {
  return (
    <main className="min-h-screen bg-[#f7f3ec] px-6 py-10 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-white/86 p-8 shadow-[0_30px_90px_-60px_rgba(18,32,51,0.45)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2f8fff]">{${js(route.path)}}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">{${js(route.name)}}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{${js(route.purpose)}}</p>
        <div className="mt-8 grid gap-3">
          {actions.map((action) => (
            <div key={action} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">{action}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
`
    }

    return files
}
