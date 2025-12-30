# **Unified Blueprint (UBP) — v0.2**

**Product:** Flowro AI (Unified Blueprint Engine)

**Status:** DRAFT

**Last Updated:** 2025-12-19

---

## **1\. Product Vision**

**Problem** The rise of "vibe coding" (high-speed AI generation) allows builders to generate functional code without architectural structure. This results in "chaos code"—fragile systems that are impossible to maintain or scale because they lack a defined "Contract" before coding begins.

**Target Actor** **The Vibe Coder** (A builder who prioritizes execution speed and dislikes the friction of traditional documentation).

**Success Signal** The user receives a locked, Code-Agent-ready **Unified Blueprint (UBP)** within **3 messages** of their initial idea dump, without needing to manually write requirements.

---

## **2\. Scope**

**In Scope**

* **Zero-Friction Discovery:** Agent "studies" natural language input to extract Intent and Actors.  
* **Auto-Drafting Engine:** System automatically generates a full 9-section UBP draft from vague inputs.  
* **Proactive Suggestions:** System infers Tech Stack and Behaviors based on the problem domain.  
* **Code-Ready Export:** Outputs a `.md` or `.json` file strictly formatted for Cursor, Claude Code, and Windsurf.  
* **Change History:** Automatic versioning of the UBP when the user requests changes.

**Out of Scope**

* **Code Generation:** Flowro AI builds the *plan*, not the *code*.  
* **Project Management:** No Kanban boards, tickets, or sprint planning.  
* **Collaboration:** Single-player mode only for MVP.

**Deferred**

* **Reverse Engineering:** Uploading existing code to generate a UBP (Phase 3).  
* **Team Workflows:** Multi-editor conflict resolution (Phase 4).

---

## **3\. Actors**

**Primary Actor**

* **Builder** (The Human Vibe Coder).

**Secondary Actors**

* **Flowro PM Agent** (The AI logic that architects the blueprint).

**External Systems**

* **Code Agents** (Cursor / Claude / Windsurf \- consumers of the UBP).  
* **Mermaid Renderer** (Visualizes the decision flows).

---

## **4\. Behaviors**

### **Core Interaction Flow**

`flowchart TD` `Start[Builder Dumps "Chaos" Idea] --> Study[Agent Studies Needs & Infers Gaps]` `Study --> Draft[Agent Generates Full UBP Draft]` `Draft --> Review[Builder Reviews & Refines]` `Review --> Lock[Agent Locks Version & Exports]`

### **Behavior B-STUDY-AND-DRAFT**

**Trigger** Builder submits a project idea (e.g., "I want a tool like Uber for dog walkers").

**System Response** The Flowro PM Agent analyzes the input, identifies the core *Problem* and *Target Actor*, and uses domain knowledge to **infer** the likely *Scope*, *Behaviors*, and *Tech Stack*. It presents a complete v0.1 UBP draft for approval.

**Involved Actors**

* Builder  
* Flowro PM Agent

`sequenceDiagram` `Builder->>FlowroAgent: "Here is my messy idea..."` `FlowroAgent->>FlowroAgent: Extract Intent + Infer Requirements` `FlowroAgent-->>Builder: "I've designed your Blueprint. Review v0.1?"`

### **Behavior B-REFINE-AND-LOCK**

**Trigger** Builder requests a change (e.g., "Change the database to PostgreSQL").

**System Response** The Agent updates the specific section, appends a justification to the **Change Log**, increments the version number, and regenerates the diagram.

**Involved Actors**

* Builder  
* Flowro PM Agent

`sequenceDiagram` `Builder->>FlowroAgent: "Change DB to Postgres"` `FlowroAgent->>UBP_System: Update Section 6 & Change Log` `UBP_System-->>Builder: "Updated to v0.2. Ready to lock?"`

**Behavior B-EXPORT** **Trigger** Builder clicks "Export Blueprint" and selects a format (PDF or Markdown).

**System Response**

* **If PDF:** The System triggers a headless browser (Puppeteer) to render all Mermaid code into high-res images, then compiles a human-readable PDF contract.  
* **If Markdown:** The System compiles the raw text and preserves the strict Mermaid code blocks so Code Agents (Cursor/Claude) can read/edit the logic.

