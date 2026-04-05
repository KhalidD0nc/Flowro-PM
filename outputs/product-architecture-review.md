# Flowro Execution Roadmap: PRD-First Showcase System

## Goal

Flowro should evolve from a blueprint-centered prototype into a PRD-first showcase system. The target experience is simple: a user starts with an idea, Flowro generates a structured PRD draft, the user refines that PRD with editing and AI assistance, and the system then derives a design-ready brief for a design agent that writes precise Stitch prompts. The value of this direction is not commercial packaging. The value is a stronger portfolio project that demonstrates product architecture, AI workflow design, artifact lifecycle management, and cross-functional handoff.

## Current State

The current repo is built around the blueprint concept from top to bottom. The user enters a project idea, a project record is created immediately, and the system auto-generates the first artifact through the existing chat flow. That artifact is stored as a blueprint, versioned as blueprint history, edited in blueprint-oriented UI, and exported primarily for code-agent handoff. The generation pipeline, persistence naming, UI labels, routes, and docs all reinforce the same assumption: the main product artifact is a blueprint derived from a UBP model.

That architecture is coherent for the current prototype, but it is the wrong foundation for the target showcase. A PRD-first system needs a richer and more explicit requirements model than the current blueprint shape. It also needs a cleaner downstream handoff to design, where the design agent works from product truth instead of inferring directly from chat or a compressed artifact. As a result, the current blueprint-centered architecture should be treated as migration source state, not as the target direction.

## Target Architecture

The target system is:

`idea input -> PRD generation -> PRD editor and versioning -> design brief derivation -> Stitch prompt generation -> export and handoff`

In this model, the PRD is the only canonical product artifact. It should contain product summary, users, goals, scope, key flows, requirements, states, edge cases, acceptance criteria, constraints, and implementation notes. Everything else is derived from that artifact. The design agent is downstream of the PRD and should convert it into exact Stitch-ready prompts that specify screens, flow intent, UI priorities, interaction states, and constraints. Exports should also reflect that the system now supports both build handoff and design handoff rather than only coding-agent export.

## Execution Phases

### Phase 1: Replace the core artifact model

The first change is conceptual and structural: remove blueprint and UBP from the target product definition. The canonical artifact becomes the PRD, and the roadmap should assume no long-term coexistence model where UBP remains a first-class concept. That means the system needs a single PRD schema with enough coverage to support both implementation planning and design handoff.

At minimum, the PRD model should cover:

- product summary
- target users
- goals and success criteria
- scope boundaries
- primary user flows
- functional requirements
- edge cases and failure states
- acceptance criteria
- constraints and assumptions
- implementation notes

This phase should also establish the naming target across the system. Schema names, types, API responses, storage concepts, and UI labels should move toward `prd` terminology. Existing `blueprint` and `UBP` language should be treated as migration debt, not preserved product vocabulary.

### Phase 2: Refactor generation flow around PRD creation

The generation pipeline should be rebuilt around PRD drafting instead of blueprint generation. Today the product creates a project and auto-generates the first blueprint draft. In the target state, that same flow should create the first PRD draft. The generation prompts, intent classification, and AI update logic should all be revised so the model produces and revises PRD sections rather than filling a blueprint structure.

The first draft can still be inference-heavy to preserve speed. The change is not that the system becomes questionnaire-driven. The change is that the output becomes a structured PRD with explicit sections suitable for revision, versioning, and downstream design use. This phase should also define how discussion turns update PRD sections over time rather than producing proposal text that is implicitly mapped back into a blueprint.

### Phase 3: Build PRD editing and lifecycle

Once PRD generation exists, the next requirement is a clear lifecycle around that artifact. The expected workflow is:

1. Create initial PRD draft from the idea input.
2. Edit PRD sections directly.
3. Revise specific sections with AI assistance.
4. Save important milestones as PRD versions.
5. Export or share the current PRD version.

Version history should remain part of the system, but it should be redefined as PRD versioning instead of blueprint snapshots. Locked and approved milestones should apply to PRD revisions. The editor experience should also be framed around section clarity and revision control, not around preserving the old blueprint document model. This phase is what turns the system from a one-shot generator into a credible product workflow.

### Phase 4: Add design-agent handoff for Stitch

The design agent should be added only as a downstream consumer of the PRD. Its responsibility must be narrow and explicit: read the PRD, derive a design brief, and generate exact Stitch-ready prompts. The design agent is not the source of truth for the product, and it should not invent product behavior outside the PRD unless it marks assumptions clearly.

The design brief derived from the PRD should include:

- primary user flows
- screen inventory
- screen priorities
- empty, loading, success, and error states
- constraints and implementation expectations
- product tone and interface expectations
- interaction details that matter for layout and behavior

The output of this stage should be prompt packages that are detailed enough for Stitch to generate useful UI directions without guessing at core product behavior. That is the correct design handoff for this showcase: PRD first, design prompts second.

### Phase 5: Clean up data and naming debt

The biggest implementation debt in the current codebase is naming and artifact coupling. Routes, schema names, components, export logic, docs, and storage concepts still use `blueprint` and `UBP` pervasively. That debt should be addressed in stages so the migration remains understandable and reversible.

The recommended order is:

1. introduce an artifact abstraction that separates product logic from the old blueprint wording
2. rename surface areas such as UI labels, route contracts, and exported terminology toward PRD
3. migrate persistence semantics and stored artifact structure once the application flow is stable

This sequence avoids a brittle big-bang rename. It also keeps the system usable while the conceptual model changes under the hood.

### Phase 6: Polish for showcase quality

The final phase is not about adding more features. It is about making the system read clearly as a polished portfolio project. The terminology must be coherent, the end-to-end flow must be easy to explain, the artifact lifecycle must be visible, and the design handoff must look intentional rather than experimental.

The quality bar for the finished system is:

- the product clearly presents itself as a PRD-first workflow
- the artifact model is consistent across UI, routes, exports, and docs
- versioning is visible and understandable
- the design-agent handoff is concrete and believable
- the overall system tells a clean story: PRD to design to build

That is what makes the project stronger on a resume. It shows deliberate system design, not just AI generation stitched onto a prototype.

## Interfaces and Terminology Changes

The target terminology changes should be explicit:

- `blueprint` -> `prd`
- `UBPViewer`-style concept -> PRD viewer and editor
- blueprint history/versioning -> PRD versioning
- export focused only on coding-agent handoff -> export for PRD and design handoff
- design artifact generation derived from PRD -> not from UBP and not from chat alone

These changes should be treated as product-definition changes, not cosmetic copy edits. The system should speak consistently in its new architecture.

## Risks and Implementation Order

The main risk is partial migration. If generation, storage, UI, and exports do not move together conceptually, the product will read as two unfinished systems layered on top of each other. The roadmap should therefore be executed in order: establish the PRD artifact model first, move generation second, build editing and versioning third, add design handoff fourth, and then clean up naming and presentation debt. That order keeps the core artifact stable before expanding the workflow.

Another risk is letting the design agent become a substitute for product definition. That should be avoided. The PRD remains the source of truth at every stage. Design output is derived output.

## Acceptance Criteria

This roadmap is successfully implemented when the next version of Flowro:

- uses PRD as the only canonical product artifact
- removes blueprint and UBP from the target product framing
- generates and revises PRD drafts through the main AI flow
- supports PRD editing, versioning, export, and sharing
- gives the design agent a precise Stitch prompt-writing role
- presents a clean PRD-to-design-to-build story suitable for a portfolio showcase
