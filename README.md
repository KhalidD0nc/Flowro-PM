<table>
  <tr>
    <td width="58%" valign="middle">
      <p align="center">
        <img src="app/public/logo.png" alt="Flowro logo" width="120" />
      </p>
      <h1 align="center">Flowro</h1>
      <p align="center">
        <strong>Build apps and slides from one prompt.</strong>
        <br />
        Flowro turns rough ideas into project plans, generated app workspaces, polished slide decks, previews, edits, and publish-ready output.
      </p>
    </td>
    <td width="42%" valign="top">
      <img src="Docs/images/home-view.png" alt="Flowro home prompt interface" width="100%" />
    </td>
  </tr>
</table>

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

## Why Flowro

AI can generate code fast. The hard part is making the work usable: clear scope, real data models, guarded build steps, readable previews, and a human who can steer the result before it becomes a mess.

Flowro gives creative builders one workspace for the full path:

- Start with a natural prompt.
- Turn the idea into an approved project plan.
- Generate apps or slide decks from that plan.
- Preview the result inside the workspace.
- Ask for edits in plain language.
- Keep the work self-hosted and connected to your own keys.

```text
Prompt -> Plan -> Generate -> Preview -> Edit -> Publish or Export
```

## What You Can Build

### Apps

Flowro turns product ideas into generated app workspaces with routes, UI, data models, build tasks, and local preview support. It is designed for builders who want AI speed without skipping the planning and verification layer.

### Slides

Flowro also creates structured slide decks from a prompt, source material, or a strategic brief. It can generate the story, outline, designed slides, previews, edits, and exportable deck files.

<p align="center">
  <img src="Docs/images/slides-preview.png" alt="Flowro slides generation preview" width="100%" />
</p>

## Product Highlights

| Capability | What it means |
| --- | --- |
| One prompt entry | Choose Apps or Slides from the same creative starting point. |
| Project plan engine | Converts vague ideas into scope, phases, screens, routes, data models, risks, and acceptance checks. |
| Human approval loop | Flowro asks for approval before moving from plan to build. |
| Local build worker | Generated app files are applied, installed, checked, and previewed from your local/self-hosted environment. |
| Slides workspace | Generates brief, outline, visual deck, preview, edits, and exportable presentation files. |
| Source-aware generation | Slides can use uploaded/source context and web evidence where configured. |
| Share and collaboration | Projects, blueprints, share links, and collaborators are part of the workspace model. |
| Bring your own stack | Firebase, OpenRouter, OpenAI, Supabase, monitoring, and deployment keys stay under your control. |

## How It Works

```mermaid
flowchart LR
    A[Idea] --> B[Flowro prompt]
    B --> C{Mode}
    C --> D[App plan]
    C --> E[Slide story]
    D --> F[Local build worker]
    F --> G[Generated app preview]
    E --> H[Designed deck preview]
    G --> I[Edit or publish]
    H --> J[Edit or export]
```

Flowro is intentionally not a black-box hosted generator. The public site introduces the product, while the real workspace is designed for self-hosted and local/private deployments.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, lucide-react |
| Auth and data | Firebase Auth, Firestore, Firebase Admin |
| AI orchestration | OpenRouter, LangChain, OpenAI for Slides web search |
| Generated app backend | Supabase provisioning and schema generation |
| Slides export | pptxgenjs, jszip |
| Validation | Zod, targeted TypeScript test scripts |
| Monitoring | Optional Vercel Analytics, Sentry, GA |

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase project with Firestore enabled
- OpenRouter API key
- OpenAI API key for Slides web search
- Supabase personal access token for generated Supabase apps
- Optional Sentry or GA keys for monitoring

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

Create `app/.env.local` from `app/env.example`.

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
OPENROUTER_MODEL=openai/gpt-oss-120b:free
OPENROUTER_MODEL_BUILD=moonshotai/kimi-k2
OPENROUTER_MODEL_PROMPT_ENHANCER=google/gemini-3-flash-preview
OPENROUTER_MODEL_CLARIFICATION=google/gemini-3-flash-preview
OPENROUTER_MODEL_PRD=openai/gpt-5.4-mini

# OpenAI for Slides web search
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_SEARCH_TIMEOUT_MS=30000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
FLOWRO_GENERATED_APPS_PATH=/Users/YOUR_USERNAME/Desktop/Flowro-Apps

