# Flowro PM Agent Enhancement Roadmap

> **Goal:** Transform the current agent into a high-performance, cost-efficient PM assistant  
> **Timeline:** 6-8 weeks across 3 phases  
> **Current Rating:** 7.2/10 → **Target:** 9.0/10

---

## Executive Summary

| Metric | Current | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Context Window | 5 messages | 10+ messages | Unlimited (summarized) | Semantic retrieval |
| Response Quality | Raw text | Formatted markdown | Structured + validated | Personalized |
| Cost per Request | ~$0.02 | ~$0.015 | ~$0.01 | ~$0.008 |
| Latency (P50) | ~3s | ~2.5s | ~2s | ~1.5s |
| Error Rate | ~5% | ~2% | <1% | <0.5% |

---

## Phase 1: Foundation Hardening

### 1.1 Message Formatting System

**Problem:** LLM returns poorly formatted text with inline lists and no structure.

**Solution:** Add post-processing + prompt improvements.

```typescript
// NEW FILE: lib/messageFormatter.ts

export function formatMessage(raw: string): string {
    if (!raw) return raw
    
    return raw
        // Fix inline numbered lists: "1) item 2) item" → proper list
        .replace(/(\s)(\d+)\)\s+/g, '\n$2. ')
        // Fix "1:" or "1." inline patterns  
        .replace(/(\s)(\d+)[:.]\s+(?=[A-Z])/g, '\n$2. ')
        // Convert **Option A:** patterns to headers
        .replace(/\*\*([^*]+):\*\*/g, '\n\n**$1:**')
        // Fix bullet points
        .replace(/\s+-\s+(?=[A-Z])/g, '\n- ')
        // Ensure paragraph separation
        .replace(/([.!?])\s{2,}(?=[A-Z])/g, '$1\n\n')
        // Clean up
        .replace(/^\n+/, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

export function formatAsTable(data: Record<string, string>[]): string {
    if (!data.length) return ''
    const headers = Object.keys(data[0])
    const headerRow = `| ${headers.join(' | ')} |`
    const separator = `| ${headers.map(() => '---').join(' | ')} |`
    const rows = data.map(row => `| ${headers.map(h => row[h]).join(' | ')} |`)
    return [headerRow, separator, ...rows].join('\n')
}
```

**Files to modify:**
- `app/src/app/api/generate/service.ts` - Apply formatter to message output
- `app/src/lib/openrouter.ts` - Add formatting rules to system prompt

### 1.2 Extended Context Window

**Problem:** Only 5 messages retained, losing critical project context.

**Solution:** Implement sliding window with topic extraction.

```typescript
// NEW FILE: lib/contextBuilder.ts

interface ContextWindow {
    recentMessages: Message[]      // Last 8 messages (full content)
    topicSummary: string           // Compressed summary of older messages
    blueprintContext: string       // Relevant UBP sections only
}

export function buildOptimizedContext(
    messages: ChatMessage[],
    blueprint: UBP | null,
    currentQuery: string
): ContextWindow {
    const recent = messages.slice(-8)
    
    // Summarize older messages into topics
    const older = messages.slice(0, -8)
    const topicSummary = older.length > 0 
        ? extractTopics(older)
        : ''
    
    // Only include relevant UBP sections
    const blueprintContext = blueprint
        ? selectRelevantSections(blueprint, currentQuery)
        : ''
    
    return { recentMessages: recent, topicSummary, blueprintContext }
}

function extractTopics(messages: ChatMessage[]): string {
    // Extract key topics discussed (auth, payments, features, etc.)
    const topics = new Set<string>()
    const keywords = ['auth', 'payment', 'user', 'api', 'database', 'feature', 'integration']
    
    for (const msg of messages) {
        for (const kw of keywords) {
            if (msg.content.toLowerCase().includes(kw)) {
                topics.add(kw)
            }
        }
    }
    
    return `Previous discussion covered: ${[...topics].join(', ')}`
}

function selectRelevantSections(ubp: UBP, query: string): string {
    // Instead of full JSON dump, select relevant sections
    const queryLower = query.toLowerCase()
    const sections: string[] = []
    
    if (queryLower.includes('tech') || queryLower.includes('stack')) {
        sections.push(`Tech Stack: ${JSON.stringify(ubp.techStack)}`)
    }
    if (queryLower.includes('user') || queryLower.includes('actor')) {
        sections.push(`Actors: ${JSON.stringify(ubp.actors)}`)
    }
    if (queryLower.includes('feature') || queryLower.includes('behavior')) {
        sections.push(`Behaviors: ${JSON.stringify(ubp.behaviors)}`)
    }
    // Always include vision for context
    sections.push(`Vision: ${JSON.stringify(ubp.productVision)}`)
    
    return sections.join('\n')
}
```

