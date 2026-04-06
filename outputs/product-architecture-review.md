# Flowro Execution Roadmap: PRD-First System with ReACT Enhancement Agent

## Goal

Flowro should evolve from a blueprint-centered prototype (UBP) into a PRD-first system. The target experience is an interactive process: a user starts with an idea, Flowro generates a structured PRD draft, and the user refines that PRD using a combination of manual editing and an AI Enhancement Agent powered by a ReACT (Reasoning and Acting) architecture with a robust human-in-the-loop workflow.

## Current State

The current repo is built around the "blueprint" (UBP) concept. A user enters an idea, and the system auto-generates a blueprint. The persistence naming, UI labels, routes, and docs all reinforce the assumption that the main product artifact is a UBP model. 

This architecture is coherent for a simple prototype, but it lacks the depth required for a true product management tool. A PRD-first system needs a richer explicit requirements model. The current blueprint-centered architecture should be treated as migration source state, to be completely replaced.

## Target Architecture

The target system workflow is:

`idea input -> initial PRD generation -> human-in-the-loop editing & ReACT agent enhancements -> locked PRD version -> export`

In this model, the PRD is the canonical product artifact. It contains product summary, users, goals, scope, key flows, requirements, edge cases, acceptance criteria, constraints, and implementation notes. The enhancement agent acts as an iterative partner to improve these sections based on user feedback.

## Execution Phases

### Phase 1: Transform from UBP to PRD

The core structural change: remove UBP and blueprint concepts entirely. The system needs a single PRD schema with deep coverage.

The PRD model should cover:
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

This phase establishes the target terminology across the system. Schema names, types, API responses, storage concepts, and UI labels must move to `prd` vocabulary. 

**Evaluatable Tasks:**
- [ ] Define the definitive TypeScript interface/schema for the new `PRD` object.
- [ ] Remove all existing `blueprint` schema definitions and interfaces.
- [ ] Update the database/storage schema to support the new `PRD` structure.
- [ ] Run type-checks to verify all legacy `Blueprint` types have been replaced with `PRD`.

### Phase 2: Refactor Generation Flow

The generation pipeline should produce a structured PRD draft instead of a blueprint. The output becomes explicit sections suitable for revision, versioning, and direct human intervention.

**Evaluatable Tasks:**
- [ ] Update the initial LLM generation prompt to output data matching the new `PRD` schema.
- [ ] Refactor the generation API endpoint to return the structured PRD.
- [ ] Implement validation (e.g., Zod) on the LLM output to ensure it matches the PRD schema before persisting.
- [ ] Write an automated test confirming a sample idea input results in a correctly formatted PRD object.

### Phase 3: Build the Human-in-the-Loop PRD Editor

A clear lifecycle is needed around the artifact. The workflow is:
1. Create initial PRD draft from the idea input.
2. **Human-in-the-loop Editing:** Allow the user to edit PRD sections directly or leave comments/instructions for specific areas.
3. Review and accept/reject changes to guarantee human control over the product definition.
4. Save important milestones as PRD versions.

**Evaluatable Tasks:**
- [ ] Build UI components for viewing and manually editing each PRD section independently.
- [ ] Implement an "Approve/Reject" interface for proposed PRD changes.
- [ ] Create a versioning mechanism in the database to save locked milestones of a PRD.
- [ ] Conduct a manual QA test: Create a PRD, edit a section, and save a new version.

### Phase 4: Implement ReACT Enhancement Agent

Instead of a basic one-shot prompt update, the system will introduce a **ReACT-based Enhancement Agent** to assist the PM.
- **Reasoning:** The agent analyzes the user's feedback, the current state of the PRD, and identifies gaps (e.g., missing edge cases, conflicting requirements).
- **Acting:** The agent proposes targeted updates to specific PRD sections, rather than blind full-document rewrites.
- **Human Review:** The proposed changes are presented to the user as diffs or suggestions for approval.

**Evaluatable Tasks:**
- [ ] Develop the ReACT agent prompt loop (Reason/Act) tailored to PRD review.
- [ ] Integrate the agent to receive user comments and the current PRD state as context.
- [ ] Build the downstream action logic where the agent outputs targeted edits for specific PRD sections instead of the whole document.
- [ ] Test the agent by providing a vague user comment and verifying it proposes a logical, contained section update.

### Phase 5: Clean up Data and Naming Debt

Address the technical debt related to `blueprint` and `UBP`.
1. Introduce an artifact abstraction.
2. Rename surface areas (UI labels, route contracts, exported terminology).
3. Migrate persistence semantics and stored artifact structure.

**Evaluatable Tasks:**
- [ ] Perform a global find-and-replace for legacy `UBP` and `Blueprint` strings in the UI layer.
- [ ] Rename existing routes (e.g., `/api/blueprints`) to reflect the new `prd` naming conventions.
- [ ] Write and execute a database migration script to rename old tables/collections.
- [ ] Verify the application builds without warnings and all frontend flows pass under the new naming.

## Execution Rules and Git Workflow

To maintain a clean history and isolate feature development during this massive architectural shift, the following Git rules must be strictly observed:

1. **Phase-Based Branching:** Every execution phase must have its own dedicated feature branch (e.g., `feature/phase-1-prd-schema`, `feature/phase-2-generation`). Do not start a new phase on an existing branch.
2. **Atomic Commits:** Each minor logical change (e.g., creating the schema, renaming a single API route, adding a component) must have its own discrete commit. Large, sweeping commits are prohibited to ensure changes are reversible.
3. **Task Completion Checklist:** A phase branch can only be merged when all "Evaluatable Tasks" for that phase have been completed and verified.

## Risks and Acceptance Criteria

**Risks:**
- The primary risk is the ReACT agent becoming overly autonomous and changing sections without clear user consent. The human-in-the-loop approval mechanism must be rock solid to maintain trust.

**Acceptance Criteria:**
- Uses a rich PRD schema as the only canonical product artifact.
- All "UBP" and "Blueprint" terminology is fully replaced.
- Users can manually edit the PRD and version it.
- A ReACT Enhancement agent can intelligently reason about gaps and propose targeted revisions that the user can review and approve.
