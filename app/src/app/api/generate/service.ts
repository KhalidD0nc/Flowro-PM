import { generateCompletion, UBP_SYSTEM_PROMPT, Message } from "@/lib/openrouter"
import { validateTechStack, getSafeDefaults, FRONTEND_OPTIONS, BACKEND_OPTIONS, DATABASE_OPTIONS } from "@/lib/validateTechStack"
import { logInfo, logWarn } from "@/lib/logger"

// Types
interface ChatMessage {
    role: string
    content: string
    timestamp?: string
}

export type Intent = 'initial' | 'discussion' | 'proposal'

export interface ProposedChanges {
    action: 'add' | 'update' | 'remove'
    summary: string
    sections: string[]
    changes: Record<string, unknown>
}

export interface GenerateInput {
    message: string
    context?: ChatMessage[]  // Chat history array
    currentBlueprint?: unknown  // Current blueprint content if exists
}

export interface GenerateResult {
    intent: Intent
    message: string
    content: unknown  // Full UBP content for initial, null for discussion/proposal
    proposedChanges?: ProposedChanges
    rawContent: string
    productName?: string // New field for extracted project name
}

/**
 * Normalize UBP field names and structures from AI output to match schema.
 * Handles backward compatibility for old AI output formats.
 *
 * Transformations:
 * - constraintsRisks (object) → constraints (array with type field)
 * - changeLog → changelog (with field mapping)
 * - actors (old format) → actors (array with type field)
 */
