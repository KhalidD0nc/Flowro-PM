## **The UBP Core Philosophy**

* **Single Source of Truth:** One document to replace all traditional documentation.  
* **Consultant Logic:** The agent (Flowro AI) studies user needs and **proposes** content rather than rejecting vague input.  
* **Agent-Ready:** The output is strictly formatted for direct execution by Code Agents like Cursor or Claude.  
* **No Narrative:** Storytelling, background paragraphs, and "vague" language are prohibited in the final artifact.  
  ---

  ## **The 9-Section UBP Structure**

  ### **1\. Product Vision**

Defines the fundamental reason for the project's existence.

* **Problem:** The specific pain or inefficiency extracted from the user's vision.  
* **Target Actor:** The single primary user type experiencing the pain.  
* **Success Signal:** A measurable, observable metric that proves the problem is solved.  
* **Rule:** No mention of features or technologies here; only the "Why".

  ### **2\. Scope**

Defines the logical boundaries of the solution.

* **In Scope:** What is being built now.  
* **Out of Scope:** What is explicitly excluded.  
* **Deferred:** Features saved for future iterations to maintain speed.  
* **Rule:** Bullet points only; no justifications or "because" statements.

  ### **3\. Actors**

Maps every human and system entity involved.

* **Primary Actor:** The main user.  
* **Secondary Actors:** Support roles or AI agents.  
* **External Systems:** Third-party APIs or platforms (e.g., Salla, Tamara).  
* **Rule:** Actors must be nouns; no logic or behavior is described in this section.

  ### **4\. Behaviors**

The functional spec describing how the system responds to triggers.

* **ID:** Unique identifier for each behavior.  
* **Trigger:** The event that starts the action.  
* **System Response:** The specific logic performed by the system.  
* **Involved Actors:** Entities defined in Section 3 that participate in this action.  
* **Rule:** One behavior equals one responsibility; no UI language (e.g., "click") allowed.

  ### **5\. Constraints & Risks**

Forces realism into the architectural plan.

* **Constraints:** Non-negotiable hard limits (budget, performance, legal).  
* **Assumptions:** Hypotheses that must be testable.  
* **Risks:** Explicit potential failures and their impacts.

  ### **6\. Technology Decisions**

The "Contract" of the stack; exploration is finished here.

* **Required Fields:** Frontend, Backend, Agent Stack, Data Store, AI/LLM Layer, and Diagram Tools .  
* **Rule:** Provide a brief justification for each choice; no lists of alternatives.

  ### **7\. Implementation Phases**

The outcome-based delivery sequence.

* **Components:** Phase name, goal, and key outputs .  
* **Rule:** No task breakdowns or Jira-style granularity.

  ### **8\. Integration Points**

Defines how the system connects to the world.

* **Required:** External service name, purpose, and direction of data flow .  
* **Rule:** Only real/planned external integrations; no internal components.

  ### **9\. Change Log**

The evolution history of the UBP.

* **Required:** Version, summary, reason for change, and impacted sections .  
* **Rule:** Append-only; every edit must be justified and versioned.


