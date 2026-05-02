import type { Stage3BuildJob } from "./agentPrompt"

function js(value: string): string {
    return JSON.stringify(value)
}

export function buildFallbackFiles(job: Stage3BuildJob): Record<string, string> {
    const plan = job.projectPlan
    const contract = job.buildContract
    const productName = plan.metadata.productName
    const routes = plan.routes.slice(0, 8)
    const checks = plan.acceptanceChecks.slice(0, 5)
    const models = plan.dataModels.slice(0, 4)
    const tasks = plan.buildTasks.slice(0, 6)

    return {
        "src/styles.css": `@import "tailwindcss";
@reference "tailwindcss";

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

export const visualDirection = ${JSON.stringify(contract.visualDirection.slice(0, 5), null, 2)} as const;
`,
        "src/components/ui/app-kit.tsx": `import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f2eb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  );
}

export function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)]">
      {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2f8fff]">{eyebrow}</p> : null}
      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function Button({ children }: { children: ReactNode }) {
  return (
    <button className="inline-flex items-center justify-center rounded-lg bg-[#2f8fff] px-4 py-2.5 text-sm font-bold text-white shadow-[0_16px_28px_-20px_rgba(47,143,255,0.8)]">
      {children}
    </button>
  );
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950 p-4 text-white">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
    </div>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      {children}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}
`,
        "src/App.tsx": `import { AppShell, Button, EmptyState, MetricCard, Panel, StatusBadge } from "./components/ui/app-kit";
import { acceptanceChecks, appSummary, buildTasks, dataModels, productName, routes, successCriteria, visualDirection } from "./lib/mock-data";

export default function App() {
  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-white/70 bg-white/85 p-8 shadow-[0_30px_90px_-60px_rgba(18,32,51,0.45)] backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2f8fff]">Live Vite preview</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">{productName}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{appSummary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {visualDirection.map((item) => <StatusBadge key={item}>{item}</StatusBadge>)}
          </div>
          <div className="mt-8">
            <Button>Start primary workflow</Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Routes" value={String(routes.length)} />
            <MetricCard label="Models" value={String(dataModels.length)} />
            <MetricCard label="Checks" value={String(acceptanceChecks.length)} />
          </div>
        </div>

        <div className="rounded-lg bg-[#101827] p-6 text-white shadow-[0_30px_90px_-55px_rgba(16,24,39,0.7)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Build scope</p>
          <div className="mt-5 space-y-3">
            {buildTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{task.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Primary routes">
          {routes.map((route) => (
            <div key={route.path} className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-bold">{route.name}</p>
              <p className="mt-1 text-xs text-slate-500">{route.path}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{route.purpose}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Data model">
          {dataModels.length ? dataModels.map((model) => (
            <div key={model.name} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold">{model.name}</p>
              <p className="mt-1 text-sm text-slate-500">{model.purpose}</p>
            </div>
          )) : <EmptyState title="No persisted model yet" body="Local mock data powers this preview." />}
        </Panel>
        <Panel title="Acceptance checks">
          {successCriteria.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950">
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </Panel>
      </section>
    </AppShell>
  );
}
`,
    }
}
