import type { ReactNode } from "react"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f2eb] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  )
}

export function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)]">
      {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2f8fff]">{eyebrow}</p> : null}
      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

export function Button({ children }: { children: ReactNode }) {
  return (
    <button className="inline-flex items-center justify-center rounded-full bg-[#2f8fff] px-4 py-2.5 text-sm font-bold text-white shadow-[0_16px_28px_-20px_rgba(47,143,255,0.8)]">
      {children}
    </button>
  )
}

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950 p-4 text-white">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
    </div>
  )
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      {children}
    </span>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <p className="font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  )
}
