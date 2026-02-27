# Review Checklist

Use this checklist when validating code quality and release readiness.

## 1. Bug Detection

- Verify null/empty/undefined handling on all external inputs.
- Check boundary values (0, 1, max length, max range, empty collection).
- Trace async flows for race conditions, stale state, and missing `await`.
- Validate error handling paths return safe and user-meaningful outcomes.
- Confirm retries, timeouts, and backoff behavior for network or queue operations.

## 2. Business Logic Validation

- Map rules from requirements to explicit conditions in code.
- Confirm plan limits, permissions, and feature flags enforce intended behavior.
- Check monetary, date/timezone, and rounding logic for consistency.
- Validate idempotency for create/update operations and webhook processing.
- Confirm side effects happen exactly once or are intentionally repeatable.

## 3. Requirement Traceability

- Build a mini trace matrix:
- Requirement ID or statement.
- Code location(s) implementing it.
- Test evidence covering it.
- Coverage status: complete, partial, missing.
- Flag assumptions where requirements are ambiguous.

## 4. Regression and Integration Risk

- Confirm API contract compatibility (request/response fields, enums, status codes).
- Check migrations for rollback safety, backfills, and lock/latency risk.
- Validate serialization and schema changes across service boundaries.
- Confirm event names/payloads for analytics and downstream consumers.

## 5. Test Gaps

- Identify highest-risk path without tests.
- Propose one test per critical failure mode.
- Prefer deterministic tests over snapshot-heavy broad tests.
- Recommend integration/e2e tests when cross-service behavior is critical.

## 6. Output Format

For each finding, report:

- Severity (`P0` to `P3`).
- Location (`path:line`).
- Problem statement.
- User/business impact.
- Confidence level (high, medium, low).
- Suggested fix direction.