# Supabase Management API
SUPABASE_ACCESS_TOKEN=sbp_your-personal-access-token
SUPABASE_ORG_ID=
SUPABASE_ORG_SLUG=
SUPABASE_PROJECT_REGION=us-east-1
```

### Run

From the repository root:

```bash
npm run dev
```

Or from `app/`:

```bash
cd app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- `/` is the public landing page.
- `/app` is the authenticated Flowro workspace.
- `/share/[token]` is the public shared project view.

## Useful Commands

```bash
# Start development server
npm run dev

# Build production app
npm run build

# Run lint
npm run lint

# Inspect Supabase organizations
cd app
npm run supabase:orgs
```

Targeted checks are often better than broad checks while feature work is moving. For Slides changes, the focused sandbox/deck tests are the strongest signal.

```bash
cd app
npx tsx src/__tests__/slidesSandboxTests.ts
```

## API Map

Most product APIs require Firebase auth.

| Area | Endpoints |
| --- | --- |
| Projects | `/api/projects`, `/api/projects/[projectId]`, `/api/projects/[projectId]/messages` |
| Plans | `/api/projects/[projectId]/prd`, `/api/projects/[projectId]/plan/approve` |
| Generation | `/api/generate`, `/api/generate/stream`, `/api/enhance-prd` |
| Build worker | `/api/projects/[projectId]/build/start`, `/api/projects/[projectId]/build/status`, `/api/projects/[projectId]/build/logs`, `/api/projects/[projectId]/build/cancel` |
| Blueprints | `/api/blueprints`, `/api/blueprints/[blueprintId]/history` |
| Sharing | `/api/share`, `/api/share/[token]`, `/api/projects/[projectId]/share` |
| Collaboration | `/api/collaborations`, `/api/collaborations/accept` |
| Account and admin | `/api/account`, `/api/admin/logs` |

## Project Structure

```text
Flowro-PM/
├── Docs/                         # Product and architecture docs
├── Docs/images/                  # README and public documentation images
├── app/                          # Next.js app
│   ├── public/                   # Static assets
│   ├── templates/nextjs-app/     # Generated app template
│   ├── env.example               # Environment template
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Public landing page
│       │   ├── app/              # Authenticated workspace
│       │   ├── auth/             # Self-hosted auth routes
│       │   ├── api/              # Product APIs
│       │   ├── share/            # Shared project routes
│       │   └── settings/         # User settings
│       ├── components/           # App and workspace UI
│       ├── lib/
│       │   ├── build-worker/     # Local app generation worker
│       │   ├── firebase/         # Firestore collections and schema
│       │   ├── langchain/        # AI chains and intent handling
│       │   ├── project-plan/     # Project plan schema
│       │   ├── slides/           # Slides generation, preview, validation, export
│       │   └── rag/              # Retrieval helpers
│       └── __tests__/            # Focused implementation tests
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── README.md
```

## Security Notes

- Secrets live in environment files and should never be committed.
- Product routes mount auth at the route level.
- API routes validate Firebase ID tokens where required.
- Firestore access is controlled by security rules and server-side ownership checks.
- Generated app provisioning uses explicit Supabase management credentials.
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy are configured.
- Some rate limiting, logging, and cache behavior is in-memory. Use persistent infrastructure before heavy production use.

## Roadmap

### Ready

- One-prompt home experience for Apps and Slides
- Project planning and approval workflow
- Generated app workspace flow
- Supabase-backed generated app path
- Slides brief, story, deck preview, edits, and export
- Share links, collaboration APIs, and workspace history
- Self-hosted deployment path

### Next

- Stronger build repair loop
- More generated app templates
- Persistent queues and operational storage for worker jobs
- Richer Slides source ingestion
- More polished public landing page examples

## Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-change`.
3. Make the change.
4. Run the focused checks for the area you touched.
5. Open a pull request with a clear description and screenshots when the UI changes.

## Philosophy

Flowro is for builders who want the speed of AI generation with the taste, control, and verification of a real product workflow.

Start with an idea. Shape the plan. Build the app. Design the deck. Keep editing until it feels ready.

<p align="center">
  <strong>Bring your keys. Run your stack. Turn the prompt into something worth shipping.</strong>
</p>
