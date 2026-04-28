<p align="center">
  <img src="app/public/logo.png" alt="Flowro logo" width="120" />
</p>

<h1 align="center">Flowro</h1>

<p align="center">
  <strong>Open-source, self-hosted plan-to-app builder</strong>
  <br />
  Turn messy ideas into approved plans, generated UI, and local build runs.
</p>

<p align="center">
  <a href="https://flowro.app">Website</a> -
  <a href="https://github.com/KhalidD0nc/Flowro-PM">GitHub</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Firebase-12.7-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Self--Hosted-Yes-16a34a" alt="Self hosted" />
</p>

---

## What Changed

Flowro is no longer positioned as a hosted SaaS signup funnel.

- `https://flowro.app` is a public landing page only.
- No hosted auth, no hosted dashboard, no cloud-only workflow.
- The actual product is open-source and self-hosted.
- Users bring their own Firebase, OpenRouter, Stitch, and monitoring keys.
- The app pipeline is now:

```text
Idea -> Project Plan -> Approve Plan -> Product Design Agent -> Approve UI -> Local Build Worker
```

The goal is simple: give AI design and coding agents a real execution contract before they start generating files.

## Why Flowro Exists

AI coding tools are fast enough to create an app from a paragraph. That is useful until the paragraph becomes a database schema, three modals, a billing system, and a button nobody can explain.

Flowro adds structure before generation:

- It turns vague product ideas into staged project plans.
- It keeps humans in the approval loop.
- It generates UI from approved plans instead of loose prompts.
- It runs build work locally, where your files and keys already live.
- It keeps the cloud out of the critical path unless you choose otherwise.

## Product Flow

```mermaid
flowchart LR
    A[Messy idea] --> B[Flowro chat]
    B --> C[Project plan]
    C --> D[Human approval]
    D --> E[Product design agent]
    E --> F[UI approval]
    F --> G[Local build worker]
    G --> H[Generated app workspace]
```

## Key Capabilities

### Project Plan Engine

Flowro converts user intent into a structured project plan with scope, routes, screens, data models, build tasks, and acceptance checks. The plan is the execution contract for downstream agents.

### Unified Blueprint and Versioning

Flowro still supports the Unified Blueprint (UBP) model for structured product thinking:

1. Product vision
2. Scope
3. Actors
4. Behaviors
5. Constraints and risks
6. Technology decisions
7. Implementation phases
8. Integration points
9. Change log

Blueprints can be saved, versioned, shared, exported, and refined through chat.

### Product Design Agent

With `STITCH_API_KEY`, Flowro can generate UI artifacts from an approved project plan. The design stage remains explicit: generate screens, review them, then approve before build work starts.

### Local Build Worker

The build worker applies generated files into a local target workspace, runs install/build/check commands, streams logs, and records build status. This is designed for self-hosted usage, not opaque hosted generation.

### Agent-Ready Export

Flowro exports specs as Markdown, JSON, Cursor-ready context, and visual diagrams so external agents can use the same source of truth.

### Collaboration and Sharing

Flowro includes public share links, collaborators, project history, and workspace primitives for teams that self-host it.

## Public Landing Page

The root route `/` is now a static public landing page for `flowro.app`.

It intentionally does not:

- initialize Firebase auth,
- redirect signed-in users,
- link to hosted `/auth` or `/app`,
- present pricing,
- pretend Flowro is cloud-only.

The self-hosted product routes still exist in the app for local/private deployments:

- `/auth`
- `/app`
- `/settings`
- `/demo`
- `/share/[token]`

Auth is mounted at route level for product routes instead of globally.

## Tech Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Framework | Next.js 16.1 App Router | Full-stack React app |
| Language | TypeScript 5 | Strict typing and runtime validation |
| UI | React 19 + Tailwind CSS 4 | Responsive app and public landing page |
| Auth | Firebase Auth | For self-hosted product routes |
| Database | Firebase Firestore | Projects, plans, blueprints, workspaces |
| AI | OpenRouter + LangChain | Structured AI generation and intent handling |
| Design Agent | Google Stitch SDK | Optional, requires `STITCH_API_KEY` |
| Diagrams | Mermaid.js 11 | Blueprint and flow visualization |
| Validation | Zod 4 | Runtime schemas for plans and responses |
| Monitoring | Vercel Analytics / Sentry optional | Configured by env vars |

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase project with Firestore enabled
- OpenRouter API key
- Optional: Stitch API key for the Product Design Agent
- Optional: Sentry and GA keys for monitoring

### Install

```bash
git clone https://github.com/KhalidD0nc/Flowro-PM.git
cd Flowro-PM
npm install

cd app
npm install
cp env.example .env.local
```

### Configure Environment

Create `app/.env.local`:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# OpenRouter
OPENROUTER_API_KEY=sk-or-your-api-key-here
OPENROUTER_MODEL=deepseek/deepseek-v3.2

# Product Design Agent
STITCH_API_KEY=your-stitch-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional AI rollout controls
USE_LANGCHAIN=false
LANGCHAIN_ROLLOUT_PERCENT=0
INTENT_LLM_ENABLED=true

# Optional analytics / monitoring
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0
SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0

