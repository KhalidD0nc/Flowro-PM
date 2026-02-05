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
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
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

### 🚀 Launch Plan & Task Management
- **Automated Roadmap**: AI transforms your UBP into a granular implementation plan.
- **Kanban Board**: Drag-and-drop task management (`@dnd-kit`) to track progress from Backlog to Launch.
- **Launch Readiness**: Track remaining tasks, blockers, and launch checklists.

### 🌐 Shareable Links & Workspaces
- **Public Links**: Generate secure, read-only links for stakeholders.
- **Workspaces**: Organize projects into shared workspaces (Beta).
- **Export Options**: Download as JSON, Markdown, or copy directly as Cursor Rules.

### 🌍 Global & Mobile Ready
- **Responsive Design**: Seamless experience across all devices, from desktop to mobile.
- **RTL Support**: First-class support for right-to-left languages (Arabic/Hebrew) built into the core.
- **Accessibility**: High-contrast modes and screen reader optimization.

---

## 🏗️ Architecture

### Data Model

```
User (Collection)
└── userId
    └── Projects (Subcollection)
        └── Project
            ├── projectName
            ├── description
            ├── chatHistory[]        ← Persistent across all versions
            ├── createdAt / updatedAt
            └── blueprints[]
                ├── version: "0.1", "1.0", etc.
                ├── status: draft | locked | approved
                ├── content: { ...UBP sections }
                └── lockedAt
```

### System Flow

```mermaid
flowchart LR
    A[💡 Messy Idea] --> B[🤖 Flowro AI]
    B --> C[📋 Unified Blueprint]
    C --> D[🔧 Code Agent]
    D --> E[✅ Working Product]
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

- Node.js 18+
- Firebase project with Firestore enabled
- OpenRouter API key (free tier available)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Flowro-PM.git
cd Flowro-PM/app

# Install dependencies
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
OPENROUTER_MODEL=openai/gpt-oss-120b:free  # Optional, defaults to openai/gpt-oss-120b:free

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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
| `/api/projects/[projectId]` | `PATCH` | Update project (add messages, update blueprint) |
| `/api/projects/[projectId]` | `DELETE` | Delete project and all associated data |
| `/api/projects/[projectId]/share` | `GET` | Get public share link details |
| `/api/projects/[projectId]/share` | `POST` | Create or update public share link |
| `/api/projects/[projectId]/share` | `DELETE` | Revoke public share link |

### Blueprints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/blueprints?projectId=xxx` | `GET` | List blueprints for a project |
| `/api/blueprints` | `POST` | Create new blueprint version |
| `/api/blueprints` | `PATCH` | Update content, lock, or save-version |

### AI Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate` | `POST` | Generate AI response & update blueprint |
| `/api/generate/stream` | `POST` | Stream AI response in real-time (SSE) |

### Tasks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks?projectId=xxx` | `GET` | List tasks for a project |
| `/api/tasks` | `POST` | Create new task |
| `/api/tasks/[id]` | `GET` | Get task details |
| `/api/tasks/[id]` | `PATCH` | Update task |
| `/api/tasks/[id]` | `DELETE` | Delete task |
| `/api/tasks/[id]/move` | `POST` | Move task between columns |
| `/api/tasks/generate` | `POST` | Generate tasks from blueprint |

### Sharing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/share` | `POST` | Create shareable link |
| `/api/share` | `DELETE` | Revoke shareable link |
| `/api/share/[token]` | `GET` | Get shared content |

### Workspaces

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workspaces` | `GET` | List user's workspaces |
| `/api/workspaces` | `POST` | Create new workspace |

### Admin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/logs` | `GET` | View system logs (admin only) |
| `/api/admin/logs` | `PATCH` | Update log entries |

### Account

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/account` | `DELETE` | Delete user account and all data |

---

## 📁 Project Structure

```
Flowro-PM/
├── Docs/                            # Project documentation & specs
│   ├── 2-Phase-Production-Plan.md   # Production roadmap
│   ├── Agent-Enhancement-Roadmap.md # AI agent improvements
│   ├── Unified-Blueprint.md         # UBP specification
│   ├── Brand-Guidelines.md          # Design system & brand rules
│   └── Architecture-Benchmarks.md   # Competitive analysis
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
│       │   │   ├── generate/        # AI generation service
│       │   │   ├── projects/        # Project CRUD
│       │   │   ├── share/           # Public sharing
│       │   │   ├── tasks/           # Task management
│       │   │   └── workspaces/      # Workspace management
│       │   ├── auth/                # Authentication pages
│       │   ├── chat/[projectId]/    # Chat interface
│       │   ├── dashboard/           # Project dashboard
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
│       │   ├── firebaseAdmin.ts     # Server SDK
│       │   ├── openrouter.ts        # LLM client
│       │   ├── analytics.ts         # Event tracking
│       │   ├── contextBuilder.ts    # Context management
│       │   ├── costTracking.ts      # Cost monitoring
│       │   ├── exportBlueprint.ts   # Export utilities
│       │   └── langchain/           # LangChain integration
│       │       ├── chains.ts        # AI chains
│       │       ├── client.ts        # LangChain client
│       │       └── intentDetector.ts # Intent classification
│       │
│       ├── hooks/
│       │   └── useToast.ts          # Toast notifications
│       │
│       └── types/
│           └── index.ts             # TypeScript definitions
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
- **No Credentials in Code**: Environment-based configuration only

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

### Phase 4: Execution Layer ✅
- AI Launch Plans
- Interactive Kanban Board
- Task Management

### Phase 5: Team Collaboration 🚧 (In Progress)
- Shared Workspaces (Beta)
- Multi-user permissions
- Real-time presence (Coming Soon)

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built for the **vibe coders** who prioritize speed without sacrificing structure
- Inspired by the need to bridge human creativity and AI execution
- Powered by the amazing open-source community

---

<p align="center">
  <strong>Stop writing chaos code. Start with a blueprint.</strong>
</p>

<p align="center">
  <a href="https://flowro.ai">Website</a> •
  <a href="https://docs.flowro.ai">Documentation</a> •
  <a href="https://twitter.com/flowroai">Twitter</a>
</p>
