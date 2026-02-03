/**
 * EditModals Component
 * 
 * Section-specific edit modals for the Unified Blueprint.
 * Provides form-based editing for all 9 UBP sections.
 * 
 * @see /Docs/Architecture-Simplification-Plan.md Phase 4.6
 */

"use client"

import { useState } from "react"
import type { UBPContent, UBPSectionData } from "./types"

export interface EditModalsProps {
  isOpen: boolean
  onClose: () => void
  section: string
  data: UBPSectionData
  onSave: (section: string, newData: UBPSectionData) => void
}

// =============================================================================
// Main Component
// =============================================================================

export default function EditModals(props: EditModalsProps) {
  if (!props.isOpen) return null
  return <EditModalContent key={props.section} {...props} />
}

function EditModalContent({
  onClose,
  section,
  data,
  onSave,
}: EditModalsProps) {
  const [formData, setFormData] = useState<UBPSectionData>(data)

  const handleSave = () => {
    onSave(section, formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#101922] border border-[#283039] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#283039]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#137fec]">edit</span>
            Edit {getSectionTitle(section)}
          </h3>
          <button
            onClick={onClose}
            className="text-[#9dabb9] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#283039] scrollbar-track-transparent">
          <FormContent section={section} data={formData} onChange={setFormData} />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#283039] flex justify-end gap-3 bg-[#0d141c] rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#d0d6dc] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-[#137fec] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Section Title Helper
// =============================================================================

function getSectionTitle(id: string): string {
  const titles: Record<string, string> = {
    vision: "Product Vision",
    scope: "Scope",
    actors: "Actors",
    behaviors: "Behaviors",
    constraints: "Constraints & Risks",
    tech: "Technology Decisions",
    phases: "Implementation Phases",
    integration: "Integration Points",
    changelog: "Change Log",
  }
  return titles[id] || id
}

// =============================================================================
// Dynamic Form Content Router
// =============================================================================

function FormContent({
  section,
  data,
  onChange,
}: {
  section: string
  data: UBPSectionData
  onChange: (d: UBPSectionData) => void
}) {
  switch (section) {
    case "vision":
      return <VisionForm data={data as UBPContent["productVision"]} onChange={onChange as (d: UBPContent["productVision"]) => void} />
    case "scope":
      return <ScopeForm data={data as UBPContent["scope"]} onChange={onChange as (d: UBPContent["scope"]) => void} />
    case "actors":
      return <ActorsForm data={data as UBPContent["actors"]} onChange={onChange as (d: UBPContent["actors"]) => void} />
    case "behaviors":
      return <BehaviorsForm data={data as UBPContent["behaviors"]} onChange={onChange as (d: UBPContent["behaviors"]) => void} />
    case "constraints":
      return <ConstraintsForm data={data as UBPContent["constraints"]} onChange={onChange as (d: UBPContent["constraints"]) => void} />
    case "tech":
      return <TechForm data={data as UBPContent["techDecisions"]} onChange={onChange as (d: UBPContent["techDecisions"]) => void} />
    case "phases":
      return <PhasesForm data={data as UBPContent["phases"]} onChange={onChange as (d: UBPContent["phases"]) => void} />
    case "integration":
      return <IntegrationsForm data={data as UBPContent["integrations"]} onChange={onChange as (d: UBPContent["integrations"]) => void} />
    case "changelog":
      return <ChangelogForm data={data as UBPContent["changelog"]} onChange={onChange as (d: UBPContent["changelog"]) => void} />
    default:
      return <div className="text-red-400">Form not implemented for {section}</div>
  }
}

// =============================================================================
// Section Forms
// =============================================================================

// 1. Vision Form
function VisionForm({
  data,
  onChange,
}: {
  data: UBPContent["productVision"]
  onChange: (d: UBPContent["productVision"]) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Description / Problem Statement">
        <textarea
          value={data?.description || ""}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          className="w-full h-32 bg-[#111418] border border-[#374151] rounded-lg p-3 text-white focus:border-[#137fec] focus:outline-none"
          placeholder="Describe the product vision..."
        />
      </Field>
      <Field label="Primary Goal">
        <input
          type="text"
          value={data?.primaryGoal || ""}
          onChange={(e) => onChange({ ...data, primaryGoal: e.target.value })}
          className="w-full bg-[#111418] border border-[#374151] rounded-lg p-3 text-white focus:border-[#137fec] focus:outline-none"
        />
      </Field>
      <Field label="Target Audience">
        <input
          type="text"
          value={data?.targetAudience || ""}
          onChange={(e) => onChange({ ...data, targetAudience: e.target.value })}
          className="w-full bg-[#111418] border border-[#374151] rounded-lg p-3 text-white focus:border-[#137fec] focus:outline-none"
        />
      </Field>
    </div>
  )
}

// 2. Scope Form
function ScopeForm({
  data,
  onChange,
}: {
  data: UBPContent["scope"]
  onChange: (d: UBPContent["scope"]) => void
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ListEditor
        label="In Scope"
        items={data?.inScope || []}
        onChange={(items) => onChange({ ...data, inScope: items })}
        placeholder="Add in-scope item..."
      />
      <ListEditor
        label="Out of Scope"
        items={data?.outOfScope || []}
        onChange={(items) => onChange({ ...data, outOfScope: items })}
        placeholder="Add out-of-scope item..."
      />
    </div>
  )
}

// 3. Actors Form
function ActorsForm({
  data,
  onChange,
}: {
  data: UBPContent["actors"]
  onChange: (d: UBPContent["actors"]) => void
}) {
  const actors = data || []

  const updateActor = (index: number, field: string, value: string) => {
    const newActors = [...actors]
    newActors[index] = { ...newActors[index], [field]: value }
    onChange(newActors)
  }

  const addActor = () => {
    onChange([...actors, { name: "New Actor", description: "", icon: "person" }])
  }

  const removeActor = (index: number) => {
    onChange(actors.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {actors.map((actor, i) => (
        <div key={i} className="bg-[#1f2937] p-4 rounded-lg flex gap-4 items-start border border-[#374151]">
          <div className="flex-1 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-[#9dabb9] mb-1 block">Name</label>
                <input
                  value={actor.name}
                  onChange={(e) => updateActor(i, "name", e.target.value)}
                  className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-[#9dabb9] mb-1 block">Icon</label>
                <input
                  value={actor.icon || "person"}
                  onChange={(e) => updateActor(i, "icon", e.target.value)}
                  className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#9dabb9] mb-1 block">Description</label>
              <textarea
                value={actor.description}
                onChange={(e) => updateActor(i, "description", e.target.value)}
                className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm h-20"
              />
            </div>
          </div>
          <button onClick={() => removeActor(i)} className="text-red-400 hover:text-red-300 mt-6">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
      <AddButton onClick={addActor} label="Add Actor" />
    </div>
  )
}

// 4. Behaviors Form
function BehaviorsForm({
  data,
  onChange,
}: {
  data: UBPContent["behaviors"]
  onChange: (d: UBPContent["behaviors"]) => void
}) {
  const behaviors = data || []

  const updateBehavior = (index: number, field: string, value: string) => {
    const newBehaviors = [...behaviors]
    newBehaviors[index] = { ...newBehaviors[index], [field]: value }
    onChange(newBehaviors)
  }

  const addBehavior = () => {
    onChange([
      ...behaviors,
      {
        id: `BH-${String(behaviors.length + 1).padStart(2, "0")}`,
        title: "New Behavior",
        given: "",
        when: "",
        then: "",
      },
    ])
  }

  const removeBehavior = (index: number) => {
    onChange(behaviors.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {behaviors.map((b, i) => (
        <div key={i} className="bg-[#1f2937] p-4 rounded-lg space-y-4 border border-[#374151]">
          <div className="flex justify-between items-start">
            <div className="flex gap-3 items-center flex-1">
              <input
                value={b.id}
                onChange={(e) => updateBehavior(i, "id", e.target.value)}
                className="w-20 bg-[#111418] border border-[#374151] rounded px-2 py-1 text-white text-sm font-mono"
                placeholder="ID"
              />
              <input
                value={b.title}
                onChange={(e) => updateBehavior(i, "title", e.target.value)}
                className="flex-1 bg-[#111418] border border-[#374151] rounded px-2 py-1 text-white text-sm font-bold"
                placeholder="Title"
              />
            </div>
            <button onClick={() => removeBehavior(i)} className="text-red-400 hover:text-red-300 ml-2">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-[60px_1fr] gap-3 items-center">
              <span className="text-purple-400 font-bold text-xs text-right">GIVEN</span>
              <input
                value={b.given || ""}
                onChange={(e) => updateBehavior(i, "given", e.target.value)}
                className="bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-[60px_1fr] gap-3 items-center">
              <span className="text-blue-400 font-bold text-xs text-right">WHEN</span>
              <input
                value={b.when || ""}
                onChange={(e) => updateBehavior(i, "when", e.target.value)}
                className="bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-[60px_1fr] gap-3 items-center">
              <span className="text-green-400 font-bold text-xs text-right">THEN</span>
              <input
                value={b.then || ""}
                onChange={(e) => updateBehavior(i, "then", e.target.value)}
                className="bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#9dabb9] mb-1 block">Mermaid Diagram Code</label>
            <textarea
              value={b.diagram || ""}
              onChange={(e) => updateBehavior(i, "diagram", e.target.value)}
              className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-[#d0d6dc] text-xs font-mono h-24"
              placeholder="graph TD..."
            />
          </div>
        </div>
      ))}
      <AddButton onClick={addBehavior} label="Add Behavior" />
    </div>
  )
}

// 5. Constraints Form
function ConstraintsForm({
  data,
  onChange,
}: {
  data: UBPContent["constraints"]
  onChange: (d: UBPContent["constraints"]) => void
}) {
  const items = data || []

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="bg-[#1f2937] p-4 rounded-lg flex gap-4 items-start border border-[#374151]">
          <div className="flex-1 space-y-3">
            <div className="flex gap-3">
              <select
                value={item.type}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...item, type: e.target.value as "warning" | "risk" | "constraint" }
                  onChange(newItems)
                }}
                className="bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              >
                <option value="warning">Constraint</option>
                <option value="risk">Risk</option>
                <option value="constraint">Constraint</option>
              </select>
              <input
                value={item.title}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...item, title: e.target.value }
                  onChange(newItems)
                }}
                className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                placeholder="Title"
              />
            </div>
            <textarea
              value={item.description}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...item, description: e.target.value }
                onChange(newItems)
              }}
              className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm h-20"
              placeholder="Description"
            />
          </div>
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 mt-2">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
      <AddButton
        onClick={() => onChange([...items, { type: "warning", title: "New Constraint", description: "" }])}
        label="Add Constraint/Risk"
      />
    </div>
  )
}

