# Flowro-PM: Architecture Simplification & Command Center Implementation

**Version:** 1.0
**Status:** Production Ready
**Created:** February 1, 2026
**Target:** Complete architectural overhaul with "One Project = One Blueprint" enforcement

---

## Executive Summary

This document outlines the complete implementation plan for Flowro-PM's simplified architecture. The core changes are:

1. **Enforce "One Project = One Blueprint"** with automated version history
2. **Subcollection-Based Firebase Schema** for infinite scalability
3. **Command Center Home View** replacing the old dashboard
4. **Streamlined Data Flow** between Agent, LLM, and Storage

| Metric | Target State |
|--------|--------------|
| Schema | Subcollections (scalable, no 1MB limit) |
| Home View | Premium Command Center |
| Blueprint Model | Strict 1:1 with auto-versioning |
| Chat Storage | Messages subcollection (unlimited) |
| Version Control | Automatic snapshots on every change |

---

## Core Architectural Principles

### One Project = One Blueprint (Evolutionary)

The relationship between a Project and a Blueprint is a strict 1:1 link with automated version history.

**Key Rules:**
- No manual "Save Version" button - every accepted AI modification creates a snapshot automatically
- Projects are the primary container and ownership root
- Blueprints are the single "living" document reflecting current product vision state
- History is preserved via subcollection snapshots, not multiple blueprint documents

### Data Flow Architecture

```
User Input (Chat)
       ↓
[Intent Detection]
       ↓
   ┌───┴───┐
   │  LLM  │
   └───┬───┘
       ↓
[Response + Blueprint Update]
       ↓
   ┌───┴───────────────┐
   │ Auto-Snapshot     │ ← Creates history entry
   │ (if blueprint     │
   │  was modified)    │
   └───────────────────┘
       ↓
[Update Live Blueprint]
       ↓
Return to Client
```

**Key Data Flow Rules:**
- **Infinite Chat:** Messages in subcollection avoids 1MB document limit
- **Fast Home View:** Project list loads without downloading chat history
- **Automated Versioning:** Every blueprint update triggers automatic snapshot
- **Inherited Sharing:** Project access grants access to messages and blueprint

---

## Phase 1: Firebase Schema Implementation

**Priority:** CRITICAL
**Duration:** 2-3 days

### Collection Structure

```
projects (Collection)
├── {projectId} (Document)
│   ├── id: string (Auto-ID)
│   ├── userId: string (Owner's Firebase UID)
│   ├── name: string (e.g., "E-commerce App")
│   ├── lastMessage: string (Preview for Command Center)
│   ├── createdAt: Timestamp
│   ├── updatedAt: Timestamp
│   │
│   └── messages (Subcollection)
│       └── {messageId} (Document)
│           ├── role: 'user' | 'assistant'
│           ├── content: string
│           ├── proposedChanges: Object (Optional)
│           ├── intent: 'initial' | 'discussion' | 'proposal'
│           └── timestamp: Timestamp

blueprints (Collection)
├── {blueprintId} (Document)
│   ├── id: string (Auto-ID)
│   ├── projectId: string (Foreign Key → projects)
│   ├── content: Object (Live UBP JSON - 10 sections)
│   ├── updatedAt: Timestamp
│   │
│   └── history (Subcollection)
│       └── {snapshotId} (Document)
│           ├── contentSnapshot: Object (Frozen UBP state)
│           ├── triggeringMessageId: string (Link to causative message)
│           ├── version: string (e.g., "1.0", "1.1")
│           └── timestamp: Timestamp
```

### Phase 1 Deliverables

| Task | Description | Files |
|------|-------------|-------|
| 1.1 | Create TypeScript schema definitions | `lib/firebase/schema.ts` |
| 1.2 | Create collection helper functions | `lib/firebase/collections.ts` |
| 1.3 | Implement Firestore security rules | `firestore.rules` |

---

## Phase 2: API Routes

**Priority:** HIGH
**Duration:** 2-3 days
**Dependency:** Phase 1 complete

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List user's projects (fast, no chat history) |
| `/api/projects` | POST | Create new project |
| `/api/projects/[id]` | GET | Get project + messages + blueprint |
| `/api/projects/[id]` | DELETE | Delete project and all related data |
| `/api/projects/[id]/messages` | GET | Fetch messages with pagination |
| `/api/projects/[id]/messages` | POST | Add message to subcollection |
| `/api/generate` | POST | Generate AI response with auto-versioning |
| `/api/blueprints/[id]/history` | GET | Fetch blueprint version history |

