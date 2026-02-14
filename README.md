<p align="center">
  <img src="app/public/logo.png" alt="Flowro AI Logo" width="120" />
</p>

<h1 align="center">Flowro AI</h1>

<p align="center">
  <strong>Unified Blueprint Engine</strong> — Transform messy ideas into structured, agent-ready project blueprints
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Firebase-12.7-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
</p>

---

## 🎯 The Problem We Solve

The rise of **"vibe coding"** — high-speed AI-assisted development — has created a new challenge:

> Developers can now generate functional code faster than ever, but without architectural structure. The result? **"Chaos code"** — fragile systems that are impossible to maintain, scale, or hand off.

Traditional documentation is too slow. PRDs are too verbose. User stories are too fragmented.

**Flowro AI introduces the Unified Blueprint (UBP)** — a single, structured document that replaces all traditional documentation and serves as the perfect input for AI coding agents like Cursor, Claude Code, and Windsurf.

---

## 💡 What is Flowro AI?

Flowro AI is an intelligent project planning tool that transforms unstructured ideas into **Unified Blueprints (UBP)** through AI-powered conversations.

### The Vision

| Traditional Approach | Flowro Approach |
|---------------------|-----------------|
| Write PRD → User Stories → Tech Spec → Architecture Doc | Chat with AI → Get complete UBP in 3 messages |
| Fragmented documentation | Single source of truth |
| Manual requirements gathering | AI infers requirements from context |
| Developer interprets docs | Agent-ready, code-executable specs |

---

## ✨ Key Features

### 🤖 AI-Powered Discovery
Chat naturally about your project idea. Flowro's AI agent studies your input, identifies gaps, and **proposes** requirements rather than asking endless questions.

### 📋 Unified Blueprint Generation
Generate comprehensive 9-section blueprints covering:
1. **Product Vision** — The "why" behind your project
2. **Scope** — Clear boundaries (in-scope, out-of-scope, deferred)
3. **Actors** — All human and system entities
4. **Behaviors** — Functional specifications (Given/When/Then)
5. **Constraints & Risks** — Real-world limitations
6. **Technology Decisions** — Stack choices with justifications
7. **Implementation Phases** — Outcome-based delivery sequence
8. **Integration Points** — External connections
9. **Change Log** — Version-controlled evolution

### 🔒 Blueprint Versioning & Save Version
- Draft → Locked → Approved workflow
- **Save Version**: Lock current blueprint as a milestone and automatically create a new draft
- Continue conversations even after saving a version
- Full version history with change tracking

### 📊 Command Center & Dashboard
- **Vision Input**: Interactive "What's the vision?" interface for rapid project initiation.
- **Quick Actions**: One-click templates for common apps (Task Manager, Warehouse, etc.).
- **Smart Management**: Visual status indicators and quick access to blueprints.

### 🔗 Agent-Ready Export
Export blueprints in formats optimized for AI coding agents:
- Markdown for Cursor, Claude Code, Windsurf
- JSON for programmatic consumption
- Visual Mermaid diagrams included

### ✨ AI-Enhanced Editing
- **Smart Selection**: Highlight any text in your blueprint to reveal a premium AI floating menu.
- **Auto-Enhance**: One-click professional refinement of your requirements using "Consultant Logic".
- **Contextual Ask**: Instruct Flowro AI to rewrite specific parts of your blueprint while maintaining global consistency.

### ⚡ Real-Time AI Generation & Streaming
- **Standard Generation**: `/api/generate` handles intent detection, UBP updates, and automatic version snapshots.
- **Streaming Generation**: `/api/generate/stream` provides SSE responses for real-time output.
- **Cost-Aware Guardrails**: Built-in rate limiting, token estimation, and budget checks for safer usage.

### 🤝 Shareable Links, Collaboration & Workspaces
- **Public Links**: Generate secure, read-only links for stakeholders.
- **Collaborator Roles**: Invite and manage `viewer`, `commenter`, `editor`, and `admin` roles.
- **Workspaces**: Auto-provision personal workspaces and create additional workspaces (Beta).
- **Export Options**: Download as JSON, Markdown, or copy directly as Cursor Rules.

