# Flowro Builder Lifecycle

Flowro now uses an approval-gated plan-to-app lifecycle:

```text
Idea -> Project Plan -> Approve Plan -> Generate UI -> Approve UI -> Start Build
```

## Stages

- `planning`: Flowro is collecting context or has a draft project plan.
- `plan_approved`: The user approved the project plan as the design/build contract.
- `designing`: The Product Design Agent is generating UI with Stitch.
- `design_ready`: At least one generated design artifact is ready for review.
- `design_approved`: The user approved one generated UI artifact.
- `coding`: The local build worker has started a build run.
- `preview_ready`: A build run completed and exposed a preview result.
- `failed`: A stage failed and needs user action.

## Approval Gates

- Design generation is blocked until the project plan is approved.
- Build start is blocked until a UI design is approved.
- Regenerating a plan returns the project to `planning`.

## V1 Behavior

V1 ships the full visible lifecycle with a real Stitch design stage and a stub build worker. The build worker records selected template, planned files, logs, and a preview backed by the approved UI. Full autonomous file generation and repair loops are deferred.
