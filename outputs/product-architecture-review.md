# Flowro Execution Roadmap: Config-Driven PRD System

## Goal
Evolve Flowro from a vague text-blueprint generator into a **Deterministic PRD Configurator**, perfectly optimized for a downstream AI Designer Agent (e.g., Google Stitch). The system will move away from "writing a document" towards a dashboard of structured controls, real-time visual diagrams, and an iterative ReACT enhancement agent.

## The Strategy: Config over Document
A large text document is overwhelming for users and useless for a Designer Agent. The PRD must be strict data. 
The core UI will act as a control center using a **Split-Pane Layout**:
- **Left Side (Configuration):** Toggles for platforms, dropdowns for design themes, and structured CRUD lists for features and acceptance criteria.
- **Right Side (Live Preview):** Dynamic Mermaid.js diagrams (User Flowcharts, Data ERDs) and a clean, read-only summary that update instantly as the left pane changes.

---



### Phase 1: The Data Engine & API (Immediate Impact)
*Goal: Stop producing unstructured text. Start producing explicit PRD JSON. Skip the slow migration, rip the bandaid off regarding naming and data structure.*

1. **Nuke 'UBP' & Blueprint:** Delete all legacy blueprint database schemas and types immediately.
2. **Define Strict PRD Schema (`PRDConfig`):** Create the TypeScript schema forcing only what Stitch needs:
   - `metadata`: Platforms (Web/iOS), Target Audience, Design Vibe.
   - `entities`: Array of data models (for the Entity Relationship Diagram).
   - `flows`: Step-by-step navigation paths (for the User Flowchart).
   - `features`: Array of core requirements with Priority/Scope limits.
3. **Refactor Initial Generation:** Force the `/api/generate` LLM endpoint to utilize structured outputs (Zod validation) to return this exact JSON schema, failing if it deviates.

**Actionable Tasks:**
- [ ] Delete `blueprint` schemas, types, and DB migrations.
- [ ] Create `PRDConfig` Zod schema and TypeScript interface in a new `types/prd.ts`.
- [ ] Update `/api/generate` to enforce the output using `zodResponseFormat` (or equivalent structured outputs).
- [ ] Test the API with an automated call to ensure it returns the exact valid JSON.

### Phase 2: The Dashboard UI & Diagram Rendering
*Goal: Build the split-pane control center. The user should feel like they are "configuring" software, not writing an essay.*

1. **Left Pane (Form Controls):** Build React components that let the PM manually edit the `PRDConfig` JSON in a user-friendly way (check boxes, input fields, Add/Remove feature lists).
2. **Right Pane (Live Diagrams):** Implement Mermaid.js rendering. 
   - Dynamically map the `flows` array to a navigation flowchart.
   - Dynamically map the `entities` array to a database ERD.
3. **State Sync:** Wire the UI so that changing a text field in the left pane instantly re-renders the diagram on the right. 

**Actionable Tasks:**
- [ ] Build the base grid/flex layout for the Split-Pane view.
- [ ] Create basic React forms (Inputs/Checkboxes/Lists) to edit the `PRDConfig` object in state.
- [ ] Create a `<MermaidRenderer />` component that dynamically mounts Mermaid charts.
- [ ] Write a parser function: `mapPRDFlowsToMermaid(flows)`.
- [ ] Write a parser function: `mapPRDEntitiesToMermaid(entities)`.

### Phase 3: ReACT Agent "Auto-Pilot"
*Goal: Eliminate manual data entry. The user acts as a reviewer while the agent patches the config.*

1. **The Loop:** Introduce a chat input on the split-pane UI. The user types a command (e.g., "Add an admin reporting dashboard").
2. **The JSON Patch:** The ReACT agent does *not* rewrite the document. It specifically targets and proposes precise patches to the `PRDConfig` arrays (adding to `flows`, adding to `features`).
3. **The Result:** The user sees the visual diagrams branch out and the UI lists populate automatically based on the chat command. The user clicks "Approve Change".

**Actionable Tasks:**
- [ ] Build a Floating Chat UI component attached to the Left Pane dashboard.
- [ ] Create an API route `POST /api/enhance-prd` taking the existing `PRDConfig` and the user's string prompt.
- [ ] Implement a LangChain/OpenAI prompt instructing the model to return a valid JSON patch (using the same Zod schema) rather than writing text.
- [ ] Implement an "Approve/Reject" button in the UI before applying the AI's patch to the frontend state.

---

## Why this works faster:
- We group technical debt cleanup and schema creation into Phase 1, treating it as a hard cutover.
- We skip building complex text-editor modules in favor of fast, native React form controls.
- By enforcing JSON upfront, the AI integration (Phase 3) and downstream Designer Agent integration become plug-and-play.

## Execution Rules & Git Workflow

- **No Migration Needed:** We are treating Phase 1 as a hard reset. No backward-compatible DB migrations for the old UBP structure will be written.
- **Phase Branching:** Each of the 3 phases must have its own dedicated Git branch (e.g., `feature/phase-1-data-engine`).
- **Atomic Commits:** Make a separate commit for every several minor changes. Avoid huge, overwhelming commits to ensure the history is easy to track and revert.