export function normalizeUBPFields(ubpContent: Record<string, unknown>): void {
    // Transform constraintsRisks → constraints
    if (ubpContent.constraintsRisks && !ubpContent.constraints) {
        const cr = ubpContent.constraintsRisks as Record<string, unknown[]>
        const constraints: Array<{ type: string; title: string; description: string }> = []

        // Flatten the nested structure into a typed array
        if (Array.isArray(cr.constraints)) {
            cr.constraints.forEach((item) => {
                if (typeof item === 'string') {
                    constraints.push({ type: 'constraint', title: item, description: '' })
                } else if (typeof item === 'object' && item !== null) {
                    const obj = item as Record<string, unknown>
                    constraints.push({
                        type: 'constraint',
                        title: (obj.title as string) || (obj.name as string) || String(item),
                        description: (obj.description as string) || ''
                    })
                }
            })
        }
        if (Array.isArray(cr.risks)) {
            cr.risks.forEach((item) => {
                if (typeof item === 'string') {
                    constraints.push({ type: 'risk', title: item, description: '' })
                } else if (typeof item === 'object' && item !== null) {
                    const obj = item as Record<string, unknown>
                    constraints.push({
                        type: 'risk',
                        title: (obj.title as string) || (obj.name as string) || String(item),
                        description: (obj.description as string) || ''
                    })
                }
            })
        }
        if (Array.isArray(cr.assumptions)) {
            cr.assumptions.forEach((item) => {
                if (typeof item === 'string') {
                    constraints.push({ type: 'warning', title: item, description: '' })
                } else if (typeof item === 'object' && item !== null) {
                    const obj = item as Record<string, unknown>
                    constraints.push({
                        type: 'warning',
                        title: (obj.title as string) || (obj.name as string) || String(item),
                        description: (obj.description as string) || ''
                    })
                }
            })
        }

        ubpContent.constraints = constraints
        delete ubpContent.constraintsRisks
    }

    // Transform changeLog → changelog (case sensitivity)
    if (ubpContent.changeLog && !ubpContent.changelog) {
        const oldLog = ubpContent.changeLog as Array<Record<string, unknown>>
        if (Array.isArray(oldLog)) {
            ubpContent.changelog = oldLog.map((entry) => ({
                version: (entry.version as string) || '0.1',
                title: (entry.title as string) || (entry.summary as string) || 'Update',
                description: (entry.description as string) || (entry.reason as string) || '',
                timestamp: (entry.timestamp as string) || new Date().toISOString()
            }))
        }
        delete ubpContent.changeLog
    }

    // Transform old actors format (object) → new format (array)
    if (ubpContent.actors && typeof ubpContent.actors === 'object' && !Array.isArray(ubpContent.actors)) {
        const oldActors = ubpContent.actors as Record<string, unknown>
        const actors: Array<{ name: string; description: string; type: string }> = []

        // Handle primary actor
        if (oldActors.primary) {
            if (typeof oldActors.primary === 'string') {
                actors.push({ name: oldActors.primary, description: 'Primary user', type: 'primary' })
            }
        }
        // Handle secondary actors
        if (Array.isArray(oldActors.secondary)) {
            oldActors.secondary.forEach((actor) => {
                if (typeof actor === 'string') {
                    actors.push({ name: actor, description: '', type: 'secondary' })
                } else if (typeof actor === 'object' && actor !== null) {
                    const obj = actor as Record<string, unknown>
                    actors.push({
                        name: (obj.name as string) || String(actor),
                        description: (obj.description as string) || '',
                        type: 'secondary'
                    })
                }
            })
        }
        // Handle system actors
        if (Array.isArray(oldActors.systems)) {
            oldActors.systems.forEach((system) => {
                if (typeof system === 'string') {
                    actors.push({ name: system, description: '', type: 'system' })
                } else if (typeof system === 'object' && system !== null) {
                    const obj = system as Record<string, unknown>
                    actors.push({
                        name: (obj.name as string) || String(system),
                        description: (obj.description as string) || '',
                        type: 'system'
                    })
                }
            })
        }

        ubpContent.actors = actors
    }

    // Transform behaviors to ensure correct field names
    if (Array.isArray(ubpContent.behaviors)) {
        ubpContent.behaviors = (ubpContent.behaviors as Array<Record<string, unknown>>).map((behavior) => ({
            id: (behavior.id as string) || `B-${Math.random().toString(36).substr(2, 4)}`,
            title: (behavior.title as string) || (behavior.trigger as string) || 'Behavior',
            given: (behavior.given as string) || '',
            when: (behavior.when as string) || (behavior.trigger as string) || '',
            then: (behavior.then as string) || (behavior.systemResponse as string) || '',
            diagram: (behavior.diagram as string) || (behavior.diagramCode as string) || '',
            priority: (behavior.priority as string) || 'medium'
        }))
    }

    // Transform phases to ensure correct field names
    if (Array.isArray(ubpContent.phases)) {
        ubpContent.phases = (ubpContent.phases as Array<Record<string, unknown>>).map((phase) => ({
            name: (phase.name as string) || (phase.phase as string) || 'Phase',
            description: (phase.description as string) || (phase.goal as string) || '',
            goals: (phase.goals as string[]) || (phase.outputs as string[]) || [],
            status: (phase.status as string) || 'upcoming',
            timeline: (phase.timeline as string) || ''
        }))
    }

    // Transform integrations to ensure correct field names
    if (Array.isArray(ubpContent.integrations)) {
        ubpContent.integrations = (ubpContent.integrations as Array<Record<string, unknown>>).map((integration) => ({
            system: (integration.system as string) || (integration.service as string) || '',
            method: (integration.method as string) || (integration.dataFlow as string) || '',
            purpose: (integration.purpose as string) || ''
        }))
    }

    // Transform techStack (object) → techDecisions (array) if not already in array format
    if (ubpContent.techStack && typeof ubpContent.techStack === 'object' && !Array.isArray(ubpContent.techStack) && !ubpContent.techDecisions) {
        const ts = ubpContent.techStack as Record<string, string>
        const techDecisions: Array<{ category: string; choice: string; rationale: string }> = []

        if (ts.frontend) {
            techDecisions.push({ category: 'Frontend', choice: ts.frontend, rationale: 'Selected based on project requirements' })
        }
        if (ts.backend) {
            techDecisions.push({ category: 'Backend', choice: ts.backend, rationale: 'Selected based on project requirements' })
        }
        if (ts.database) {
            techDecisions.push({ category: 'Database', choice: ts.database, rationale: 'Selected based on project requirements' })
        }

        if (techDecisions.length > 0) {
            ubpContent.techDecisions = techDecisions
        }
        // Keep techStack for backward compatibility with validation code
    }
}

/**
 * Builds the messages array for the LLM request
 * Includes full conversation history for context
 */
