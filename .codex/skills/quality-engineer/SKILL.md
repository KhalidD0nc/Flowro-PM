---
name: quality-engineer
description: Perform quality-engineering review to catch bugs, logic flaws, requirement mismatches, and release risks before production. Use when asked to review code, debug regressions, validate business logic, verify acceptance criteria, audit test coverage, or assess production readiness.
---

# Quality Engineer

## Overview

Use this skill to perform rigorous, production-focused software review. Prioritize real defects, requirement mismatches, and regressions over style nits.

## Review Workflow

1. Collect context first.
- Identify changed files, feature intent, expected behavior, and acceptance criteria.
- Ask for missing requirements only when they block a reliable conclusion.

2. Inspect code paths for concrete defects.
- Trace state transitions, branching, null/empty handling, boundary conditions, and error handling.
- Follow data flow across modules and integration points rather than reviewing files in isolation.

3. Validate business logic correctness.
- Compare implemented behavior against explicit requirements and implied product rules.
- Flag mismatches with clear examples (input/state -> observed behavior -> expected behavior).

4. Verify requirements coverage.
- Map each stated requirement to code or test evidence.
- Mark gaps where behavior is unimplemented, partially implemented, or untested.

5. Assess release risk.
- Evaluate security, performance, reliability, migration, concurrency, and backward-compatibility risk.
- Call out production impact and likelihood, not just code smell.

6. Check tests and validation depth.
- Identify missing unit/integration/e2e tests for risky logic.
- Prefer targeted test recommendations tied to specific failure modes.

7. Report findings in execution order.
- Present findings first, sorted by severity (`P0` to `P3`), each with file/line evidence.
- For each finding include: issue, impact, confidence, and concrete fix direction.
- If no findings exist, explicitly state that and list residual risks/testing gaps.

## Severity Rubric

- `P0`: Release blocker, data loss, critical security issue, or system outage risk.
- `P1`: Major functional failure or high-likelihood regression with broad impact.
- `P2`: Moderate bug or requirement mismatch with bounded impact.
- `P3`: Low-impact issue, edge-case flaw, or maintainability risk likely to become a bug.

## Reference Material

- Load `references/review-checklist.md` for a deeper checklist covering defects, business logic, and requirement traceability.