### Auto-Versioning Logic

When the AI generates a response with `intent: 'proposal'` or `intent: 'initial'`:

1. If no blueprint exists → Create new blueprint
2. If blueprint exists and content changed:
   - Create snapshot in `history` subcollection
   - Update live blueprint `content`
   - Set `updatedAt` timestamp

### Phase 2 Deliverables

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Create projects list API | `api/projects/route.ts` |
| 2.2 | Create single project API | `api/projects/[projectId]/route.ts` |
| 2.3 | Create messages API | `api/projects/[projectId]/messages/route.ts` |
| 2.4 | Create generate API with auto-versioning | `api/generate/route.ts` |
| 2.5 | Create blueprint history API | `api/blueprints/[blueprintId]/history/route.ts` |

---

## Phase 3: Command Center Home View

**Priority:** HIGH
**Duration:** 3-4 days
**Dependency:** Phase 1 & 2 complete

### Design Specifications

The home view is a high-impact "Command Center" based on `homeView.html`.

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌─────────────────────────────────────────┐   │
│ │          │  │                                         │   │
│ │ Sidebar  │  │         Main Content Area               │   │
│ │          │  │                                         │   │
│ │ - Logo   │  │  "What's the vision today, {name}?"     │   │
│ │ - New    │  │                                         │   │
│ │ - Menu   │  │  ┌─────────────────────────────────┐    │   │
│ │ - Recent │  │  │     Vision Input (Textarea)     │    │   │
│ │          │  │  └─────────────────────────────────┘    │   │
│ │          │  │                                         │   │
│ │          │  │  [Quick Actions: SaaS | DB | API]       │   │
│ │          │  │                                         │   │
│ ├──────────┤  ├─────────────────────────────────────────┤   │
│ │ Settings │  │  Jump Back In (Recent Projects Grid)    │   │
│ │ Logout   │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐            │   │
│ │ Profile  │  │  │Card│ │Card│ │Card│ │Card│            │   │
│ └──────────┘  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Visual Design Requirements

| Element | Specification |
|---------|---------------|
| Background | Premium dark (`#020204`) with gradient overlays |
| Glass Panels | `backdrop-filter: blur(16px)` with subtle borders |
| Primary Accent | Cyan (`#06b6d4`) to Violet (`#8b5cf6`) gradients |
| Typography | Inter font, bold headings, secondary text `#94a3b8` |
| Animations | Fade-in-up on load, hover lift on cards |
| Input Glow | Violet glow on focus |

### Component Structure

```
app/src/components/home/
├── Sidebar.tsx          # Navigation, logo, recent projects, user profile
├── CommandCenter.tsx    # Main content wrapper
├── VisionInput.tsx      # Primary textarea with glow effect
├── QuickActions.tsx     # Template buttons (SaaS, DB, API)
├── RecentProjects.tsx   # "Jump Back In" section
└── ProjectCard.tsx      # Individual project card
```

### User Flow

1. User lands on Command Center (`/`)
2. User types vision in central input or clicks Quick Action
3. System creates new project with name derived from input
4. User redirected to `/chat/{projectId}?initial={message}`
5. Chat page detects `initial` param and auto-sends first message
6. AI generates initial blueprint

### Phase 3 Deliverables

| Task | Description | Files |
|------|-------------|-------|
| 3.1 | Create Sidebar component | `components/home/Sidebar.tsx` |
| 3.2 | Create CommandCenter component | `components/home/CommandCenter.tsx` |
| 3.3 | Create VisionInput component | `components/home/VisionInput.tsx` |
| 3.4 | Create QuickActions component | `components/home/QuickActions.tsx` |
| 3.5 | Create RecentProjects component | `components/home/RecentProjects.tsx` |
| 3.6 | Create ProjectCard component | `components/home/ProjectCard.tsx` |
| 3.7 | Create root page | `app/page.tsx` |
| 3.8 | Add premium styles | `app/globals.css` |
| 3.9 | Update Tailwind config | `tailwind.config.ts` |