**Token savings:** ~40% reduction by not sending full blueprint every time

### 1.3 Response Validation with Zod

**Problem:** LLM outputs are unpredictable, causing runtime errors.

**Solution:** Validate all responses before returning.

```typescript
// NEW FILE: lib/responseValidator.ts

import { z } from 'zod'

export const UBPResponseSchema = z.object({
    intent: z.enum(['initial', 'discussion', 'proposal']),
    message: z.string().min(10).max(2000),
    metadata: z.object({
        productName: z.string().min(2).max(100),
        version: z.string().default('0.1'),
        status: z.enum(['draft', 'locked', 'approved']).default('draft'),
    }).optional(),
    productVision: z.object({
        problem: z.string(),
        targetActor: z.string(),
        successSignal: z.string(),
    }).optional(),
    // ... rest of UBP schema
})

export const DiscussionResponseSchema = z.object({
    intent: z.literal('discussion'),
    message: z.string().min(10).max(2000),
})

export const ProposalResponseSchema = z.object({
    intent: z.literal('proposal'),
    message: z.string().min(10).max(1000),
    proposedChanges: z.object({
        action: z.enum(['add', 'update', 'remove']),
        summary: z.string(),
        sections: z.array(z.string()),
        changes: z.record(z.unknown()),
    }),
})

export function validateResponse(parsed: unknown, expectedIntent?: string) {
    if (expectedIntent === 'discussion') {
        return DiscussionResponseSchema.safeParse(parsed)
    }
    if (expectedIntent === 'proposal') {
        return ProposalResponseSchema.safeParse(parsed)
    }
    return UBPResponseSchema.safeParse(parsed)
}
```

### 1.4 Cleanup Tasks

| Task | Action | Impact |
|------|--------|--------|
| Delete `langchain.ts.bak` | Remove dead code | Reduce confusion |
| Consolidate debug logs | Replace `console.log` with structured logger | Better observability |
| Add request IDs | Track requests end-to-end | Debug production issues |

---

## Phase 2: LangChain Integration 

### 2.1 LangChain Architecture

**Why LangChain now:**
- Structured output guarantees with `withStructuredOutput()`
- Prompt templates with variables
- Built-in retry and fallback chains
- Foundation for RAG in Phase 3

```typescript
// NEW FILE: lib/langchain/client.ts

import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { z } from "zod"

// Model configuration (uses your existing OpenRouter setup)
export function createModel(options?: { temperature?: number; maxTokens?: number }) {
    return new ChatOpenAI({
        modelName: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4000,
        configuration: {
            baseURL: "https://openrouter.ai/api/v1",
            defaultHeaders: {
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "Flowro-PM",
            },
        },
        apiKey: process.env.OPENROUTER_API_KEY,
    })
}

// Structured output for guaranteed schema compliance
export function createStructuredModel<T extends z.ZodType>(schema: T) {
    const model = createModel()
    return model.withStructuredOutput(schema)
}
```

### 2.2 Intent-Specific Chains

**Problem:** Single prompt handles all intents (inefficient).

**Solution:** Specialized chains per intent.

```typescript
// NEW FILE: lib/langchain/chains.ts

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { createStructuredModel } from "./client"
import { UBPResponseSchema, DiscussionResponseSchema, ProposalResponseSchema } from "../responseValidator"

// Chain for initial UBP generation
export const initialChain = ChatPromptTemplate.fromMessages([
    ["system", INITIAL_SYSTEM_PROMPT],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
]).pipe(createStructuredModel(UBPResponseSchema))

// Chain for discussions (lighter, faster)
export const discussionChain = ChatPromptTemplate.fromMessages([
    ["system", DISCUSSION_SYSTEM_PROMPT],
    ["system", "Current blueprint context:\n{blueprintContext}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
]).pipe(createStructuredModel(DiscussionResponseSchema))

// Chain for proposals
export const proposalChain = ChatPromptTemplate.fromMessages([
    ["system", PROPOSAL_SYSTEM_PROMPT],
    ["system", "Current blueprint:\n{blueprint}"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"],
]).pipe(createStructuredModel(ProposalResponseSchema))
```

