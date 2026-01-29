# Flowro AI: 2-Phase Production Enhancement Plan

**Status**: 🚀 Production Launch Tomorrow
**Timeline**: Phase 1 (Today), Phase 2 (Post-Launch)
**Priority**: Stability & Security Over Features
**Created**: January 28, 2026

---

## Current State Assessment

### ✅ What Works
- Rate limiting implemented (20 req/min per user)
- Basic input validation (message length)
- OpenRouter error handling with retries
- Firebase auth & Firestore integration
- Chat history persistence

### ❌ Critical Issues
- **No SSE streaming** (30-second wait with spinner kills trust - UX-CRITICAL)
- **No tech stack validation** (agent can suggest ANY technology)
- **Two parallel AI implementations** (langchain.ts vs service.ts - confusion)
- **No token counting** (unknown costs per request)
- **No structured logging** (only console.log)
- **Missing PII protection** (sensitive data in blueprints)
- **No backup/DR strategy** for locked blueprints
- **No cost controls** (potential bill shock)

## Phase 1: Production Hardening (🔥 TODAY - Must Complete Before Launch)

### P1-0: SSE Streaming Implementation (UX-CRITICAL)
**Priority**: 🔥🔥🔥 CRITICAL (Launch Blocking)
**Time**: 4 hours (Hybrid: Basic today, polish tomorrow)
**Files to Modify**:
- `app/src/lib/stream.ts` (CREATE)
- `app/src/app/api/generate/stream/route.ts` (CREATE)
- `app/src/app/chat/[projectId]/page.tsx` (MODIFY)

**Implementation - Today (P1-0A)**:
```typescript
// 1. Create stream helper (app/src/lib/stream.ts)
export interface StreamChunk {
  type: "chunk" | "done" | "error"
  content?: string
  rawContent?: string
  error?: string
}

export async function* generateStream(messages: Message[]): AsyncGenerator<StreamChunk> {
  const response = await generateCompletion({ messages, stream: true })
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let accumulated = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    // Parse SSE format and yield chunks
    // Accumulate full content for parsing
  }

  yield { type: "done", rawContent: accumulated }
}
```

```typescript
// 2. Create streaming API route (app/src/app/api/generate/stream/route.ts)
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthToken(request)
  // ... auth checks ...

  const stream = new ReadableStream({
    async start(controller) {
      const generator = generateStream(messages)
      for await (const chunk of generator) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        if (chunk.type === "done" || chunk.type === "error") {
          controller.close()
          break
        }
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  })
}
```

```typescript
// 3. Update frontend (app/src/app/chat/[projectId]/page.tsx)
const [streamedContent, setStreamedContent] = useState("")
const [isStreaming, setIsStreaming] = useState(false)

// Replace fetch with streaming
const res = await fetch("/api/generate/stream", {
  method: "POST",
  body: JSON.stringify({ messages })
})

const reader = res.body?.getReader()
while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
  for (const line of lines) {
    const parsed: StreamChunk = JSON.parse(line.slice(6))
    if (parsed.type === "chunk") {
      accumulated += parsed.content || ""
      setStreamedContent(accumulated) // Real-time update
    }
  }
}
```

**Implementation - Tomorrow (P1-0B - Post-Launch Polish)**:
- Real-time UBP viewer rendering during stream
- Typing animation cursor
- Progress indicator for JSON parsing
- Error handling & fallback to non-streaming

**Success Criteria (Today)**:
- ✅ Chunks arrive in real-time (<500ms between chunks)
- ✅ User sees text appearing progressively
- ✅ Errors handled gracefully (fallback to spinner)
- ✅ Saved to backend after complete

**Success Criteria (Tomorrow)**:
- ✅ UBP preview renders during streaming
- ✅ Smooth typing animation
- ✅ 0% of users see spinner >3 seconds

**Testing (Today)**:
- Verify chunks arrive in real-time
- Test network failure handling
- Confirm saved to backend correctly
- Check mobile compatibility

---

### P1-1: Tech Stack Validation Enforcement
**Priority**: 🔥 CRITICAL
**Time**: 2 hours
**Files to Modify**:
- `app/src/lib/validateTechStack.ts` (CREATE)
- `app/src/app/api/generate/service.ts` (MODIFY)
- `app/src/lib/openrouter.ts` (MODIFY - UBP_SYSTEM_PROMPT)

**Implementation**:

1. Create validation module with strict enums:
```typescript
export const FRONTEND_OPTIONS = [
  "nextjs", "react", "vue", "svelte", "flutter"
] as const

export const BACKEND_OPTIONS = [
  "nextjs_api", "express", "fastify", "bun_serve", "supabase_edge"
] as const

export const DATABASE_OPTIONS = [
  "firebase_firestore", "supabase_postgres", "neon_postgres",
  "turso_sqlite", "planet_scale_mysql"
] as const

export const TechStackSchema = z.object({
  frontend: z.enum(FRONTEND_OPTIONS),
  backend: z.enum(BACKEND_OPTIONS),
  database: z.enum(DATABASE_OPTIONS),
})
```

