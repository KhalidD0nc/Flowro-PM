# Flowro Builder Lifecycle

Flowro now uses an approval-gated plan-to-app lifecycle:

```text
Idea -> Project Plan -> Approve Plan -> Start Build -> Preview
```

## Stages

- `planning`: Flowro is collecting context or has a draft project plan.
- `plan_approved`: The user approved the project plan as the build contract input.
- `coding`: The local build worker has started a build run.
- `preview_ready`: A build run completed and exposed a preview result.
- `failed`: A stage failed and needs user action.

## Approval Gates

- Build start is blocked until the project plan is approved.
- Regenerating a plan returns the project to `planning`.

## V1 Behavior

V1 ships the approval-gated planning flow and a local build worker. The build worker records selected template, planned files, logs, and a local preview result. Full autonomous file generation and repair loops continue to evolve inside the build worker.