### 2.3 Specialized Prompts

```typescript
// NEW FILE: lib/langchain/prompts.ts

export const INITIAL_SYSTEM_PROMPT = `You are Flowro AI, a Lead Product Manager creating Unified Blueprints.

## YOUR ROLE
Transform vague ideas into structured, actionable product blueprints.

## PM THINKING PROCESS
Before responding, consider:
1. What the user DIDN'T say but definitely needs (auth, error handling, notifications)
2. Edge cases: What if X fails? First-time user experience?
3. Hidden actors: Admins, support team, external APIs
4. Growth path: What will they need in 3 months?

## OUTPUT REQUIREMENTS
- Generate 5-7 behaviors covering: happy path, errors, onboarding, admin flows
- Use approved tech stack only: nextjs/react/flutter, nextjs_api/express/fastAPI, firebase_firestore/supabase_postgres
- Create Mermaid diagrams for each behavior

## MESSAGE FORMAT
Use proper markdown:
- Line breaks between paragraphs
- Numbered lists (1. 2. 3.) for sequences
- Bullet points for options
- **Bold** for emphasis
- Tables for comparisons`

export const DISCUSSION_SYSTEM_PROMPT = `You are Flowro AI, a PM consultant having a conversation.

## YOUR ROLE
Help the user think through product decisions without making changes yet.

## CONVERSATION STYLE
- Ask clarifying questions
- Present trade-offs clearly
- Suggest options with pros/cons
- Keep responses concise (3-5 sentences typical)

## MESSAGE FORMAT
Use proper markdown formatting:
- Numbered lists for options
- Tables for comparisons
- **Bold** key terms`

export const PROPOSAL_SYSTEM_PROMPT = `You are Flowro AI, proposing specific changes to a blueprint.

## YOUR ROLE
The user has confirmed they want changes. Generate a clear proposal.

## PROPOSAL REQUIREMENTS
- Summarize what's changing in 1-2 sentences
- List affected sections
- Provide the exact changes in correct UBP format

## MESSAGE FORMAT
Brief and action-oriented. Focus on the change, not explanation.`
```

### 2.4 Intent Detection Improvement

```typescript
// NEW FILE: lib/langchain/intentDetector.ts

type Intent = 'initial' | 'discussion' | 'proposal'

const PROPOSAL_KEYWORDS = [
    'yes', 'add that', "let's do", 'sounds good', 'go ahead',
    'make that change', 'update it', 'include that', 'approved',
    'do it', 'perfect', 'exactly', 'that works'
]

const DISCUSSION_KEYWORDS = [
    'how should', 'what about', 'trade-off', 'options',
    'thoughts on', 'compare', 'difference between', 'pros and cons',
    'should we', 'which is better', 'what do you think', 'help me'
]

export function detectIntent(
    message: string,
    hasBlueprint: boolean,
    lastAssistantMessage?: string
): Intent {
    const lowerMsg = message.toLowerCase()
    
    // Check for proposal (user confirming previous suggestion)
    if (hasBlueprint && lastAssistantMessage) {
        for (const keyword of PROPOSAL_KEYWORDS) {
            if (lowerMsg.includes(keyword)) {
                return 'proposal'
            }
        }
    }
    
    // Check for discussion
    for (const keyword of DISCUSSION_KEYWORDS) {
        if (lowerMsg.includes(keyword)) {
            return 'discussion'
        }
    }
    
    // No blueprint = initial generation
    if (!hasBlueprint) {
        return 'initial'
    }
    
    // Default to discussion for follow-ups
    return 'discussion'
}
```

### 2.5 Cost Optimization

| Optimization | Implementation | Savings |
|--------------|----------------|---------|
| **Model routing** | Use cheaper model for discussions | 30% |
| **Prompt caching** | Cache system prompts | 15% |
| **Token budgeting** | Set max tokens per intent | 20% |
| **Selective context** | Only relevant UBP sections | 40% |