export function buildMessages(input: GenerateInput): Message[] {
    const { message, context, currentBlueprint } = input

    const messages: Message[] = [
        { role: "system", content: UBP_SYSTEM_PROMPT },
    ]

    // If we have a current blueprint, add it as context
    if (currentBlueprint) {
        messages.push({
            role: "system",
            content: `### CURRENT BLUEPRINT\n${JSON.stringify(currentBlueprint)}`
        })
    }

    // Add conversation history (last 5 messages - optimized for cost)
    if (context && Array.isArray(context)) {
        const recentHistory = context.slice(-5)
        for (const msg of recentHistory) {
            if (msg.role === "user" || msg.role === "assistant") {
                messages.push({
                    role: msg.role as "user" | "assistant",
                    content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
                })
            }
        }
    }

    // Add the current user message
    messages.push({
        role: "user",
        content: message,
    })

    return messages
}

/**
 * Extracts JSON from markdown code blocks if present
 * Handles responses like "Here's the blueprint: ```json {...} ```"
 */
function extractJSONFromMarkdown(content: string): { json: unknown; textParts: string[] } | null {
    // Match ```json ... ``` or ``` ... ``` code blocks
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g
    const matches = [...content.matchAll(jsonBlockRegex)]

    for (const match of matches) {
        try {
            const json = JSON.parse(match[1].trim())
            // Check if this looks like a UBP (has key fields)
            if (json.productVision || json.scope || json.behaviors || json.message) {
                // Get text before and after the JSON block
                const beforeBlock = content.substring(0, match.index).trim()
                const afterBlock = content.substring((match.index || 0) + match[0].length).trim()
                return {
                    json,
                    textParts: [beforeBlock, afterBlock].filter(Boolean)
                }
            }
        } catch {
            // Not valid JSON, continue searching
        }
    }
    return null
}

/**
 * Calls the LLM and returns the parsed response with intent detection
 */
