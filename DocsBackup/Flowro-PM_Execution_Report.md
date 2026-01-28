# Flowro-PM Execution Report

**Generated:** 2025-12-29  
**Repository:** Flowro-PM  
**Methodology:** Per Agent Execution Guide

---

## 4.1 Current State Assessment

### What Exists

| Component | Location | Status |
|-----------|----------|--------|
| Landing Page | `/index.html` | Static HTML mockup (755 lines). Uses TailwindCSS CDN. No JavaScript logic beyond "Coming Soon" toast notifications. |
| Auth UI Mockups | `/Frontend/AuthView/` | `SignIn.html`, `SignUp.html` — Static HTML with form fields. No form submission logic, no authentication integration. |
| Home Dashboard Mockup | `/Frontend/Home/HomeView.html` | Static HTML with hardcoded project cards. No data binding, no API calls. |
| Chat Interface Mockup | `/Frontend/Home/ChatView.html` | Static chat UI. No message sending logic, no WebSocket, no LLM integration. |
| Document View Mockup | `/Frontend/Home/DocumentView.html` | Static 9-section UBP viewer. No data fetching, no export functionality. |
| Deployment Config | `/vercel.json` | Routes all requests to `/index.html`. Static-only deployment. |
| Documentation | `/Docs/` | UBP v0.2 specification, UBP Core Philosophy, Agent Execution Guide. |

### What Does Not Exist

| Component | Notes |
|-----------|-------|
| **Backend Directory** | `/Backend/` exists but is **empty**. No server code. |
| **API Layer** | No REST/GraphQL endpoints defined anywhere. |
| **Database** | No schema, no migrations, no database connection code. |
| **Authentication System** | No OAuth integration, no JWT handling, no session management. |
| **LLM Integration** | No OpenAI/Anthropic API calls, no LangGraph implementation. |
| **Agent Orchestration** | No "Flowro PM Agent" logic despite UBP describing it as a core actor. |
| **Data Persistence** | No MongoDB setup, no document storage. |
| **Mermaid Renderer** | No diagram generation code. |
| **Export Engine** | No PDF/Markdown export implementation. |
| **State Management** | No application state, no user session handling. |
| **Build System** | No `package.json`, no bundler config (Vite/Webpack). |
| **Tests** | No test files, no test framework configured. |

### What Is Non-Functional

| UI Component | Reason |
|--------------|--------|
| Sign In Form | Buttons do nothing. No form validation. No submission handler. |
| Sign Up Form | Same as Sign In. Password strength indicator is hardcoded. |
| "Create New UBP" button | Non-functional. Links to `#`. |
| Chat Input | Send button does nothing. No message queue. |
| Document Export | "Export JSON" button not wired. No data to export. |
| Navigation Links | All sidebar/header links point to `#` or are non-functional. |
| Google OAuth Buttons | Static buttons with no OAuth redirect logic. |

---

## 4.2 Missing System Components

### Required to Achieve Operational Status

#### Backend Services

| Service | Purpose | Security Requirement |
|---------|---------|----------------------|
| **Next.js API Routes** | Unified backend in same codebase | Firebase ID token verification |
| **Firebase Auth** | Google OAuth sign-in | Built-in Google security |
| **Blueprint Service** | CRUD operations for UBP JSON documents | User-scoped access via Firebase UID |
| **LLM Gateway** | OpenRouter API calls with SSE streaming | API key server-side only |
| **Export Service** | On-demand conversion: JSON → Markdown / JSON → PDF | Sandboxed PDF rendering |

#### APIs

