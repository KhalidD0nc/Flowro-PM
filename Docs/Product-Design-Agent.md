# Product Design Agent

The Product Design Agent turns an approved `ProjectPlan` into generated UI using Google Stitch.

## Requirement

Set `STITCH_API_KEY` in `app/.env.local`.

If the key is missing, `/api/projects/:id/design/generate` returns a setup error and the UI remains blocked at the design stage.

## Inputs

- Approved `ProjectPlan`.
- Project name.
- Existing Stitch project id from prior design artifacts, when available.

## Outputs

Flowro stores `DesignArtifact` records under the project:

- provider: `stitch`
- Stitch project id
- screen id
- screen name
- image URL
- HTML URL
- HTML snapshot
- status: `generated` or `approved`
- approval timestamp/user

## API Routes

- `POST /api/projects/:id/design/generate`
- `GET /api/projects/:id/design/screens`
- `GET /api/projects/:id/design/screens/:screenId/html`
- `GET /api/projects/:id/design/screens/:screenId/image`
- `POST /api/projects/:id/design/approve`

## Approval Behavior

Approving a design marks that artifact as `approved`, resets other artifacts to `generated`, and moves the project to `design_approved`.