// 6. Tech Decisions Form
function TechForm({
  data,
  onChange,
}: {
  data: UBPContent["techDecisions"]
  onChange: (d: UBPContent["techDecisions"]) => void
}) {
  const items = data || []

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 items-center">
          <input
            value={item.category}
            onChange={(e) => {
              const newItems = [...items]
              newItems[i] = { ...item, category: e.target.value }
              onChange(newItems)
            }}
            className="w-1/3 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
            placeholder="Category (e.g. Database)"
          />
          <input
            value={item.choice}
            onChange={(e) => {
              const newItems = [...items]
              newItems[i] = { ...item, choice: e.target.value }
              onChange(newItems)
            }}
            className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
            placeholder="Choice (e.g. Postgres)"
          />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, { category: "", choice: "" }])} label="Add Tech Decision" />
    </div>
  )
}

// 7. Implementation Phases Form
function PhasesForm({
  data,
  onChange,
}: {
  data: UBPContent["phases"]
  onChange: (d: UBPContent["phases"]) => void
}) {
  const items = data || []

  return (
    <div className="space-y-4">
      {items.map((phase, i) => (
        <div key={i} className="bg-[#1f2937] p-4 rounded-lg flex gap-4 items-start border border-[#374151]">
          <div className="flex-1 space-y-3">
            <div className="flex gap-3">
              <select
                value={phase.status || "upcoming"}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...phase, status: e.target.value as "completed" | "current" | "upcoming" }
                  onChange(newItems)
                }}
                className="bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              >
                <option value="completed">Completed</option>
                <option value="current">Current</option>
                <option value="upcoming">Upcoming</option>
              </select>
              <input
                value={phase.name}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...phase, name: e.target.value }
                  onChange(newItems)
                }}
                className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm font-bold"
                placeholder="Phase Name"
              />
              <input
                value={phase.timeline || ""}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...phase, timeline: e.target.value }
                  onChange(newItems)
                }}
                className="w-32 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                placeholder="Timeline"
              />
            </div>
            <textarea
              value={phase.description}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...phase, description: e.target.value }
                onChange(newItems)
              }}
              className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm h-16"
              placeholder="Description and deliverables"
            />
          </div>
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 mt-2">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
      <AddButton
        onClick={() => onChange([...items, { name: "New Phase", description: "", status: "upcoming" }])}
        label="Add Phase"
      />
    </div>
  )
}