# Optional admin API guard
ADMIN_USER_ID=your-firebase-uid
```

### Run

From `app/`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The public landing page is at `/`. The self-hosted app entry is at `/app` after authentication.

Root scripts proxy to the app scripts, so these also work from the repository root:

```bash
npm run dev
npm run build
```

## Quality Checks

```bash
cd app
npm run lint
npm run build
```

Current expected state:

- `npm run lint` exits successfully, with existing warning backlog.
- `npm run build` exits successfully.
- `/` builds as a static route.

## API Surface

Most product APIs require Firebase auth.

### Projects

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/projects` | `GET` | List user projects |
| `/api/projects` | `POST` | Create a project |
| `/api/projects/[projectId]` | `GET` | Get project details |
| `/api/projects/[projectId]` | `PATCH` | Update project metadata or messages |
| `/api/projects/[projectId]` | `DELETE` | Delete a project |
| `/api/projects/[projectId]/messages` | `GET` | Fetch project messages |
| `/api/projects/[projectId]/messages` | `POST` | Add a project message |
| `/api/projects/[projectId]/prd` | `GET/PATCH` | Read or replace PRD data |
| `/api/projects/[projectId]/plan/approve` | `POST` | Approve a project plan |

### Design and Build

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/projects/[projectId]/design/generate` | `POST` | Generate one design artifact |
| `/api/projects/[projectId]/design/generate-all` | `POST` | Generate all design artifacts |
| `/api/projects/[projectId]/design/screens` | `GET` | List generated screens |
| `/api/projects/[projectId]/design/approve` | `POST` | Approve generated design artifacts |
| `/api/projects/[projectId]/build/start` | `POST` | Start a local build run |
| `/api/projects/[projectId]/build/status` | `GET` | Get build status |
| `/api/projects/[projectId]/build/logs` | `GET` | Stream or fetch build logs |
| `/api/projects/[projectId]/build/cancel` | `POST` | Cancel active build work |

### Blueprints and AI

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/blueprints?projectId=xxx` | `GET` | List blueprints for a project |
| `/api/blueprints` | `POST` | Create a blueprint version |
| `/api/blueprints` | `PATCH` | Update, lock, or save a blueprint |
| `/api/blueprints/[blueprintId]/history` | `GET` | Fetch version history |
| `/api/generate` | `POST` | Generate AI response and update project state |
| `/api/generate/stream` | `POST` | Stream AI response over SSE |
| `/api/enhance-prd` | `POST` | Enhance PRD content |

### Sharing, Workspaces, Admin

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/share` | `POST/DELETE` | Create or revoke share links |
| `/api/share/[token]` | `GET` | Public read-only shared content |
| `/api/projects/[projectId]/share` | `GET/POST/DELETE` | Manage project sharing |
| `/api/collaborations` | `GET` | List collaborative projects |
| `/api/collaborations/accept` | `POST` | Accept collaboration invite |
| `/api/workspaces` | `GET/POST` | List or create workspaces |
| `/api/account` | `DELETE` | Delete account and owned data |
| `/api/admin/logs` | `GET/PATCH` | Admin logs and cost config |

## Project Structure

```text
Flowro-PM/
├── Docs/                         # Product and architecture docs
├── app/                          # Next.js app
│   ├── public/                   # Static assets
│   ├── templates/nextjs-app/     # First supported build template
│   ├── next.config.ts            # Security headers and Next config
│   ├── env.example               # Environment template
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Public landing page
│       │   ├── app/              # Authenticated Command Center
│       │   ├── auth/             # Self-hosted auth routes
│       │   ├── api/              # API routes
│       │   ├── demo/             # Demo routes
│       │   ├── share/            # Public shared blueprints
│       │   ├── settings/         # User settings
│       │   ├── privacy/          # Privacy page
│       │   └── terms/            # Terms page
│       ├── components/           # App and UI components
│       ├── lib/
│       │   ├── build-worker/     # Local build worker logic
│       │   ├── firebase/         # Firestore collections and schema
│       │   ├── langchain/        # AI chains and intent detection
│       │   ├── prd/              # PRD schema and editor logic
│       │   ├── project-plan/     # Project plan schema
│       │   ├── stitch/           # Product Design Agent integration
│       │   └── rag/              # RAG helpers
│       └── __tests__/            # Internal phase tests
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── README.md
```

## Security Notes

- Root landing page does not initialize Firebase auth.
- Product routes mount auth providers at route level.
- API routes validate Firebase ID tokens where required.
- Firestore access is controlled by security rules and server-side ownership checks.
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy are configured.
- Rate limiting is applied to API routes.
- Secrets are environment-based and should never be committed.

> Note: some rate-limiting, logging, and cache behavior is currently in-memory and resets on process restart. Use persistent infrastructure before heavy production use.

## Roadmap

### Done

- Public OSS landing page for `flowro.app`
- Route-level auth boundary for self-hosted product routes
- Project planning and UBP generation
- Versioned blueprints
- Share links and collaboration APIs
- Product Design Agent integration
- Local build worker foundation
- Next.js app template support

### In Progress

- Stronger build repair loop
- More template coverage beyond `nextjs-app`
- Persistent queues and operational storage for worker jobs
- Better collaboration UX
- README/docs cleanup for self-hosted operators

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-change`.
3. Make the change.
4. Run `npm run lint` and `npm run build` from `app/`.
5. Open a pull request with a clear description.

## Philosophy

Flowro is for builders who want AI speed without turning their codebase into a haunted improv show.

Start with a plan. Approve the plan. Generate from the plan. Build locally.

<p align="center">
  <strong>Bring your keys. Run your stack. Keep the cloud out of it.</strong>
</p>
