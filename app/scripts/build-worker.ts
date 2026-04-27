/**
 * Local build worker placeholder.
 *
 * V1 exposes the Plan -> Design -> Build lifecycle through API routes while
 * keeping long-running filesystem work out of the Next request path. The next
 * milestone will attach this process to a durable queue and template workspace.
 */
console.log("[flowro-build-worker] ready")
console.log("[flowro-build-worker] stub mode: build runs are persisted by the API until queue wiring lands")
