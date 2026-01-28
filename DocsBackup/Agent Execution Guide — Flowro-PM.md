# **Agent Execution Guide — Flowro-PM**

## **1\. Scope & Ground Rules**

* Treat the repository as **non-functional**.

* Existing HTML files are **UI mockups only**.

* No backend, APIs, persistence, or orchestration exist unless explicitly present in code.

* Do **not** assume missing components.

* All conclusions must be derived from:

  * `@Docs`

  * Repository inspection

---

## **2\. Primary Objective**

Produce a **concrete execution plan** to convert the project from its current state into a **fully working system**.

UI completion alone is **not sufficient**.

---

## **3\. Security-First Rule (Mandatory)**

* Security is a **first-order requirement**, not a later phase.

* Every proposed component must explicitly address:

  * Authentication & authorization

  * Data access control

  * Input validation

  * Secrets management

  * Deployment exposure risks

* Any phase or component without security considerations is **invalid**.

---

## **4\. Required Output (in `@Docs`)**

The agent must produce a **structured report** containing **only** the sections below.

### **4.1 Current State Assessment**

* What exists

* What does not exist

* What is non-functional

### **4.2 Missing System Components**

List only what is required to make the system operational:

* Backend services

* APIs

* Data store

* Agent/orchestration layer

* Security mechanisms

* Infrastructure

No speculative features.

---

### **4.3 Execution Phases**

For each phase:

* Goal

* Required components

* Dependencies

* Security considerations

Phases must start from **zero integration**.

---

### **4.4 Assumptions**

* Explicit assumptions only

* No implied or hidden assumptions

---

### **4.5 Risks & Blockers**

* Technical risks

* Security risks

* Architectural risks

---

## **5\. Prohibited Behavior**

* No filler text

* No motivational language

* No marketing tone

* No feature speculation

* No assuming functionality without proof

---

## **6\. Completion Criteria**

The plan is complete only if:

* A backend exists

* APIs are defined

* Data persistence is addressed

* Security is integrated end-to-end

* UI is connected to real system behavior