```typescript
// Model routing based on intent
function selectModel(intent: Intent): string {
    switch (intent) {
        case 'initial':
            // Full capability model for blueprint generation
            return 'deepseek/deepseek-chat'
        case 'discussion':
            // Lighter model for conversations
            return 'deepseek/deepseek-chat' // or cheaper alternative
        case 'proposal':
            // Medium capability for proposals
            return 'deepseek/deepseek-chat'
    }
}

// Token budget per intent
function getMaxTokens(intent: Intent): number {
    switch (intent) {
        case 'initial': return 4000   // Full UBP generation
        case 'discussion': return 500  // Short responses
        case 'proposal': return 1500   // Medium complexity
    }
}
```

---

## Phase 3: Intelligence Layer 

### 3.1 Memory Compression System

**Problem:** Long conversations lose context beyond the sliding window.

**Solution:** Summarize and compress older messages.

```typescript
// NEW FILE: lib/memory/compressor.ts

interface CompressedMemory {
    summary: string           // 100-200 token summary
    keyDecisions: string[]    // Major decisions made
    openQuestions: string[]   // Unresolved topics
    lastUpdated: Date
}

export async function compressConversation(
    messages: ChatMessage[],
    existingMemory?: CompressedMemory
): Promise<CompressedMemory> {
    // Use LLM to summarize conversation
    const summaryPrompt = `Summarize this conversation in 2-3 sentences.
Focus on: decisions made, features discussed, open questions.

Conversation:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Previous context: ${existingMemory?.summary || 'None'}

Output JSON: { "summary": "...", "keyDecisions": [...], "openQuestions": [...] }`

    const response = await generateCompletion({
        messages: [{ role: 'user', content: summaryPrompt }],
        stream: false,
        maxTokens: 300
    })
    
    // Parse and return compressed memory
    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
}
```

### 3.2 RAG Foundation (Vector Store)

**Purpose:** Enable cross-project learning and PM knowledge retrieval.

```typescript
// NEW FILE: lib/rag/vectorStore.ts

import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { OpenAIEmbeddings } from "@langchain/openai"

// Store successful blueprints for pattern learning
interface BlueprintPattern {
    id: string
    category: string        // 'saas', 'marketplace', 'mobile-app', etc.
    techStack: string
    behaviors: string[]     // Behavior patterns
    embedding: number[]     // Vector representation
}

// Store PM knowledge base
interface PMKnowledge {
    id: string
    topic: string           // 'authentication', 'payments', 'onboarding'
    content: string         // Best practices, patterns
    source: string          // 'internal', 'docs', 'approved-blueprint'
    embedding: number[]
}

export async function searchSimilarPatterns(
    query: string,
    category?: string
): Promise<BlueprintPattern[]> {
    // Use vector similarity to find relevant patterns
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { client: supabase, tableName: 'blueprint_patterns' }
    )
    
    const results = await vectorStore.similaritySearch(query, 3)
    return results.map(r => r.metadata as BlueprintPattern)
}

export async function enrichWithKnowledge(
    query: string,
    topic: string
): Promise<string> {
    // Retrieve relevant PM knowledge
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { client: supabase, tableName: 'pm_knowledge' }
    )
    
    const results = await vectorStore.similaritySearch(
        `${topic}: ${query}`,
        2
    )
    
    return results.map(r => r.pageContent).join('\n\n')
}
```

### 3.3 Multi-Agent Architecture

**Future state:** Specialized agents for different tasks.

```
┌─────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                            │
│  Routes requests to specialized agents based on intent       │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ DISCOVERY│  │ VALIDATOR│  │ PROPOSER │  │ LAUNCHER │
    │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
    
    Discovery: Explores ideas, asks questions, gathers requirements
    Validator: Checks feasibility, identifies risks, validates tech stack
    Proposer: Generates specific changes to blueprint
    Launcher: Creates actionable tasks from approved blueprint
```

### 3.4 Learning System

**Capture patterns from successful blueprints:**

