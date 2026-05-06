import type { BuildJob } from "./agentPrompt"

function js(value: string): string {
    return JSON.stringify(value)
}

export function buildFallbackFiles(job: BuildJob): Record<string, string> {
    const plan = job.projectPlan
    const contract = job.buildContract
    const productName = plan.metadata.productName
    const routes = plan.routes.slice(0, 8)
    const checks = plan.acceptanceChecks.slice(0, 5)
    const models = plan.dataModels.slice(0, 4)
    const tasks = plan.buildTasks.slice(0, 6)

    return {
        "src/styles.css": `@import "tailwindcss";

@layer base {
  :root {
    --background: 42 30% 96%;
    --foreground: 220 30% 10%;
    --card: 0 0% 100%;
    --card-foreground: 220 30% 10%;
    --primary: 204 95% 45%;
    --primary-foreground: 0 0% 100%;
    --secondary: 36 30% 90%;
    --secondary-foreground: 220 30% 10%;
    --muted: 42 28% 91%;
    --muted-foreground: 218 14% 38%;
    --accent: 164 68% 42%;
    --accent-foreground: 166 88% 12%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 38 24% 82%;
    --input: 38 24% 82%;
    --ring: 204 95% 45%;
    --radius: 0.5rem;
  }

  * { border-color: hsl(var(--border)); box-sizing: border-box; }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    margin: 0;
    min-height: 100vh;
  }

  a, button { min-height: 44px; }

  :focus-visible {
    outline: 3px solid hsl(var(--ring) / 0.35);
    outline-offset: 3px;
  }
}

@layer utilities {
  .flowro-grid {
    background-image:
      linear-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--foreground) / 0.08) 1px, transparent 1px);
    background-size: 44px 44px;
  }

  .flowro-enter {
    animation: flowro-enter 520ms ease-out both;
  }

  @keyframes flowro-enter {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
}
`,
        "src/lib/mock-data.ts": `export const productName = ${js(productName)};

export const appSummary = ${js(plan.appSummary)};

export const targetUser = ${js(plan.targetUser)};

export const problem = ${js(plan.problem)};

export const routes = ${JSON.stringify(routes, null, 2)} as const;

export const successCriteria = ${JSON.stringify(plan.successCriteria.slice(0, 5), null, 2)} as const;

export const dataModels = ${JSON.stringify(models, null, 2)} as const;

export const buildTasks = ${JSON.stringify(tasks, null, 2)} as const;

export const acceptanceChecks = ${JSON.stringify(checks, null, 2)} as const;

export const visualDirection = ${JSON.stringify(contract.visualDirection.slice(0, 5), null, 2)} as const;
`,
        "src/components/ui/app-kit.tsx": `import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleDot, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {children}
    </div>
  );
}

export function PrimaryLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[hsl(var(--foreground))] px-5 py-3 text-sm font-bold text-white transition hover:bg-[hsl(var(--primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--ring))]"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-black uppercase tracking-[0.22em] text-[hsl(var(--primary))]">{children}</p>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={\`rounded-lg border border-[hsl(var(--border))] bg-white/78 p-5 shadow-sm \${className}\`}>{children}</section>;
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[hsl(var(--muted))] p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">{label}</p>
    </div>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[hsl(var(--accent))]/15 px-3 text-xs font-bold text-[hsl(var(--accent-foreground))]">
      <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-950">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function WorkspaceIcon() {
  return <LayoutDashboard className="h-5 w-5" aria-hidden="true" />;
}
`,
        "src/pages/LandingPage.tsx": `import { Link } from "react-router-dom";
import { Layers3 } from "lucide-react";
import { AppShell, PrimaryLink, SectionLabel, StatusBadge } from "../components/ui/app-kit";
import { appSummary, productName, routes, successCriteria, targetUser, visualDirection } from "../lib/mock-data";

export default function LandingPage() {
  const heroPoints = successCriteria.slice(0, 3);

  return (
    <AppShell>
      <main className="flowro-grid min-h-screen overflow-hidden">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="text-sm font-black tracking-tight" aria-label={\`\${productName} home\`}>{productName}</Link>
          <Link to="/app" className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-bold text-[hsl(var(--foreground))] hover:bg-white/70">Open app</Link>
        </header>

        <section className="mx-auto grid min-h-[calc(100svh-84px)] max-w-7xl items-center gap-10 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flowro-enter max-w-3xl">
            <SectionLabel>Generated product preview</SectionLabel>
            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-tight text-[hsl(var(--foreground))] sm:text-7xl lg:text-8xl">
              {productName}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))] sm:text-xl">
              {appSummary}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryLink to="/app">Launch workspace</PrimaryLink>
              <a href="#proof" className="inline-flex min-h-11 items-center rounded-md border border-[hsl(var(--border))] bg-white/70 px-5 py-3 text-sm font-bold hover:bg-white">Review scope</a>
            </div>
          </div>

          <div className="flowro-enter relative min-h-[420px] lg:min-h-[560px]" style={{ animationDelay: "120ms" }}>
            <div className="absolute inset-0 rounded-[2rem] bg-[hsl(var(--foreground))] shadow-2xl" />
            <div className="absolute inset-x-6 top-6 rounded-xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-[hsl(var(--foreground))]"><Layers3 className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <p className="text-sm font-bold">{targetUser}</p>
                    <p className="text-xs text-white/60">{routes.length} planned screens</p>
                  </div>
                </div>
                <StatusBadge>Ready</StatusBadge>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 grid gap-3">
              {heroPoints.map((point, index) => (
                <div key={point} className="rounded-lg bg-white p-4 text-[hsl(var(--foreground))] shadow-lg">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[hsl(var(--primary))]">0{index + 1}</p>
                  <p className="mt-2 text-sm font-semibold leading-6">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="proof" className="mx-auto grid max-w-7xl gap-6 px-5 pb-16 sm:px-8 lg:grid-cols-3">
          {visualDirection.slice(0, 3).map((item) => (
            <div key={item} className="border-t border-[hsl(var(--border))] pt-5">
              <p className="text-sm font-bold leading-6">{item}</p>
            </div>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
`,
        "src/pages/AppWorkspace.tsx": `import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppShell, CheckItem, MetricCard, Panel, SectionLabel, StatusBadge, WorkspaceIcon } from "../components/ui/app-kit";
import { acceptanceChecks, appSummary, buildTasks, dataModels, problem, productName, routes } from "../lib/mock-data";

export default function AppWorkspace() {
  return (
    <AppShell>
      <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 border-b border-[hsl(var(--border))] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Landing
              </Link>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--foreground))] text-white"><WorkspaceIcon /></span>
                <div>
                  <SectionLabel>Product workspace</SectionLabel>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{productName}</h1>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {routes.slice(0, 4).map((route) => <StatusBadge key={route.path}>{route.name}</StatusBadge>)}
            </div>
          </header>

          <section className="grid gap-6 py-6 lg:grid-cols-[1.4fr_0.8fr]">
            <Panel className="space-y-5">
              <div>
                <h2 className="text-xl font-black">Plan status</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{appSummary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Routes" value={String(routes.length)} />
                <MetricCard label="Models" value={String(dataModels.length)} />
                <MetricCard label="Checks" value={String(acceptanceChecks.length)} />
              </div>
              <div className="rounded-lg bg-[hsl(var(--muted))] p-4">
                <p className="text-sm font-bold">Problem</p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{problem}</p>
              </div>
            </Panel>

            <Panel>
              <h2 className="text-xl font-black">Acceptance checks</h2>
              <div className="mt-4 space-y-2">
                {acceptanceChecks.map((check) => <CheckItem key={check}>{check}</CheckItem>)}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 pb-8 lg:grid-cols-3">
            <Panel>
              <h2 className="text-lg font-black">Routes</h2>
              <div className="mt-4 space-y-3">
                {routes.map((route) => (
                  <div key={route.path} className="rounded-md bg-[hsl(var(--muted))] p-4">
                    <p className="text-sm font-bold">{route.name}</p>
                    <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{route.path === "/" ? "/app" : \`/app\${route.path}\`}</p>
                    <p className="mt-2 text-sm leading-6">{route.purpose}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="text-lg font-black">Build tasks</h2>
              <div className="mt-4 space-y-3">
                {buildTasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-[hsl(var(--border))] p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-bold">{task.title}</p>
                        <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{task.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="text-lg font-black">Data models</h2>
              <div className="mt-4 space-y-3">
                {dataModels.length === 0 ? (
                  <div className="rounded-md bg-[hsl(var(--muted))] p-4 text-sm text-[hsl(var(--muted-foreground))]">No persistent data model is required for this preview.</div>
                ) : dataModels.map((model) => (
                  <div key={model.name} className="rounded-md bg-[hsl(var(--muted))] p-4">
                    <p className="text-sm font-bold">{model.name}</p>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{model.purpose}</p>
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--primary))]">{model.fields.length} fields</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
`,
        "src/App.tsx": `import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AppWorkspace from "./pages/AppWorkspace";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<AppWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`,
    }
}