2. Add validation to service.ts after parsing LLM response
3. Update system prompt with constraints
4. Fallback to safe defaults if invalid (nextjs + nextjs_api + firebase_firestore)

**Success Criteria**:
- Agent can only choose from 5 options per category
- Invalid choices auto-fallback to defaults
- Validation logged for monitoring

---

### P1-2: Enhanced Error Handling & Observability
**Priority**: 🔥 CRITICAL
**Time**: 1.5 hours
**Files to Modify**:
- `app/src/lib/logger.ts` (CREATE)
- `app/src/app/api/generate/route.ts` (MODIFY)
- `app/src/app/api/tasks/generate/route.ts` (MODIFY)
- `app/src/app/api/admin/logs/route.ts` (CREATE)

**Implementation**:

1. Create structured logger with rotation:
```typescript
type LogLevel = "info" | "warn" | "error" | "debug"

export function log(options: {
  level: LogLevel
  action: string
  userId?: string
  details?: Record<string, unknown>
})
```

2. Integrate logging in generate route:
   - Log: generate_request, llm_call_start, generate_success, generate_failed
   - Include userId, projectId, intent, response length

3. Create admin endpoint for viewing logs

**Success Criteria**:
- All LLM calls logged with metadata
- Errors tracked with user context
- Admin endpoint operational
- Log rotation prevents memory leaks

---

### P1-3: Security Hardening (Input Sanitization & PII Protection)
**Priority**: 🔥 CRITICAL
**Time**: 1 hour
**Files to Modify**:
- `app/src/lib/sanitize.ts` (MODIFY - enhance existing)
- `app/src/app/api/generate/route.ts` (MODIFY)

**Implementation**:

1. Enhance sanitization functions:
   - Remove script tags
   - Remove dangerous HTML attributes (onclick, javascript:)
   - Remove SQL injection patterns

2. Add PII detection and redaction:
   ```typescript
   export function detectPII(input: string): { hasPII: boolean; types: string[] }
   export function redactPII(input: string): string
   ```

3. Apply sanitization in route before LLM call

**Success Criteria**:
- All user inputs sanitized
- PII detected and redacted
- Injection attempts blocked
- No data loss from sanitization

---

### P1-4: Token Counting & Cost Controls
**Priority**: 🔥 HIGH
**Time**: 1.5 hours
**Files to Modify**:
- `app/src/lib/tokenCounter.ts` (CREATE)
- `app/src/app/api/generate/route.ts` (MODIFY)

**Implementation**:

1. Create token estimator:
```typescript
export function estimateTokens(text: string): number
export function estimateMessageTokens(messages): number
export function estimateCost(tokens: number, model: string)
```

2. Track costs per user with daily limit ($5/user/day):
```typescript
const COST_LIMIT = {
  maxDailyCost: 5.00,
  costStore: new Map<string, { total: number; resetTime: number }>()
}
```

3. Log cost estimates before each LLM call

**Success Criteria**:
- Token estimation before each LLM call
- Cost tracking per user
- Daily cost limit enforced ($5/user)
- Logged for monitoring

---

### P1-5: Clean Up Unused Code (Consolidate AI Layer)
**Priority**: 🔶 MEDIUM
**Time**: 30 minutes
**Files to Modify**:
- `app/src/lib/langchain.ts` (ARCHIVE/DELETE)

**Implementation**:

1. Verify service.ts is production implementation
2. Archive unused langchain.ts (474 lines)
3. Update documentation
4. Test that no imports are broken

**Why**: service.ts (384 lines) is used in production, langchain.ts is unused

**Success Criteria**:
- langchain.ts removed from production
- No broken imports
- Bundle size reduced (~50KB)

---

## Phase 1 Summary

**Total Time**: 10.5 hours
**Risk Level**: LOW (all changes are additive, no breaking changes)

**Checklist**:
- [ ] **SSE Streaming** (P1-0) - 4 hours - UX-CRITICAL
- [ ] Tech stack validation (5 options per category)
- [ ] Structured logging with admin endpoint
- [ ] Input sanitization + PII redaction
- [ ] Token counting + $5 daily limit
- [ ] Remove unused langchain.ts
- [ ] Test all changes locally
- [ ] Deploy to staging
- [ ] Smoke test with real user flow

---

## Phase 2: Post-Launch Enhancement (Week 1-2)

### P2-1: RAG Layer & Knowledge Base
**Priority**: 🔶 MEDIUM
**Time**: 8 hours

**Implementation**:
- Setup vector store (Pinecone or Supabase)
- Pre-populate with 50+ patterns
- Integrate similar patterns into system prompt

**Impact**: Smarter, more consistent blueprints

---

### P2-2: Memory Compression for Long Conversations
**Priority**: 🔶 MEDIUM
**Time**: 6 hours

**Implementation**:
- Add conversation summarization endpoint
- Auto-compress history when > 10 messages
- Maintain context while reducing token usage

**Impact**: Maintain context, reduce costs by 30%