| Endpoint Group | Required Endpoints |
|----------------|-------------------|
| `/api/auth` | `POST /login`, `POST /register`, `POST /logout`, `GET /me`, `POST /refresh` |
| `/api/blueprints` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/lock` |
| `/api/blueprints/:id/sections` | `GET /:section`, `PUT /:section`, `POST /:section/regenerate` |
| `/api/generate` | `POST /draft` (initial generation from chat), `POST /refine` (iterate on section) |
| `/api/export` | `GET /:id/json`, `GET /:id/markdown`, `GET /:id/pdf` (on-demand conversion) |

#### Data Store

| Store | Technology | Purpose | Security |
|-------|------------|---------|----------|
| Primary | Firebase Firestore | UBP JSON + chat history, user profiles | Firebase security rules, encryption at rest |

> **Note:** Single database. UBP content and chat history stored together in each blueprint document.

#### Agent/Orchestration Layer (MVP)

| Component | Technology | Purpose |
|-----------|------------|---------|
| LLM Provider | OpenRouter API (`openai/gpt-oss-120b:free`) | Free model for MVP |
| Direct API Calls | Next.js API routes + `fetch` | Simple request/response |
| Prompt Templates | TypeScript constants | Structured prompts for UBP generation |

> **Note:** LangGraph deferred to post-MVP. Direct LLM API calls sufficient for MVP.

#### Security Mechanisms

| Mechanism | Implementation |
|-----------|----------------|
| **Authentication** | Firebase Auth (Google Sign-In). ID tokens verified server-side. |
| **Authorization** | Firestore security rules + server-side UID checks. |
| **Input Validation** | Zod schema validation. Sanitize inputs before LLM calls. |
| **Secrets Management** | Vercel environment variables. Never expose API keys. |
| **Rate Limiting** | Per-user limits via custom middleware. |
| **CORS** | Next.js handles automatically for same-origin. |

#### Infrastructure

| Component | Service |
|-----------|---------|
| **Frontend + Backend** | Vercel (Next.js App Router + API Routes) |
| **Authentication** | Firebase Auth |
| **Database** | Firebase Firestore |
| **LLM Provider** | OpenRouter (`openai/gpt-oss-120b:free`) |
| **PDF Renderer** | Puppeteer / Browserless.io |
| **CI/CD** | GitHub → Vercel |
| **Monitoring** | Sentry (errors) |

---

## 4.3 Execution Phases

### Phase 1: Foundation & Authentication

**Goal:** Establish project architecture and Firebase authentication.

**Required Components:**
- Next.js 14 project with App Router
- Firebase project setup (Auth + Firestore)
- Google Sign-In integration
- Protected route middleware
- Firestore security rules

**Dependencies:** None (starting from zero)

**Security Considerations:**
- Verify Firebase ID tokens server-side in API routes
- Set Firestore rules to enforce user ownership
- Never expose Firebase admin credentials

---

### Phase 2: Core Data Layer

**Goal:** Blueprint CRUD operations with proper access control.

**Required Components:**
- Firestore collections: `users`, `blueprints`
- API routes: `/api/blueprints/*`
- User-scoped data access via Firebase UID
- Version history (new doc per locked version)

**Dependencies:** Phase 1 (auth required)

**Security Considerations:**
- All Firestore queries filter by `userId`
- Firestore rules enforce ownership
- Lock status prevents modifications

---

### Phase 3: LLM Integration

**Goal:** Generate and refine UBP via chat using OpenRouter.

**Required Components:**
- OpenRouter API integration (model: `openai/gpt-oss-120b:free`)
- System prompt with UBP schema
- JSON mode for structured output
- Chat history stored with blueprint

**Dependencies:** Phase 2 (blueprints must exist)

**Security Considerations:**
- Sanitize user input before sending to LLM
- OpenRouter API key server-side only
- Log LLM interactions for audit

---

### Phase 4: Chat Interface with Streaming

**Goal:** Chat-based UBP refinement with streaming responses.

**Required Components:**
- Server-Sent Events (SSE) for streaming LLM output
- ChatView connected to backend via HTTP + SSE
- Section-level regeneration with optimistic UI
- Typing indicators via SSE events

**Dependencies:** Phase 3 (agent must exist to power chat)

**Security Considerations:**
- Authenticate SSE connections with JWT (via query param or header)
- Implement message rate limiting (prevent spam/abuse)
- Validate all chat inputs before processing
- Timeout long-running generation requests (60s)

---

### Phase 5: Export & Delivery

**Goal:** On-demand export of UBP in multiple formats.

**Required Components:**
- JSON export: Return stored MongoDB document as-is
- Markdown export: Convert JSON to formatted `.md` (string manipulation)
- PDF export: Render HTML template with Mermaid diagrams → Puppeteer
- "Open in Cursor" button with deep link support

**Dependencies:** Phase 4 (blueprints must have content to export)

**Security Considerations:**
- Sanitize Mermaid diagram content before rendering (XSS prevention)
- Run Puppeteer in sandboxed container for PDF generation
- Validate export requests come from blueprint owner
- Rate limit export requests to prevent abuse

---

## 4.4 Assumptions

| # | Assumption |
|---|------------|
| 1 | **All-in-one stack:** Next.js handles frontend + API routes (no separate backend). |
| 2 | **Firebase for auth + data:** Firebase Auth (Google) + Firestore (NoSQL). |
| 3 | **OpenRouter for LLM:** Using `openai/gpt-oss-120b:free` model. |
| 4 | **Vercel deployment:** Single deployment for entire app. |
| 5 | **Single-player mode:** No real-time collaboration for MVP. |
| 6 | **JSON-first storage:** UBP + chat history stored together per blueprint. |
| 7 | **Immutable locked versions:** Locked blueprints create new documents on edit. |

---

## 4.5 Risks & Blockers

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| LLM output inconsistency across providers | High | Use structured output formats (JSON mode), implement output validators, add regeneration fallback |
| Context window limits for large UBPs | Medium | Implement section-by-section generation, use summarization for context injection |
| PDF rendering reliability (Puppeteer) | Medium | Use managed service (Browserless.io) instead of self-hosted, implement retry logic |
| Cold start latency on serverless | Low | Use Vercel Edge Functions for critical paths, implement connection pooling |

### Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Prompt injection via user chat input | High | Sanitize all user inputs, use system prompts with clear boundaries, validate outputs |
| API key exposure | Critical | Use server-side environment variables only, implement key rotation policy |
| Session hijacking | High | HTTP-only cookies, short JWT expiry, IP binding for sensitive operations |
| Unauthorized blueprint access | High | Mandatory ownership checks on every API route, comprehensive integration tests |
| LLM cost overrun | Medium | Implement per-user token limits, budget alerts, circuit breaker on spend threshold |

### Architectural Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Tight coupling to specific LLM provider | Medium | Abstract LLM calls behind gateway interface, maintain provider-agnostic prompts |
| Monolithic backend growth | Medium | Define clear service boundaries from start, prepare for microservice extraction |
| Schema migrations without versioning | Medium | Use MongoDB migration tool, maintain backwards compatibility during updates |
| No observability in production | High | Implement structured logging, APM integration, and alerting from Phase 1 |

---

*Report generated per Agent Execution Guide specifications. No filler text. No feature speculation.*