---

## Phase 4: Chat Interface

**Priority:** HIGH
**Duration:** 2-3 days
**Dependency:** Phase 2 complete

### Chat Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│ │          │  │                  │  │                  │   │
│ │ Sidebar  │  │   Chat Panel     │  │  Blueprint       │   │
│ │          │  │                  │  │  Viewer          │   │
│ │          │  │  - Messages      │  │                  │   │
│ │          │  │  - Input         │  │  - 9 Sections    │   │
│ │          │  │  - Streaming     │  │  - Edit Modals   │   │
│ │          │  │                  │  │  - History       │   │
│ │          │  │                  │  │                  │   │
│ └──────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4 Deliverables

| Task | Description | Files |
|------|-------------|-------|
| 4.1 | Create chat page layout | `app/chat/[projectId]/page.tsx` |
| 4.2 | Create ChatPanel component | `components/chat/ChatPanel.tsx` |
| 4.3 | Create MessageList component | `components/chat/MessageList.tsx` |
| 4.4 | Create ChatInput component | `components/chat/ChatInput.tsx` |
| 4.5 | Create BlueprintViewer component | `components/blueprint/BlueprintViewer.tsx` |
| 4.6 | Create section edit modals | `components/blueprint/EditModals.tsx` |
| 4.7 | Create history viewer | `components/blueprint/HistoryViewer.tsx` |

---

## Phase 5: Testing & Deployment

**Priority:** CRITICAL
**Duration:** 2-3 days

### Test Scenarios

**Firebase Collections:**
- [x] `createProject` creates document and returns ID
- [x] `addMessage` creates message in subcollection
- [x] `updateBlueprint` creates history snapshot before update
- [x] `getBlueprintHistory` returns snapshots in descending order

**API Routes:**
- [ ] `POST /api/generate` with initial intent creates blueprint
- [ ] `POST /api/generate` with proposal intent updates and versions
- [ ] `GET /api/projects` returns projects without chat history
- [ ] `GET /api/projects/[id]` returns project + messages + blueprint

**Command Center:**
- [ ] Vision input creates project and redirects to chat
- [ ] Quick actions work correctly
- [ ] Recent projects display and link correctly
- [ ] Sidebar navigation functions properly

### Pre-Deployment Checklist

- [ ] All tests passing
- [x] Security rules deployed and tested
- [ ] Environment variables configured
- [ ] Monitoring alerts configured

### Deployment Sequence

| Step | Action |
|------|--------|
| 1 | Deploy Firestore security rules |
| 2 | Deploy API routes (Vercel) |
| 3 | Deploy frontend (Vercel) |
| 4 | Smoke test critical flows |
| 5 | Monitor for 1 hour |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Home page load time | <1.5s | Lighthouse |
| Project list load | <500ms | API latency |
| Message subcollection read | <200ms | Firestore metrics |
| Blueprint history access | <300ms | Firestore metrics |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Security rules too restrictive | HIGH | Test all flows with emulator |
| Performance degradation | MEDIUM | Monitor queries, add indexes |
| User confusion with new UI | MEDIUM | Clear onboarding, tooltips |

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Firebase Schema | 2-3 days | None |
| Phase 2: API Routes | 2-3 days | Phase 1 |
| Phase 3: Command Center | 3-4 days | Phase 1 & 2 |
| Phase 4: Chat Interface | 2-3 days | Phase 2 |
| Phase 5: Testing & Deploy | 2-3 days | All phases |
| **Total** | **11-16 days** | |

---

## Appendix: UBP Content Structure

The Blueprint `content` field contains the 10-section UBP structure:

| Section | Description |
|---------|-------------|
| metadata | Product name, version, status (draft/locked/approved) |
| productVision | Problem, target actor, success signal |
| scope | In scope, out of scope, deferred items |
| actors | Primary, secondary, and system actors |
| behaviors | 5-8 key behaviors with Mermaid diagrams |
| constraints | Constraints, assumptions, risks |
| techDecisions | Frontend, backend, database choices with rationale |
| phases | 2-4 implementation phases with goals |
| integrations | External services and their purposes |
| changelog | Version history with summaries |

---

*Document Version: 1.0*
*Created: February 1, 2026*
*Author: Flowro Engineering*
