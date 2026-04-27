# Coding Agent

The Coding Agent starts after both approval gates pass:

1. Project plan approved.
2. UI design approved.

## V1 Worker

V1 uses a local worker placeholder:

```bash
cd app
npm run worker:build
```

The API currently persists a stub `BuildRun` that proves the lifecycle:

- validates approved plan and design
- selects the approved template
- records planned file changes
- records build logs
- returns a preview URL backed by the approved design

## API Routes

- `POST /api/projects/:id/build/start`
- `GET /api/projects/:id/build/status`
- `GET /api/projects/:id/build/logs`

## Next Milestone

Attach the worker to a durable queue, create a template workspace, apply file patches, run install/build/dev commands, stream logs, and add an error repair loop.