### 🌍 Global & Mobile Ready
- **Responsive Design**: Seamless experience across all devices, from desktop to mobile.
- **RTL Support**: First-class support for right-to-left languages (Arabic/Hebrew) built into the core.
- **Accessibility**: High-contrast modes and screen reader optimization.

---

## 🏗️ Architecture

### Data Model

```
projects/{projectId}
├── userId
├── name / lastMessage
├── collaborators[] / collaboratorUserIds[]
├── createdAt / updatedAt
└── messages/{messageId}        ← Unlimited chat history (subcollection)

blueprints/{blueprintId}
├── projectId                    ← 1:1 with projectId
├── content                      ← Current living UBP
├── updatedAt
└── history/{snapshotId}         ← Version snapshots

shareTokens/{tokenId}            ← Public share links
workspaces/{workspaceId}         ← Workspace containers (Beta)
Users/{userId}                   ← User profile documents
```

### System Flow

```mermaid
flowchart LR
    A[💡 Messy Idea] --> B[🤖 Flowro AI Chat]
    B --> C[⚙️ OpenRouter/LangChain]
    C --> D[📋 Live UBP]
    D --> E[🧾 Version History Snapshot]
    E --> F[🔗 Share / Export / Build]
```

---

## 🛠️ Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Framework** | Next.js 16.1 (App Router) | Full-stack React 19, Turbopack, Server Actions |
| **Language** | TypeScript 5 | Type safety, better DX, refactoring support |
| **Auth** | Firebase Auth | Zero-friction Google OAuth, no password management |
| **Database** | Firebase Firestore | NoSQL perfect for JSON-based UBPs, real-time sync |
| **AI Orchestration** | LangChain & OpenRouter | Structured AI outputs and multi-model flexibility |
| **Styling** | Tailwind CSS 4 | Utility-first, rapid UI development with CSS variables |
| **Diagrams** | Mermaid.js 11 | Text-to-diagram for agent compatibility |
| **Validation** | Zod 4.3 | Runtime type validation for API responses |
| **Deployment** | Vercel | Zero-config Next.js deployment, edge functions |
| **Monitoring** | Sentry (Optional) | Error tracking and performance monitoring |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Firebase project with Firestore enabled
- OpenRouter API key (free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Flowro-PM.git
cd Flowro-PM

# Install root scripts
npm install

# Install app dependencies
cd app
npm install

# Set up environment variables
cp env.example .env.local
```

### Environment Variables

Create `.env.local` in the `/app` directory:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# OpenRouter
OPENROUTER_API_KEY=sk-or-your-api-key-here
OPENROUTER_MODEL=deepseek/deepseek-v3.2  # Optional but recommended for consistency

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: AI rollout controls
USE_LANGCHAIN=false
LANGCHAIN_ROLLOUT_PERCENT=0
INTENT_LLM_ENABLED=true

# Optional: Analytics / Monitoring
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0
SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/0

# Optional: Admin API guard
ADMIN_USER_ID=your-firebase-uid
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Root scripts proxy to app scripts (`cd app && npm run ...`), so you can run from repo root or from `/app`.

### Code Quality

```bash
# Run ESLint to check for issues
npm run lint

# Build the project (runs type checking)
npm run build
```

The project maintains zero ESLint errors and follows strict TypeScript typing practices.

### Production Build

```bash
npm run build
npm start
```

---

## 📡 API Reference

### Projects

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | `GET` | List all user projects |
| `/api/projects` | `POST` | Create new project |
| `/api/projects/[projectId]` | `GET` | Get project details with chat history |
| `/api/projects/[projectId]` | `PATCH` | Update project metadata and/or append chat messages |
| `/api/projects/[projectId]` | `DELETE` | Delete project and all associated data |
| `/api/projects/[projectId]/messages` | `GET` | Fetch project messages (paginated or capped all) |
| `/api/projects/[projectId]/messages` | `POST` | Add a single message to project history |
| `/api/projects/[projectId]/share` | `GET` | Get collaborator + public link settings |
| `/api/projects/[projectId]/share` | `POST` | Invite collaborator or toggle public link |
| `/api/projects/[projectId]/share` | `DELETE` | Remove collaborator from project |

### Blueprints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blueprints?projectId=xxx` | `GET` | List blueprints for a project |
| `/api/blueprints` | `POST` | Create new blueprint version |
| `/api/blueprints` | `PATCH` | Update content, lock, or save-version |
| `/api/blueprints/[blueprintId]/history` | `GET` | Fetch full version history or one snapshot |

### AI Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | `POST` | Generate AI response & update blueprint |
| `/api/generate/stream` | `POST` | Stream AI response in real-time (SSE) |

### Sharing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/share` | `POST` | Create shareable link |
| `/api/share` | `DELETE` | Revoke shareable link |
| `/api/share/[token]` | `GET` | Get shared content |

### Collaborations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/collaborations` | `GET` | List projects where user has collaborative access |
| `/api/collaborations/accept` | `POST` | Accept a collaboration invitation |

### Workspaces

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workspaces` | `GET` | List user's workspaces (auto-creates personal workspace if needed) |
| `/api/workspaces` | `POST` | Create new workspace |

### Admin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/logs` | `GET` | View system logs (admin only) |
| `/api/admin/logs` | `PATCH` | Update cost control configuration |

### Account

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/account` | `DELETE` | Delete user account and all data |

---

## 📁 Project Structure

```
Flowro-PM/
├── Docs/                            # Project documentation & specs
│   ├── Unified-Blueprint.md         # UBP specification
│   ├── Firestore-Security-Model.md  # Firestore security details
│   ├── Collaboration-API.md         # Collaboration contracts
│   ├── Brand-Guidelines.md          # Design system & brand rules
│   └── Bug-Fixes-Production-Report.md
│
├── app/                             # Next.js application
│   ├── public/                      # Static assets
│   ├── next.config.ts               # Security headers & config
│   ├── eslint.config.mjs            # ESLint configuration
│   ├── sentry.*.config.ts           # Sentry monitoring (optional)
│   ├── env.example                  # Environment template
│   └── src/
│       ├── app/
│       │   ├── api/                 # API Routes
│       │   │   ├── account/         # Account management
│       │   │   ├── admin/           # Admin endpoints
│       │   │   ├── blueprints/      # Blueprint CRUD
│       │   │   ├── collaborations/  # Collaboration APIs
│       │   │   ├── generate/        # AI generation service
│       │   │   ├── projects/        # Project CRUD
│       │   │   ├── share/           # Public sharing
│       │   │   └── workspaces/      # Workspace management
│       │   ├── auth/                # Authentication pages
│       │   ├── chat/[projectId]/    # Chat interface
│       │   ├── app/                 # Command Center app shell
│       │   ├── demo/                # Public demo routes
│       │   ├── share/               # Public shared blueprints
│       │   ├── settings/            # User settings
│       │   ├── privacy/             # Privacy policy
│       │   ├── terms/               # Terms & conditions
│       │   └── page.tsx             # Landing page
│       │
│       ├── components/
│       │   ├── home/                # Command Center & Home View
│       │   │   ├── CommandCenter.tsx
│       │   │   ├── VisionInput.tsx
│       │   │   └── QuickActions.tsx
│       │   ├── onboarding/          # User onboarding flow
│       │   ├── ui/                  # Reusable UI components
│       │   ├── UBPViewer.tsx        # Blueprint display
│       │   ├── UBPEditModals.tsx    # Blueprint editing
│       │   ├── ShareProjectModal.tsx # Project Sharing
│       │   ├── PricingSection.tsx   # Pricing UI
│       │   └── AIFloatingMenu.tsx   # AI enhancement menu
│       │
│       ├── lib/
│       │   ├── rag/                 # RAG Engine
│       │   ├── memory/              # Agent Memory System
│       │   ├── learning/            # Self-learning capabilities
│       │   ├── firebase.ts          # Client SDK
│       │   ├── firebase-admin.ts    # Server SDK
│       │   ├── openrouter.ts        # LLM client
│       │   ├── analytics.ts         # Event tracking
│       │   ├── contextBuilder.ts    # Context management
│       │   ├── costTracking.ts      # Cost monitoring
│       │   ├── rateLimit.ts         # API throttling logic
│       │   ├── stream.ts            # SSE streaming helpers
│       │   ├── exportBlueprint.ts   # Export utilities
│       │   └── langchain/           # LangChain integration
│       │       ├── chains.ts        # AI chains
│       │       ├── client.ts        # LangChain client
│       │       └── intentDetector.ts # Intent classification
│       │
│       ├── hooks/
│       │   └── useToast.ts          # Toast notifications
│       └── __tests__/               # Internal phase tests
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
│
└── README.md
```

---

## 🔐 Security Features

Flowro AI implements enterprise-grade security measures:

- **Content Security Policy (CSP)**: Strict CSP headers prevent XSS attacks
- **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options enabled
- **Firebase Auth**: Industry-standard authentication with Google OAuth
- **Server-side Validation**: All API routes validate authentication tokens
- **Input Sanitization**: PII protection and content filtering
- **HTTPS Enforcement**: Strict transport security with preload
- **Rate Limiting Middleware**: API throttling by route type (`generate`, `mutation`, `read`, `auth`)
- **No Credentials in Code**: Environment-based configuration only

> Note: rate limiting, logs, and blueprint caching currently use in-memory stores and reset on restart.

---

## 🎨 The UBP Philosophy

The Unified Blueprint is built on four core principles:

| Principle | Description |
|-----------|-------------|
| **Single Source of Truth** | One document replaces all traditional documentation |
| **Consultant Logic** | AI proposes content rather than rejecting vague input |
| **Agent-Ready** | Output strictly formatted for Code Agents to execute |
| **No Narrative** | Storytelling and vague language prohibited in final artifact |

---

## 📊 Business Value

### For Developers
- **3x faster** from idea to structured spec
- **Eliminate documentation debt** before it starts
- **Seamless handoff** to AI coding agents

### For Teams
- **Single source of truth** everyone can reference
- **Version-controlled requirements** with change tracking
- **Reduced miscommunication** between stakeholders

### For Businesses
- **Faster time-to-market** with structured planning
- **Lower technical debt** through upfront architecture
- **Better AI leverage** with agent-ready specifications

---

## 🗺️ Roadmap

### Phase 1: Inference Engine ✅
- Chat interface & UBP Generation
- Versioning & Locking
- Streamlined Ingestion

### Phase 2: Diagram Layer ✅
- Real-time Mermaid diagrams
- Visual behavior flows
- Sequence Diagrams

### Phase 3: Handoff Bridge ✅
- Optimized Export (One-click Copy)
- IDE Integration (Cursor Rules, Markdown, JSON)
- PDF Export (Coming Soon)

### Phase 4: Collaboration Layer ✅
- Project sharing via secure public links
- Collaboration APIs with role-based project access
- Invitation acceptance workflows

### Phase 5: Operational Hardening 🚧 (In Progress)
- Workspace and team capability expansion
- Persistent distributed rate limiting/logging/cache
- Collaboration UX refinements and consistency fixes

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Built for the **vibe coders** who prioritize speed without sacrificing structure
- Inspired by the need to bridge human creativity and AI execution


---

<p align="center">
  <strong>Stop writing chaos code. Start with a blueprint.</strong>
</p>

<p align="center">
  <a href="https://flowro.ai">Website</a> •
  <a href="https://docs.flowro.ai">Documentation</a> •
  <a href="https://twitter.com/flowroai">Twitter</a>
</p>