// 8. Integrations Form
function IntegrationsForm({
  data,
  onChange,
}: {
  data: UBPContent["integrations"]
  onChange: (d: UBPContent["integrations"]) => void
}) {
  const items = data || []

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 bg-[#1f2937] p-3 rounded-lg border border-[#374151]">
          <div className="flex gap-3">
            <input
              value={item.system}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...item, system: e.target.value }
                onChange(newItems)
              }}
              className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              placeholder="System"
            />
            <input
              value={item.method}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...item, method: e.target.value }
                onChange(newItems)
              }}
              className="w-1/3 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
              placeholder="Method"
            />
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
          <input
            value={item.purpose}
            onChange={(e) => {
              const newItems = [...items]
              newItems[i] = { ...item, purpose: e.target.value }
              onChange(newItems)
            }}
            className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
            placeholder="Purpose"
          />
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, { system: "", method: "", purpose: "" }])} label="Add Integration" />
    </div>
  )
}

// 9. Changelog Form
function ChangelogForm({
  data,
  onChange,
}: {
  data: UBPContent["changelog"]
  onChange: (d: UBPContent["changelog"]) => void
}) {
  const items = data || []

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="bg-[#1f2937] p-4 rounded-lg flex gap-4 items-start border border-[#374151]">
          <div className="flex-1 space-y-3">
            <div className="flex gap-3">
              <input
                value={item.version}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...item, version: e.target.value }
                  onChange(newItems)
                }}
                className="w-20 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                placeholder="v0.0"
              />
              <input
                value={item.title}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...item, title: e.target.value }
                  onChange(newItems)
                }}
                className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm font-bold"
                placeholder="Title"
              />
              <input
                value={item.timestamp || ""}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[i] = { ...item, timestamp: e.target.value }
                  onChange(newItems)
                }}
                className="w-32 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
                placeholder="Date"
              />
            </div>
            <textarea
              value={item.description}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...item, description: e.target.value }
                onChange(newItems)
              }}
              className="w-full bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm h-16"
              placeholder="Changes description"
            />
          </div>
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 mt-2">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ))}
      <AddButton
        onClick={() =>
          onChange([
            ...items,
            { version: "0.1", title: "Update", description: "", timestamp: new Date().toLocaleDateString() },
          ])
        }
        label="Add Log Entry"
      />
    </div>
  )
}

// =============================================================================
// Utility Components
// =============================================================================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-bold text-[#d0d6dc] mb-2 block">{label}</label>
      {children}
    </div>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 border-2 border-dashed border-[#374151] rounded-lg text-[#9dabb9] hover:border-[#137fec] hover:text-[#137fec] transition-colors flex items-center justify-center gap-2"
    >
      <span className="material-symbols-outlined">add</span>
      {label}
    </button>
  )
}

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-white uppercase tracking-wide">{label}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = e.target.value
                onChange(newItems)
              }}
              className="flex-1 bg-[#111418] border border-[#374151] rounded px-3 py-2 text-white text-sm"
            />
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-red-400 hover:text-red-300 px-1"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = e.currentTarget.value.trim()
                if (val) {
                  onChange([...items, val])
                  e.currentTarget.value = ""
                }
              }
            }}
            className="flex-1 bg-[#1f2937] border border-[#374151] border-dashed rounded px-3 py-2 text-[#9dabb9] text-sm focus:border-[#137fec] focus:text-white"
          />
        </div>
      </div>
    </div>
  )
}
