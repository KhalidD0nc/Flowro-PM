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

@layer base {
  :root {
    --background: 40 30% 96%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 213 100% 59%;
    --primary-foreground: 0 0% 100%;
    --secondary: 214 32% 91%;
    --secondary-foreground: 222 47% 11%;
    --muted: 210 20% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 213 100% 95%;
    --accent-foreground: 213 100% 40%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 213 100% 59%;
    --radius: 0.625rem;
  }

  * { border-color: hsl(var(--border)); box-sizing: border-box; }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    margin: 0;
    min-height: 100vh;
  }
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
        "src/App.tsx": `import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { acceptanceChecks, appSummary, buildTasks, dataModels, productName, routes, visualDirection } from "./lib/mock-data";

export default function App() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[hsl(var(--primary))]">Live preview</p>
            <CardTitle className="text-4xl font-black tracking-tight">{productName}</CardTitle>
            <CardDescription className="text-base leading-7">{appSummary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {visualDirection.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
            </div>
            <div className="mt-6 flex gap-3">
              <Button>Start primary workflow</Button>
              <Button variant="outline">View all routes</Button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Routes", value: String(routes.length) },
                { label: "Data models", value: String(dataModels.length) },
                { label: "Checks", value: String(acceptanceChecks.length) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-[hsl(var(--muted))] p-4">
                  <p className="text-2xl font-black text-[hsl(var(--foreground))]">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Routes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {routes.map((route) => (
                <div key={route.path} className="rounded-lg bg-[hsl(var(--muted))] p-4">
                  <p className="text-sm font-semibold">{route.name}</p>
                  <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{route.path}</p>
                  <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{route.purpose}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Build tasks</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {buildTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-[hsl(var(--border))] p-4">
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{task.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Acceptance checks</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {acceptanceChecks.map((check) => (
                <div key={check} className="flex gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span>{check}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
`,
    }
}
