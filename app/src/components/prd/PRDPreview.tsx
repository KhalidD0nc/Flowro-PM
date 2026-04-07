"use client"

import type { ReactNode } from "react"
import type { PRDConfig } from "@/lib/prd/schema"

interface PRDPreviewProps {
    isOpen: boolean
    onClose: () => void
    prd: PRDConfig | null
    projectName?: string
}

function Section({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
                {title}
            </h3>
            {children}
        </section>
    )
}

export default function PRDPreview({ isOpen, onClose, prd, projectName }: PRDPreviewProps) {
    return (
        <>
            <div
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={onClose}
            />

            <aside
                className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0f1319] shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Phase 1 Preview</p>
                        <h2 className="text-lg font-semibold text-white">
                            {projectName || prd?.metadata.productName || "PRD Config"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                        aria-label="Close PRD preview"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {!prd ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                            Generate a PRD to populate this preview.
                        </div>
                    ) : (
                        <>
                            <Section title="Metadata">
                                <dl className="grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-slate-500">Product</dt>
                                        <dd>{prd.metadata.productName}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Platforms</dt>
                                        <dd>{prd.metadata.platforms.join(", ")}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Target Audience</dt>
                                        <dd>{prd.metadata.targetAudience}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-500">Design Vibe</dt>
                                        <dd>{prd.metadata.designVibe}</dd>
                                    </div>
                                </dl>
                            </Section>

                            <Section title="Features">
                                <div className="space-y-3">
                                    {prd.features.map((feature) => (
                                        <article key={feature.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                                            <div className="mb-1 flex items-center justify-between gap-3">
                                                <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                                                <span className="text-xs uppercase tracking-[0.08em] text-cyan-300">
                                                    {feature.priority} / {feature.scope}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300">{feature.description}</p>
                                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
                                                {feature.acceptanceCriteria.map((criterion, index) => (
                                                    <li key={`${feature.id}-${index}`}>{criterion}</li>
                                                ))}
                                            </ul>
                                        </article>
                                    ))}
                                </div>
                            </Section>

                            <Section title="Entities">
                                <div className="space-y-3">
                                    {prd.entities.map((entity) => (
                                        <article key={entity.name} className="rounded-xl border border-white/10 bg-black/10 p-3">
                                            <h4 className="text-sm font-semibold text-white">{entity.name}</h4>
                                            {entity.description ? (
                                                <p className="mt-1 text-sm text-slate-300">{entity.description}</p>
                                            ) : null}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {entity.fields.map((field) => (
                                                    <span
                                                        key={`${entity.name}-${field.name}`}
                                                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                                                    >
                                                        {field.name}: {field.type}{field.required ? " *" : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </Section>

                            <Section title="Flows">
                                <div className="space-y-3">
                                    {prd.flows.map((flow) => (
                                        <article key={flow.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                                            <h4 className="text-sm font-semibold text-white">{flow.name}</h4>
                                            <ol className="mt-2 space-y-2">
                                                {flow.steps.map((step, index) => (
                                                    <li key={step.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-2 text-sm text-slate-300">
                                                        <span className="mr-2 text-cyan-300">{index + 1}.</span>
                                                        <span className="font-medium text-slate-100">{step.screen}</span>
                                                        {" - "}
                                                        {step.action}
                                                        {step.actor ? ` (${step.actor})` : ""}
                                                        {step.outcome ? ` -> ${step.outcome}` : ""}
                                                    </li>
                                                ))}
                                            </ol>
                                        </article>
                                    ))}
                                </div>
                            </Section>

                            <Section title="Raw JSON">
                                <pre className="overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-slate-300">
                                    {JSON.stringify(prd, null, 2)}
                                </pre>
                            </Section>
                        </>
                    )}
                </div>
            </aside>
        </>
    )
}