export async function callLLM(messages: Message[]): Promise<GenerateResult> {
    const response = await generateCompletion({ messages, stream: false })
    const data = await response.json()

    // DEBUG: Log key response info
    console.log("=== LLM Response Debug ===")
    console.log("Model used:", process.env.OPENROUTER_MODEL || "xiaomi/mimo-v2-flash:free")

    const choice = data.choices?.[0]?.message
    if (!choice) {
        console.error("No choice in response:", data)
        throw new Error("No response from LLM")
    }

    // Some models (like xiaomi/mimo-v2-flash) put content in the reasoning field
    // Check for content in this order: content -> reasoning -> reasoning_details[0].text
    const rawContent = (() => {
        if (choice.content) return choice.content
        if (choice.reasoning) {
            console.log("📥 Content was empty, using reasoning field instead")
            return choice.reasoning
        }
        if (choice.reasoning_details?.[0]?.text) {
            console.log("📥 Content was empty, using reasoning_details[0].text instead")
            return choice.reasoning_details[0].text
        }
        return ""
    })()

    console.log("Raw content length:", rawContent.length)
    console.log("Raw content preview:", rawContent.substring(0, 300))

    let parsed: Record<string, unknown> = {}

    // First, try to parse as pure JSON
    try {
        parsed = JSON.parse(rawContent)
        console.log("✅ Parsed as pure JSON")
    } catch {
        console.log("❌ Not pure JSON, checking for embedded JSON...")
        // Not pure JSON - check if JSON is embedded in markdown
        const extracted = extractJSONFromMarkdown(rawContent)

        if (extracted) {
            console.log("✅ Found embedded JSON in markdown")
            parsed = extracted.json as Record<string, unknown>

            // Combine surrounding text into the message if needed
            const surroundingText = extracted.textParts.join('\n\n').trim()
            if (surroundingText && !parsed.message) {
                parsed.message = surroundingText
            }
        } else {
            // Fallback: Try to find { ... } block blindly
            const firstOpen = rawContent.indexOf('{')
            const lastClose = rawContent.lastIndexOf('}')

            let foundJson = false
            if (firstOpen !== -1 && lastClose > firstOpen) {
                const candidate = rawContent.substring(firstOpen, lastClose + 1)
                try {
                    parsed = JSON.parse(candidate)
                    console.log("✅ Found JSON block via brute force extraction")
                    foundJson = true

                    // Keep text outside if message is missing
                    if (!parsed.message) {
                        const before = rawContent.substring(0, firstOpen).trim()
                        const after = rawContent.substring(lastClose + 1).trim()
                        const surrounding = [before, after].filter(Boolean).join('\n\n')
                        if (surrounding) {
                            parsed.message = surrounding
                        }
                    }
                } catch {
                    console.log("❌ Brute force extraction failed")
                }
            }

            if (!foundJson) {
                console.log("⚠️ Falling back to discussion mode (plain text)")
                // Plain text response - treat as discussion
                parsed = {
                    intent: 'discussion',
                    message: rawContent
                }
            }
        }
    }

    // Extract intent with fallback logic
    let intent: Intent = 'initial'
    if (parsed.intent === 'discussion' || parsed.intent === 'proposal' || parsed.intent === 'initial') {
        intent = parsed.intent as Intent
    } else {
        // Legacy response without intent field - detect based on content
        if (parsed.productVision || parsed.scope || parsed.behaviors) {
            intent = 'initial'  // Has UBP content = initial
        } else if (parsed.proposedChanges) {
            intent = 'proposal'  // Has proposed changes = proposal
        } else {
            intent = 'discussion'  // Just a message = discussion
        }
    }

    // Extract message
    const message = typeof parsed.message === 'string'
        ? parsed.message
        : '🎯 Check out your Blueprint for the details!'

    // Extract proposedChanges if present
    let proposedChanges: ProposedChanges | undefined
    if (parsed.proposedChanges && typeof parsed.proposedChanges === 'object') {
        const pc = parsed.proposedChanges as Record<string, unknown>
        proposedChanges = {
            action: (pc.action as 'add' | 'update' | 'remove') || 'update',
            summary: (pc.summary as string) || 'Blueprint update',
            sections: (pc.sections as string[]) || [],
            changes: (pc.changes as Record<string, unknown>) || {}
        }
    }

    // For initial intent, content is the full UBP (everything except message/intent/proposedChanges)
    let content: unknown = null
    if (intent === 'initial') {
        // Remove meta fields, keep UBP content
        const { intent: _i, message: _m, proposedChanges: _pc, ...ubpContent } = parsed

        // Normalize field names to match schema (handle old AI output formats)
        normalizeUBPFields(ubpContent)

        // Validate and correct tech stack if present
        if (ubpContent.techStack && typeof ubpContent.techStack === 'object') {
            const techStackValidation = validateTechStack(ubpContent.techStack)

            if (!techStackValidation.valid) {
                // Log the violation and apply safe defaults
                logWarn("tech_stack_invalid", {
                    original: ubpContent.techStack,
                    error: techStackValidation.error,
                    fallback: getSafeDefaults()
                })

                // Replace with safe defaults
                const defaults = getSafeDefaults()
                ubpContent.techStack = defaults

                // Also update techDecisions to match
                ubpContent.techDecisions = [
                    { category: 'Frontend', choice: defaults.frontend, rationale: 'Safe default' },
                    { category: 'Backend', choice: defaults.backend, rationale: 'Safe default' },
                    { category: 'Database', choice: defaults.database, rationale: 'Safe default' }
                ]

                console.warn("⚠️ Tech stack validation failed - using safe defaults")
            } else {
                logInfo("tech_stack_valid", { techStack: techStackValidation.data })
                // Update techDecisions from validated tech stack
                const ts = ubpContent.techStack as { frontend: string; backend: string; database: string }
                ubpContent.techDecisions = [
                    { category: 'Frontend', choice: ts.frontend, rationale: 'Selected based on project requirements' },
                    { category: 'Backend', choice: ts.backend, rationale: 'Selected based on project requirements' },
                    { category: 'Database', choice: ts.database, rationale: 'Selected based on project requirements' }
                ]
            }
        } else {
            // No tech stack provided - add safe defaults
            const defaults = getSafeDefaults()
            logInfo("tech_stack_missing", { fallback: defaults })
            ubpContent.techStack = defaults
            ubpContent.techDecisions = [
                { category: 'Frontend', choice: defaults.frontend, rationale: 'Safe default' },
                { category: 'Backend', choice: defaults.backend, rationale: 'Safe default' },
                { category: 'Database', choice: defaults.database, rationale: 'Safe default' }
            ]
        }

        content = ubpContent
    }

    // Extract productName from UBP content if available
    let extractedProductName: string | undefined
    if (parsed.metadata && typeof parsed.metadata === 'object') {
        extractedProductName = (parsed.metadata as Record<string, string>).productName
    }

    console.log("=== Parsed Response ===")
    console.log("Intent:", intent)
    console.log("Message preview:", message.substring(0, 100))
    console.log("Has proposedChanges:", !!proposedChanges)
    console.log("Has UBP content:", !!content)
    console.log("Extracted Name:", extractedProductName)
    console.log("=== End LLM Debug ===")

    return {
        intent,
        message,
        content,
        proposedChanges,
        rawContent,
        productName: extractedProductName,
    }
}