---

### P2-3: Advanced Analytics & Monitoring
**Priority**: 🔷 LOW
**Time**: 4 hours

**Implementation**:
- Track blueprint generation metrics
- Create admin dashboard
- Monitor popular tech stacks, generation times

**Impact**: Better insights, optimization

---

## Rollout Plan

### Today (Phase 1)
- **Morning (6h)**: Implement P1-0 (Streaming - UX-CRITICAL)
  - Create stream helper (1h)
  - Create streaming API route (1h)
  - Update frontend to consume stream (2h)
  - Basic UI display (1h)
- **Afternoon (2.5h)**: Implement P1-4, P1-5 (Cost controls, cleanup)
- **Evening (2h)**: Test & deploy to staging
- **Night**: Smoke test & monitor

### Tomorrow (Launch)
- Deploy to production
- Monitor for 1 hour
- Fix any critical issues

### Week 1-2 (Phase 2)
- Implement RAG layer
- Add memory compression
- Build analytics dashboard

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucinates invalid tech | High | Validation with fallback to defaults |
| User hits cost limit | Medium | Clear error message, daily reset |
| PII in blueprints | High | Redaction before LLM, warn user |
| Logs fill memory | Low | Auto-rotate every 1000 entries |
| Token counting inaccurate | Low | Rough estimate OK for MVP |
| Code cleanup breaks imports | Medium | Test before deleting files |

---

## Success Metrics

### Phase 1 (Tomorrow)
- ✅ Real-time streaming responses (chunk delivery <500ms)
- ✅ Zero users see spinner >3 seconds
- ✅ Zero production errors from invalid tech stacks
- ✅ All LLM calls logged and tracked
- ✅ No PII leaks in blueprints
- ✅ Daily costs stay within budget ($5/user)
- ✅ 99%+ uptime on launch day

### Phase 2 (2 weeks)
- ✅ 20% faster blueprint generation (from RAG)
- ✅ 30% lower token usage (from compression)
- ✅ Positive user feedback on blueprint quality
- ✅ Clear insights from analytics dashboard

---

## Technical Decisions & Rationale

### Why SSE Streaming is Launch-Critical?
- User expectation: Streaming is now standard (ChatGPT, Claude)
- Trust building: 30-second spinner kills trust even when working perfectly
- Progress feedback: Real-time text reduces perceived wait time by 60%
- Competitive edge: Modern AI tools must stream or lose users
- Hybrid approach: Basic streaming today, polish tomorrow balances speed vs quality

### Why Strict Tech Stack Constraints?
- Eliminates confusion for users
- Ensures predictable deployments
- Reduces support burden
- Prevents agent hallucinations

### Why Fallback to Defaults?
- No user disruption during production
- Logged for monitoring and improvement
- Can notify user post-generation

### Why $5 Daily Limit?
- Covers typical usage (10-15 blueprints)
- Prevents bill shock
- Can be adjusted post-launch

### Why Remove langchain.ts?
- service.ts is production implementation
- Maintains single source of truth
- Reduces bundle size and confusion

---

## Files to Modify

### New Files to Create:
- `app/src/lib/stream.ts` - SSE streaming helper for real-time LLM responses
- `app/src/app/api/generate/stream/route.ts` - Streaming API endpoint
- `app/src/lib/validateTechStack.ts` - Tech stack validation with enums
- `app/src/lib/logger.ts` - Structured logging system
- `app/src/lib/tokenCounter.ts` - Token and cost estimation
- `app/src/app/api/admin/logs/route.ts` - Admin log viewing

### Files to Modify:
- `app/src/app/api/generate/service.ts` - Add validation, logging
- `app/src/app/api/generate/route.ts` - Add sanitization, cost tracking
- `app/src/lib/openrouter.ts` - Update system prompts with tech constraints
- `app/src/lib/sanitize.ts` - Enhance with PII detection

### Files to Archive:
- `app/src/lib/langchain.ts` - Unused LangChain implementation

---

## User Preferences & Constraints

- **Strict tech stack enforcement**: Agent MUST only choose from approved options
- **Minimal categories**: Only Frontend, Backend, Database (3 categories)
- **No exceptions**: No hybrid or suggestion mode - strict only
- **5 options per category**: Provides flexibility while maintaining control
- **Production deadline**: Tomorrow - Phase 1 must complete today

---

## Key Technical Decisions

1. **Tech Stack Selection**: User approved "Strict - Approved Only" approach
2. **Fallback Strategy**: Auto-fallback to defaults instead of rejecting (better UX)
3. **Cost Limit**: $5/user/day to prevent bill shock
4. **Code Consolidation**: Remove unused langchain.ts to eliminate confusion
5. **Logging Approach**: In-memory with rotation (1000 entries) for MVP simplicity

---

## Important Notes

- All Phase 1 changes are ADDITIVE - no breaking changes
- Focus on stability and security over new features
- Test each component before deploying
- Monitor logs closely after launch
- Phase 2 can be implemented post-launch without deadline pressure
