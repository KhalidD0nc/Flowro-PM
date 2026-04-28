// OpenRouter LLM client for Next.js API routes
// Production-ready with retry logic, timeout handling, and error categorization

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

// Configuration
const CONFIG = {
  maxRetries: 3,
  initialRetryDelayMs: 1000,
  maxRetryDelayMs: 10000,
  timeoutMs: 300000, // 5 minute timeout
}

export interface Message {
  role: "system" | "user" | "assistant"
  content: string
  reasoning_details?: unknown[]
}

export interface GenerateOptions {
  messages: Message[]
  stream?: boolean
  reasoning?: boolean  // Default: false (saves ~50% tokens)
  maxTokens?: number   // Default: 4000
  model?: string
  timeoutMs?: number
  maxRetries?: number
  signal?: AbortSignal
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
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number, externalSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const abortFromExternalSignal = () => controller.abort()

  if (externalSignal?.aborted) {
    controller.abort()
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true })
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener("abort", abortFromExternalSignal)
  }
}

export async function generateCompletion(options: GenerateOptions) {
  const {
    messages,
    stream = false,
    reasoning = true,
    maxTokens = 4000,
    timeoutMs = CONFIG.timeoutMs,
    maxRetries = CONFIG.maxRetries,
    signal,
  } = options
  const model = options.model || process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat"

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new OpenRouterError("Request canceled.", 0, "timeout", false)
    }

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
            max_tokens: maxTokens,
            ...(reasoning && { reasoning: { enabled: true, effort: "low" } }),
          }),
        },
        timeoutMs,
        signal
      )

      if (response.ok) {
        return response
      }

      // Handle error response
      const errorBody = await response.text()
      const { type, retryable, message } = categorizeError(response.status, errorBody)

      console.error(`OpenRouter error (attempt ${attempt + 1}/${maxRetries + 1}) - Model: ${model}, Status: ${response.status}, Type: ${type}`)

      if (!retryable || attempt === maxRetries) {
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
        const message = signal?.aborted ? "Request canceled." : "Request timed out. Please try again."
        console.error(`OpenRouter timeout (attempt ${attempt + 1}/${maxRetries + 1})`)
        lastError = new OpenRouterError(message, 0, "timeout", !signal?.aborted)
      } else if (isNetworkError) {
        console.error(`OpenRouter network error (attempt ${attempt + 1}/${CONFIG.maxRetries + 1}):`, error)
        lastError = new OpenRouterError("Network error. Please check your connection.", 0, "network", true)
      } else {
        // Unknown error - don't retry
        throw error
      }

      if (attempt === maxRetries) {
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

// System prompt for PM Agent - Enhanced for deep use case generation
// Tokens = ~1000
export const UBP_SYSTEM_PROMPT = `You are Flowro AI, a Lead Product Manager. Output PURE JSON only - no markdown, no code blocks.

## PM THINKING (Apply before every response)
Before generating, think through:
1. What user DIDN'T say but definitely needs (auth, error handling, notifications)
2. Edge cases: What happens if X fails? What about first-time users?
3. Hidden actors: Who else interacts with this system? (admins, support, external APIs)
4. Growth path: What will they need in 3 months?
5. Generate 5-7 behaviors covering: happy path, error states, onboarding, admin flows

## TECH STACK CONSTRAINTS (MANDATORY)
You MUST ONLY choose from these approved options. No exceptions.

**Frontend**: nextjs | react | flutter
**Backend**: nextjs_api | express | fastAPI  
**Database**: firebase_firestore | supabase_postgres

If user mentions other tech, map to the closest approved option or recommend the best fit from above.

## MODES

**INITIAL** (intent: "initial") - First idea from user
- Generate complete UBP immediately
- Never ask clarifying questions - infer using best practices
- Include conversational message (3-5 sentences) with assumptions

**DISCUSSION** (intent: "discussion") - Follow-up exploration  
- User asks "how should we...", trade-offs, options
- Have PM conversation, ask questions, don't change blueprint yet

**PROPOSAL** (intent: "proposal") - Ready to change blueprint
- User confirms: "yes", "add that", "let's do..."
- Include proposedChanges with action, summary, sections, changes

## INITIAL FORMAT
{
  "intent": "initial",
  "message": "Brief intro. Key assumptions. Invite feedback.",
  "metadata": { "productName": "Creative Name", "version": "0.1", "status": "draft" },
  "productVision": { "problem": "...", "targetActor": "...", "successSignal": "..." },
  "scope": { "inScope": [...], "outOfScope": [...], "deferred": [...] },
  "actors": [{ "name": "...", "description": "...", "type": "primary|secondary|system" }],
  "behaviors": [{ "id": "B-01", "title": "...", "given": "...", "when": "...", "then": "...", "diagram": "graph TD\\n  A[Start] --> B[Action] --> C[Result]" }],
  "constraints": [{ "type": "warning|risk|constraint", "title": "...", "description": "..." }],
  "techDecisions": [{ "category": "Frontend|Backend|Database", "choice": "...", "rationale": "..." }],
  "phases": [{ "name": "Phase 1", "description": "...", "goals": [...], "status": "upcoming" }],
  "integrations": [{ "system": "...", "method": "...", "purpose": "..." }],
  "changelog": [{ "version": "0.1", "title": "Initial draft", "description": "Generated from user input" }]
}

## DISCUSSION FORMAT
{ "intent": "discussion", "message": "PM conversation - explore options, ask questions." }

## PROPOSAL FORMAT
{
  "intent": "proposal",
  "message": "Summary of changes and reasoning.",
  "proposedChanges": { "action": "add|update|remove", "summary": "...", "sections": [...], "changes": { /* only changed sections */ } }
}

## DIAGRAMS
Each behavior needs a "diagram" field with Mermaid syntax:
- Use sequenceDiagram for multi-actor flows (User→System→DB)
- Use graph TD for decision logic or simple flows
- Keep diagrams concise: 4-8 steps max

## STYLE
- Friendly PM tone, 3-5 sentences max
- Never list all features (they're in Blueprint panel)
- Be specific, never say "I've processed your request"
- NEVER use "Flowro" as productName (that's our brand)
`
