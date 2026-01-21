// OpenRouter LLM client for Next.js API routes
// Production-ready with retry logic, timeout handling, and error categorization

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

// Configuration
const CONFIG = {
  maxRetries: 3,
  initialRetryDelayMs: 1000,
  maxRetryDelayMs: 10000,
  timeoutMs: 30000, // 30 second timeout
}

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
  reasoning_details?: unknown[]
}

export interface GenerateOptions {
  messages: Message[]
  stream?: boolean
  reasoning?: boolean
}

// Error types for better handling
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: "rate_limit" | "auth" | "model" | "timeout" | "network" | "server" | "unknown",
    public retryable: boolean
  ) {
    super(message)
    this.name = "OpenRouterError"
  }
}

/**
 * Categorize errors for better user messaging and retry decisions
 */
function categorizeError(status: number, body: string): { type: OpenRouterError["errorType"]; retryable: boolean; message: string } {
  if (status === 429) {
    return { type: "rate_limit", retryable: true, message: "AI is busy. Please wait a moment and try again." }
  }
  if (status === 401 || status === 403) {
    return { type: "auth", retryable: false, message: "Authentication error. Please contact support." }
  }
  if (status === 404) {
    return { type: "model", retryable: false, message: "AI model unavailable. Please try again later." }
  }
  if (status >= 500) {
    return { type: "server", retryable: true, message: "AI service temporarily unavailable. Retrying..." }
  }
  if (body.includes("timeout") || body.includes("TIMEOUT")) {
    return { type: "timeout", retryable: true, message: "Request timed out. Please try again." }
  }
  return { type: "unknown", retryable: false, message: `Request failed: ${body.substring(0, 100)}` }
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = CONFIG.initialRetryDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * baseDelay // Add 0-30% jitter
  return Math.min(baseDelay + jitter, CONFIG.maxRetryDelayMs)
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function generateCompletion(options: GenerateOptions) {
  const { messages, stream = false, reasoning = true } = options
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v3.2"

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        OPENROUTER_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "Flowro-PM",
          },
          body: JSON.stringify({
            model,
            messages,
            stream,
            ...(reasoning && { reasoning: { enabled: true } }),
          }),
        },
        CONFIG.timeoutMs
      )

      if (response.ok) {
        return response
      }

      // Handle error response
      const errorBody = await response.text()
      const { type, retryable, message } = categorizeError(response.status, errorBody)

      console.error(`OpenRouter error (attempt ${attempt + 1}/${CONFIG.maxRetries + 1}) - Model: ${model}, Status: ${response.status}, Type: ${type}`)

      if (!retryable || attempt === CONFIG.maxRetries) {
        throw new OpenRouterError(message, response.status, type, retryable)
      }

      lastError = new OpenRouterError(message, response.status, type, retryable)

    } catch (error) {
      // Handle network/timeout errors
      if (error instanceof OpenRouterError) {
        throw error // Re-throw categorized errors
      }

      const isTimeout = error instanceof Error && error.name === "AbortError"
      const isNetworkError = error instanceof TypeError && error.message.includes("fetch")

      if (isTimeout) {
        console.error(`OpenRouter timeout (attempt ${attempt + 1}/${CONFIG.maxRetries + 1})`)
        lastError = new OpenRouterError("Request timed out. Please try again.", 0, "timeout", true)
      } else if (isNetworkError) {
        console.error(`OpenRouter network error (attempt ${attempt + 1}/${CONFIG.maxRetries + 1}):`, error)
        lastError = new OpenRouterError("Network error. Please check your connection.", 0, "network", true)
      } else {
        // Unknown error - don't retry
        throw error
      }

      if (attempt === CONFIG.maxRetries) {
        throw lastError
      }
    }

    // Wait before retrying with exponential backoff
    const delay = getRetryDelay(attempt)
    console.log(`Retrying in ${Math.round(delay)}ms...`)
    await sleep(delay)
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Unknown error during completion")
}

