"use client";

import type { ReactNode } from "react";
import type { PRDConfig } from "@/lib/prd/schema";

interface PRDPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  prd: PRDConfig | null;
  projectName?: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-[#e4ddd4] bg-[#fcfaf7] p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export default function PRDPreview({ isOpen, onClose, prd, projectName }: PRDPreviewProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#f5efe7]/70 backdrop-blur-sm transition-opacity ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-[#e4ddd4] bg-[#fbf7f1] shadow-[0_40px_90px_-40px_rgba(20,27,44,0.35)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-[#e4ddd4] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">PRD Preview</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {projectName || prd?.metadata.productName || "PRD Config"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
            aria-label="Close PRD preview"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!prd ? (
            <div className="rounded-[1.75rem] border border-dashed border-[#d9d1c6] bg-white/70 p-6 text-sm text-slate-500">
              Generate a PRD to populate this preview.
            </div>
          ) : (
            <>
              <Section title="Metadata">
                <dl className="grid grid-cols-1 gap-4 text-sm text-slate-700 sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-400">Product</dt>
                    <dd className="mt-1 font-medium text-slate-900">{prd.metadata.productName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Platforms</dt>
                    <dd className="mt-1">{prd.metadata.platforms.join(", ") || "No platforms selected"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Target audience</dt>
                    <dd className="mt-1">{prd.metadata.targetAudience}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Design vibe</dt>
                    <dd className="mt-1">{prd.metadata.designVibe}</dd>
                  </div>
                </dl>
              </Section>

              <Section title="Features">
                <div className="space-y-3">
                  {prd.features.map((feature) => (
                    <article key={feature.id} className="rounded-[1.25rem] border border-[#e5ddd3] bg-white p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">{feature.title}</h4>
                        <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2f8fff]">
                          {feature.priority} / {feature.scope}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-600">{feature.description}</p>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-500">
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
                    <article key={entity.name} className="rounded-[1.25rem] border border-[#e5ddd3] bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-900">{entity.name}</h4>
                      {entity.description ? <p className="mt-1 text-sm text-slate-600">{entity.description}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entity.fields.map((field) => (
                          <span
                            key={`${entity.name}-${field.name}`}
                            className="rounded-full border border-[#d9e2ef] bg-[#f8fbff] px-2.5 py-1 text-xs text-slate-600"
                          >
                            {field.name}: {field.type}
                            {field.required ? " *" : ""}
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
                    <article key={flow.id} className="rounded-[1.25rem] border border-[#e5ddd3] bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-900">{flow.name}</h4>
                      <ol className="mt-3 space-y-2">
                        {flow.steps.map((step, index) => (
                          <li key={step.id} className="rounded-[1rem] border border-[#ece5db] bg-[#fcfaf7] p-3 text-sm text-slate-600">
                            <span className="mr-2 font-semibold text-[#2f8fff]">{index + 1}.</span>
                            <span className="font-medium text-slate-800">{step.screen}</span>
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
                <pre className="overflow-x-auto rounded-[1.25rem] bg-[#f3eee7] p-3 text-xs text-slate-600">
                  {JSON.stringify(prd, null, 2)}
                </pre>
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