```typescript
// NEW FILE: lib/learning/patternExtractor.ts

export async function learnFromApprovedBlueprint(
    blueprint: UBP,
    projectCategory: string
): Promise<void> {
    // Extract patterns from approved blueprint
    const patterns = {
        techStack: `${blueprint.techStack.frontend}/${blueprint.techStack.backend}/${blueprint.techStack.database}`,
        behaviorPatterns: blueprint.behaviors.map(b => ({
            trigger: b.trigger,
            response: b.systemResponse,
        })),
        scopePatterns: {
            typical: blueprint.scope.inScope.length,
            deferred: blueprint.scope.deferred.length,
        },
        integrationPatterns: blueprint.integrations.map(i => i.service),
    }
    
    // Generate embedding and store
    const embedding = await generateEmbedding(JSON.stringify(patterns))
    
    await storePattern({
        id: `pattern-${blueprint.metadata.productName}`,
        category: projectCategory,
        patterns,
        embedding,
    })
}
```

---

## Implementation Timeline

```
Week 1  ──────────────────────────────────────────────────────►
        │ Message Formatter │ Context Builder │ Zod Validation │

Week 2  ──────────────────────────────────────────────────────►
        │ Cleanup Dead Code │ Structured Logging │ Testing     │

Week 3  ──────────────────────────────────────────────────────►
        │ LangChain Setup │ Intent Chains │ Specialized Prompts│

Week 4  ──────────────────────────────────────────────────────►
        │ Model Routing │ Cost Optimization │ Token Budgeting  │

Week 5  ──────────────────────────────────────────────────────►
        │ Memory Compression │ Conversation Summarization      │

Week 6  ──────────────────────────────────────────────────────►
        │ Vector Store Setup │ Embedding Pipeline              │

Week 7  ──────────────────────────────────────────────────────►
        │ RAG Integration │ Pattern Retrieval                  │

Week 8  ──────────────────────────────────────────────────────►
        │ Multi-Agent Foundation │ Learning System             │
```

---

## Success Metrics

### Phase 1 Completion Criteria
- [ ] All messages properly formatted with markdown
- [ ] Context window extended to 10+ messages
- [ ] Zero validation errors from Zod schemas
- [ ] `langchain.ts.bak` deleted

### Phase 2 Completion Criteria
- [ ] LangChain chains working for all 3 intents
- [ ] 30%+ cost reduction from model routing
- [ ] <2% error rate on responses
- [ ] Specialized prompts A/B tested

### Phase 3 Completion Criteria
- [ ] Memory compression working for 50+ message conversations
- [ ] Vector store populated with 100+ patterns
- [ ] RAG retrieval improving response quality measurably
- [ ] Foundation for multi-agent architecture in place

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LangChain complexity | Keep OpenRouter fallback, migrate incrementally |
| Cost overrun from embeddings | Use batch processing, cache embeddings |
| Vector store latency | Async retrieval, don't block on RAG |
| Breaking changes | Feature flags for all new capabilities |

---

## Files to Create/Modify

### New Files (Phase 1)
- `lib/messageFormatter.ts`
- `lib/contextBuilder.ts`
- `lib/responseValidator.ts`

### New Files (Phase 2)
- `lib/langchain/client.ts`
- `lib/langchain/chains.ts`
- `lib/langchain/prompts.ts`
- `lib/langchain/intentDetector.ts`

### New Files (Phase 3)
- `lib/memory/compressor.ts`
- `lib/rag/vectorStore.ts`
- `lib/learning/patternExtractor.ts`

### Modified Files
- `app/src/app/api/generate/service.ts` - Integrate new systems
- `app/src/lib/openrouter.ts` - Add formatting to prompts
- `app/src/app/api/generate/route.ts` - Use new context builder

### Deleted Files
- `lib/langchain.ts.bak` - Remove after extracting useful code

---

## Budget Estimate

| Phase | Engineering Hours | LLM Costs (Testing) | Infrastructure |
|-------|-------------------|---------------------|----------------|
| Phase 1 | 20h | $10 | $0 |
| Phase 2 | 40h | $30 | $0 |
| Phase 3 | 60h | $50 | $20/mo (Supabase vectors) |
| **Total** | **120h** | **$90** | **$20/mo** |

---

*Document Version: 1.0*  
*Created: January 31, 2026*  
*Author: Flowro Engineering*