/**
 * Generates a completion from the LLM
 */
export async function generateFromMessage(input: GenerateInput): Promise<GenerateResult> {
    const messages = buildMessages(input)
    return callLLM(messages)
}

// =============================================================================
// Launch Plan Generation
// =============================================================================

export interface LaunchPlanTask {
    title: string
    description: string
    category: "feature" | "marketing" | "operations"
    priority: "low" | "medium" | "high" | "critical"
    phase: string
}

export interface LaunchPlanResult {
    summary: string
    tasks: LaunchPlanTask[]
}

const LAUNCH_PLAN_PROMPT = `You are a product manager creating a launch plan. Given a product blueprint (UBP), generate HIGH-VALUE DELIVERABLES that track real outcomes.

## CORE PRINCIPLES
1. Each task = ONE VERIFIABLE OUTCOME the user can see or do
2. Bundle related work (auth + onboarding = 1 task, not 3)
3. NO technical implementation details - focus on WHAT, not HOW
4. Plain language anyone can understand (no framework names, no API jargon)
5. Every task answers: "What can the user do now that they couldn't before?"

## TASK FORMAT
- title: Start with "User can..." or describe the tangible outcome (5-10 words)
- description: What this enables, acceptance criteria in plain language
- category: feature | marketing | operations
- priority: critical | high | medium | low
- phase: "Phase 1" | "Phase 2" | "Launch"

## GOOD vs BAD EXAMPLES
BAD: "Implement NextAuth authentication with Google OAuth"
GOOD: "User can sign up and log in with email or Google"

BAD: "Create Express API endpoint for habit CRUD operations"
GOOD: "User can create, edit, and delete their habits"

BAD: "Set up PostgreSQL database with Prisma schema"
GOOD: (Don't create this - it's not a user-visible outcome)

BAD: "Configure Vercel deployment with environment variables"
GOOD: "App is deployed and accessible at production URL"

## WHAT TO GENERATE
- 5-10 tasks maximum (fewer is better if scope is small)
- Focus on features that deliver user value
- Include 1 marketing task if relevant (landing page, etc.)
- Include 1 operations task (app is live, monitored, reliable)
- DO NOT create tasks for: database setup, API endpoints, testing frameworks, CI/CD pipelines, code architecture

Return a JSON object with:
{
  "summary": "Brief summary of the launch plan",
  "tasks": [array of task objects]
}`

/**
 * Generates a launch plan with tasks from a UBP
 */
export async function generateLaunchPlan(ubpContent: unknown): Promise<LaunchPlanResult> {
    const messages: Message[] = [
        { role: "system", content: LAUNCH_PLAN_PROMPT },
        {
            role: "user",
            content: `Generate a launch plan for this product blueprint:\n\n${JSON.stringify(ubpContent, null, 2)}`
        }
    ]

    const response = await generateCompletion({ messages, stream: false })
    const data = await response.json()

    const choice = data.choices?.[0]?.message
    if (!choice) {
        throw new Error("No response from LLM")
    }

    const rawContent = choice.content || choice.reasoning || ""

    // Try to parse as JSON
    let parsed: LaunchPlanResult
    try {
        parsed = JSON.parse(rawContent)
    } catch {
        // Try to extract JSON from markdown
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1].trim())
        } else {
            // Brute force extraction
            const firstOpen = rawContent.indexOf('{')
            const lastClose = rawContent.lastIndexOf('}')
            if (firstOpen !== -1 && lastClose > firstOpen) {
                parsed = JSON.parse(rawContent.substring(firstOpen, lastClose + 1))
            } else {
                throw new Error("Could not parse launch plan response")
            }
        }
    }

    // Validate and normalize tasks
    const tasks: LaunchPlanTask[] = (parsed.tasks || []).map((task: Partial<LaunchPlanTask>) => ({
        title: task.title || "Untitled Task",
        description: task.description || "",
        category: task.category || "feature",
        priority: task.priority || "medium",
        phase: task.phase || "Phase 1",
    }))

    return {
        summary: parsed.summary || "Launch plan generated from blueprint",
        tasks,
    }
}