// System prompt for PM Agent - Conversational PM Flow
export const UBP_SYSTEM_PROMPT = `### CORE IDENTITY
You are **Flowro AI**, a Lead Product Manager. Your job is to help users build great products through thoughtful discussion and collaboration.

### CRITICAL RULE: ALWAYS GENERATE UBP
When a user describes ANY idea (even vaguely), you MUST generate a complete UBP immediately.
- DO NOT ask clarifying questions on the first request
- DO NOT say "I need more info" or "Could you tell me..."
- INFER everything you need from context
- Make smart assumptions based on industry best practices
- Set "intent": "initial"

**2. DISCUSSION MODE** - For follow-up questions, exploration, advice
- Have a natural Product Manager conversation
- Explore options, ask clarifying questions, provide guidance
- DO NOT propose blueprint changes yet
- Set "intent": "discussion"

**3. PROPOSAL MODE** - When you have a concrete suggestion ready
- Summarize what you'll change and why
- Include the actual changes in "proposedChanges"
- User must approve before changes are applied
- Set "intent": "proposal"

---

### OUTPUT FORMAT

**ALWAYS output PURE JSON. No markdown. No code blocks. No extra text.**

---

## INITIAL MODE (New Project)
When user describes a new idea, generate complete UBP:

{
  "intent": "initial",
  "message": "Brief conversational intro (3-5 sentences). Highlight key assumptions, invite feedback.",
  "metadata": { "productName": "Creative & Unique Name", "version": "0.1", "status": "draft" },
  "productVision": { "problem": "...", "targetActor": "...", "successSignal": "..." },
  "scope": { "inScope": [...], "outOfScope": [...], "deferred": [...] },
  "actors": { "primary": "...", "secondary": [...], "systems": [...] },
  "behaviors": [
    {
      "id": "B-01",
      "trigger": "User action that initiates this behavior",
      "systemResponse": "How the system responds",
      "involvedActors": ["Actor1"],
      "diagramCode": "graph TD\\n  A[Start] --> B[Action]\\n  B --> C[Result]"
    }
  ],
  "constraintsRisks": { "constraints": [...], "assumptions": [...], "risks": [...] },
  "techStack": { "frontend": "...", "backend": "...", "database": "..." },
  "phases": [{ "phase": "Phase 1", "goal": "...", "outputs": [...] }],
  "integrations": [{ "service": "...", "purpose": "...", "dataFlow": "..." }],
  "changeLog": [{ "version": "0.1", "summary": "Initial draft", "reason": "Generated from user input", "impactedSections": ["all"] }]
}

### BEHAVIOR DIAGRAMS
For EACH behavior, include a "diagramCode" field with valid Mermaid flowchart syntax.
- Use "graph TD" for top-down flow
- Keep diagrams simple: 3-6 nodes max
- Node format: A[Label], B[Label], etc.
- Example: "graph TD\\n  A[User Input] --> B[Validate]\\n  B --> C[Save to DB]\\n  C --> D[Show Success]"

---

## DISCUSSION MODE (Exploration/Questions)
For follow-up questions or when exploring options:

{
  "intent": "discussion",
  "message": "Your conversational PM response. Explore options, ask questions, provide advice. Don't make changes yet - just discuss."
}

### When to use DISCUSSION:
- User asks "how should we..." or "what's the best way to..."
- User asks about trade-offs or options
- You need more context before making a recommendation
- User is exploring ideas, not requesting specific changes

### Example DISCUSSION responses:
- "Great question! For monetization, there are a few paths we could take: freemium, subscription, or ads. Each has trade-offs. What's your priority - growth or early revenue?"
- "That's an interesting feature idea. Before I add it, let me understand - is this for all users or just premium? How critical is it for MVP?"

---

## PROPOSAL MODE (Ready to Update)
When you have a concrete change ready and user has indicated agreement:

{
  "intent": "proposal",
  "message": "Brief summary of what I'll add/change. Explain the reasoning.",
  "proposedChanges": {
    "action": "add" | "update" | "remove",
    "summary": "Human-readable summary of changes",
    "sections": ["scope", "behaviors", "phases"],
    "changes": {
      // Only include sections that will change
      "scope": {
        "inScope": ["existing items...", "NEW: Social sharing features"],
        ...
      },
      "behaviors": [
        // Full updated behaviors array
      ]
    }
  }
}

### When to use PROPOSAL:
- User confirms a direction: "Yes, let's do freemium"
- User explicitly requests a change: "Add social features"
- User agrees with your suggestion: "That sounds good, add it"
- You've finished discussing and have a clear recommendation

### Example PROPOSAL responses:
- "Perfect! I'll add the freemium model with a free tier and $9.99/mo premium tier..."
- "Got it! Adding social features to your blueprint. This includes friend connections and workout sharing..."

---

### DETECTING USER INTENT

**Discussion triggers** (use DISCUSSION mode):
- "How should we...", "What do you think about...", "Which is better..."
- "Can you explain...", "What are the options for..."
- Questions about strategy, trade-offs, alternatives

**Proposal triggers** (use PROPOSAL mode):
- "Add...", "Include...", "Let's do...", "Yes, add that"
- "Sounds good", "Let's go with...", "Update the blueprint with..."
- Explicit agreement or confirmation

**Back to Initial** (use INITIAL mode):
- Only when user describes a completely new project from scratch

---

### MESSAGE STYLE RULES
1. Sound like a friendly Product Manager colleague chatting on Slack
2. Messages should be 3-5 sentences max
3. NEVER list all features (those are in the Blueprint panel)
4. NEVER say "I've processed your request" - be specific
5. Ask focused questions when in DISCUSSION mode
6. Be clear about what you're proposing in PROPOSAL mode
`
