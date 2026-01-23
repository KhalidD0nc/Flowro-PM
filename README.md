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
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
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

### 📊 Project Dashboard
- Manage all your projects in one place
- Visual status indicators
- Quick access to blueprints and chat history

### 🔗 Agent-Ready Export
Export blueprints in formats optimized for AI coding agents:
- Markdown for Cursor, Claude Code, Windsurf
- JSON for programmatic consumption
- Visual Mermaid diagrams included

### 🌐 Shareable Links
Share your blueprints with stakeholders via public URLs:
- Generate shareable links for any blueprint
- Read-only view with Flowro branding
- Perfect for sharing with clients, team members, or investors

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
| **Framework** | Next.js 16 (App Router) | Full-stack React with API routes, server components |
| **Language** | TypeScript | Type safety, better DX, refactoring support |
| **Auth** | Firebase Auth | Zero-friction Google OAuth, no password management |
| **Database** | Firebase Firestore | NoSQL perfect for JSON-based UBPs, real-time sync |
| **Styling** | Tailwind CSS 4 | Utility-first, rapid UI development |
| **AI/LLM** | OpenRouter API | Multi-model support, easy model switching |
| **Diagrams** | Mermaid.js | Inline diagrams from text, code-agent compatible |
| **Deployment** | Vercel | Zero-config Next.js deployment, edge functions |

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
cp .env.example .env.local
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
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# LLM Provider
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free  # Optional, defaults to gemini-2.0-flash
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

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

---

## 📁 Project Structure

```
Flowro-PM/
├── Docs/                            # Project documentation
│   ├── Unified-Blueprint.md        # UBP specification
│   ├── The UBP Core Philosophy.md  # Design principles
│   ├── Agent Execution Guide.md    # AI agent instructions
│   └── Flowro-PM_Execution_Report.md
│
├── app/                             # Next.js application
│   ├── public/                      # Static assets
│   ├── next.config.ts               # Security headers configured
│   ├── env.example                  # Environment template
│   └── src/
│       ├── app/
│       │   ├── api/
│       │   │   ├── blueprints/      # Blueprint CRUD + auth
│       │   │   │   ├── auth.ts      # Token verification
│       │   │   │   ├── route.ts     # API endpoints
│       │   │   │   └── service.ts   # Business logic + transactions
│       │   │   ├── generate/        # AI generation service
│       │   │   └── projects/        # Project CRUD
│       │   ├── auth/                # Sign in / Sign up
│       │   │   ├── page.tsx         # Auth UI
│       │   │   └── actions.ts       # Auth actions (with input sanitization)
│       │   ├── chat/[projectId]/    # Chat interface
│       │   ├── dashboard/           # Project dashboard
│       │   └── page.tsx             # Landing page
│       │
│       ├── components/
│       │   ├── UBPViewer.tsx        # Blueprint viewer panel
│       │   ├── UBPList.tsx          # Blueprint list component
│       │   ├── CreateProjectModal.tsx  # New project modal
│       │   ├── PricingSection.tsx   # Pricing page component
│       │   └── Providers.tsx        # Auth context provider
│       │
│       └── lib/
│           ├── firebase.ts          # Client SDK initialization
│           ├── firebase-admin.ts    # Admin SDK initialization
│           ├── openrouter.ts        # LLM API client
│           └── exportBlueprint.ts   # JSON/Markdown export utilities
│
└── README.md
```

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
- Chat interface for idea input
- Auto-generation of 9-section UBP
- Blueprint versioning and locking

### Phase 2: Diagram Layer ✅
- Real-time Mermaid diagram rendering
- Visual behavior flow diagrams
- Entity relationship diagrams

### Phase 3: Handoff Bridge ✅
- Optimized export for specific Code Agents (JSON + Markdown)
- Download blueprints in agent-ready formats
- PDF export for stakeholders (planned)

### Phase 4: Team Collaboration 🔮
- Multi-user editing
- Conflict resolution
- Comments and suggestions

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