**Involved Actors**

* Builder  
* UBP System  
* PDF Renderer (Puppeteer)

`%%{init: { 'theme': 'forest' } }%%`

`sequenceDiagram`

  `participant U as Builder`

  `participant Sys as UBP_System`

  `participant Render as PDF_Renderer`

  `U->>Sys: Request Export (Format)`

  `alt Format is PDF`

    `Sys->>Render: Send Mermaid Code`

    `Render-->>Sys: Return PNG Images`

    `Sys-->>U: Download PDF (Human Contract)`

  `else Format is Markdown`

    `Sys-->>U: Download .md (Agent Instructions)`

  `end`

## 

## 

## **5\. Constraints & Risks**

**Constraints**

* **Proactive Invention:** The Agent *must* propose requirements (User Stories/Behaviors) to fill gaps; it cannot block the user for missing info.  
* **Strict Structure:** The final output *must* follow the 9-section UBP schema exactly to ensure Code Agents can read it.  
* **Latency:** The "Drafting" phase must complete in under 15 seconds to maintain "vibe" momentum.

**Assumptions**

* Builders prefer correcting a "good guess" draft over writing requirements from scratch.  
* Current Code Agents (Cursor/Claude) perform better with a single large context file (UBP) than fragmented prompts.

**Risks**

* **Hallucination:** The Agent might infer a requirement the user didn't want (Mitigation: Every draft requires explicit "Lock" confirmation).  
* **Complexity:** The UBP might become too long for some LLM context windows (Mitigation: Strict token limits per section).

---

## **6\. Technology Decisions**

**Frontend Stack: Next.js 14 (App Router) + Tailwind**

* *Justification:* Full-stack React framework. API routes eliminate need for separate backend. Server components for performance.

**Authentication: Firebase Auth (Google Sign-In)**

* *Justification:* Zero-friction setup. Google OAuth pre-configured. No password management needed for MVP.

**Data Store: Firebase Firestore**

* *Justification:* NoSQL document storage perfect for JSON-based UBPs. Generous free tier. Same SDK for auth and database.

**LLM Provider: OpenRouter (gpt-oss-120b:free)**

* *Justification:* Free tier for MVP. OpenAI-compatible API. Switch models without code changes.

**Agent Orchestration: Direct API Calls (MVP)**

* *Justification:* LangGraph deferred to post-MVP. Simple request/response sufficient for single-turn generation.

**PDF Engine: Puppeteer / Browserless.io**

* *Justification:* Required for Mermaid diagram rendering in PDF exports.

---

## **7\. Implementation Phases**

**Phase 1: The Inference Engine**

* *Goal:* Build the "Shadow Drafter" that turns raw text into the 9-section JSON structure.  
* *Output:* A working chat interface that outputs a valid UBP.

**Phase 2: The Diagram Layer**

* *Goal:* Auto-generate Sequence and Entity diagrams from the drafted text.  
* *Output:* Real-time Mermaid rendering in the chat.

**Phase 3: The Handoff Bridge**

* *Goal:* Optimize the "Export" format for specific Code Agents.  
* *Output:* "Open in Cursor" button.

---

## **8\. Integration Points**

**Diagram Renderer (Mermaid)**

* *Purpose:* Visualizing the "Behaviors" section for the user.  
* *Data Flow:* Outbound (Text \-\> Diagram).

**LLM Provider (OpenRouter/Anthropic)**

* *Purpose:* The brain of the PM Architect.  
* *Data Flow:* Bi-Directional.

**PDF Generation Service**

* *Purpose:* Converts the web view into a static PDF contract for stakeholders.  
* *Data Flow:* Outbound (HTML/JS \-\> PDF File).

---

## **9\. Change Log**

**Version:** 0.2 **Change Summary:** Pivoted from "Validator" logic to "Architect" logic. **Reason:** The previous "Gatekeeper" model created too much friction. The new model focuses on speed and inference to support "vibe coding." **Impacted Sections:** Intent, Behaviors, Constraints, Risks.

