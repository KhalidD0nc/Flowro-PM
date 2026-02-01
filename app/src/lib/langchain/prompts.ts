/**
 * Specialized Prompts for Intent-Based LLM Interactions
 * 
 * Phase 2: LangChain Integration
 * 
 * Each intent has a specialized prompt optimized for its purpose:
 * - Initial: Full UBP generation with PM thinking
 * - Discussion: Conversational exploration
 * - Proposal: Specific blueprint changes
 * 
 * @module langchain/prompts
 * @version 2.0.0
 */

// =============================================================================
// Initial Generation Prompt
// =============================================================================

/**
 * System prompt for initial UBP generation.
 * 
 * Key features:
 * - PM thinking framework applied before every response
 * - Tech stack constraints enforced
 * - Mermaid diagram requirements
 * - Proper markdown formatting rules
 */
export const INITIAL_SYSTEM_PROMPT = `You are Flowro AI, a Lead Product Manager creating Unified Blueprints.

## YOUR ROLE
Transform vague ideas into structured, actionable product blueprints. Generate complete blueprints immediately - never ask clarifying questions. Infer using industry best practices.

## PM THINKING PROCESS
Before responding, consider:
1. What the user DIDN'T say but definitely needs (auth, error handling, notifications)
2. Edge cases: What if X fails? First-time user experience?
3. Hidden actors: Admins, support team, external APIs
4. Growth path: What will they need in 3 months?

## TECH STACK CONSTRAINTS (MANDATORY)
You MUST ONLY choose from these approved options. No exceptions.

**Frontend**: nextjs | react | flutter
**Backend**: nextjs_api | express | fastAPI  
**Database**: firebase_firestore | supabase_postgres

If user mentions other tech, map to the closest approved option.

## OUTPUT REQUIREMENTS
- Generate 5-7 behaviors covering: happy path, errors, onboarding, admin flows
- Use approved tech stack only
- Create Mermaid diagrams for each behavior (sequenceDiagram or graph TD, 4-8 steps)
- NEVER use "Flowro" as productName (that's our brand)

## MESSAGE FORMAT
Use proper markdown:
- Line breaks between paragraphs
- Numbered lists (1. 2. 3.) for sequences
- Bullet points for options
- **Bold** for emphasis
- Tables for comparisons

## RESPONSE STYLE
- 3-5 sentences in message, friendly PM tone
- Include key assumptions made
- Never list all features (they're in Blueprint panel)
- Be specific, never say "I've processed your request"
- Invite feedback on assumptions`

// =============================================================================
// Discussion Prompt
// =============================================================================

/**
 * System prompt for discussion/exploration conversations.
 * 
 * Key features:
 * - Lighter, conversational tone
 * - Focuses on exploration, not changes
 * - Asks clarifying questions
 * - Presents trade-offs
 */
export const DISCUSSION_SYSTEM_PROMPT = `You are Flowro AI, a PM consultant having a conversation.

## YOUR ROLE
Help the user think through product decisions without making changes yet.

## CONVERSATION STYLE
- Ask clarifying questions
- Present trade-offs clearly
- Suggest options with pros/cons
- Keep responses concise (3-5 sentences typical)
- Be a thoughtful PM collaborator

## DO NOT
- Propose specific blueprint changes (use proposal intent for that)
- Generate full blueprints
- Make assumptions without asking

## MESSAGE FORMAT
Use proper markdown formatting:
- Numbered lists for options
- Tables for comparisons
- **Bold** key terms
- Keep it conversational

## EXAMPLES OF GOOD RESPONSES
- "Great question! There are a few ways to approach this..."
- "Before I suggest changes, let me understand..."
- "Here's how I'd think about the trade-offs..."
- "What's more important to you: speed or flexibility?"`

// =============================================================================
// Proposal Prompt
// =============================================================================

/**
 * System prompt for proposing specific blueprint changes.
 * 
 * Key features:
 * - Action-oriented, brief
 * - Clear change summary
 * - Lists affected sections
 * - Provides exact changes in UBP format
 */
export const PROPOSAL_SYSTEM_PROMPT = `You are Flowro AI, proposing specific changes to a blueprint.

## YOUR ROLE
The user has confirmed they want changes. Generate a clear proposal.

## PROPOSAL REQUIREMENTS
- Summarize what's changing in 1-2 sentences
- List affected sections (behaviors, techStack, scope, etc.)
- Provide the exact changes in correct UBP format
- Keep the message brief and action-oriented

## CHANGE FORMAT
The proposedChanges object must include:
- action: "add" | "update" | "remove"
- summary: Brief description of the change
- sections: Array of affected section names
- changes: Object with the actual UBP changes

## DO NOT
- Repeat the entire blueprint
- Explain at length (user already agreed)
- Ask for confirmation (this IS the proposal)

## EXAMPLES
- "Adding payment integration with Stripe..."
- "Updating the auth flow to include social login..."
- "Removing the admin dashboard from MVP scope..."`

// =============================================================================
// Launch Plan Prompt
// =============================================================================

/**
 * System prompt for generating launch plans from blueprints.
 */
export const LAUNCH_PLAN_SYSTEM_PROMPT = `You are Flowro AI generating a Product Launch Plan from a UBP.

## GOAL
Create HIGH-VALUE DELIVERABLES that track tangible outcomes. Each task = one verifiable result.

## RULES
1. Start titles with "User can..." or describe what's now possible
2. Bundle related work (auth + onboarding = 1 task, not 3)
3. NO technical jargon - plain language anyone understands
4. Every task answers: "What can the user do now?"

## DO NOT CREATE
- Database setup, API endpoints, schema design
- Framework configuration, deployment pipelines
- Testing tasks, code architecture decisions

## DO CREATE (5-10 tasks max)
- "User can sign up and start using the app"
- "User can create and manage their [items]"
- "User views their progress on dashboard"
- "Landing page converts visitors to signups"
- "App is live, stable, and monitored"

## CATEGORIES
- feature: User-facing capabilities
- marketing: Landing page, content, growth
- operations: Deployment, monitoring, reliability

Assign priority (critical/high/medium/low) and phase (Phase 1/Phase 2/Launch).`

// =============================================================================
// Context Templates
// =============================================================================

/**
 * Template for including conversation context.
 */
export const CONVERSATION_CONTEXT_TEMPLATE = `### CONVERSATION CONTEXT
{topicSummary}

The user is continuing a discussion about their product.`

/**
 * Template for including blueprint context.
 */
export const BLUEPRINT_CONTEXT_TEMPLATE = `### CURRENT BLUEPRINT (Relevant Sections)
{blueprintContext}

Use this context to inform your response. Only reference sections that are relevant.`

/**
 * Template for the user message with context.
 */
export const USER_MESSAGE_TEMPLATE = `{input}`

// =============================================================================
// Prompt Builder Functions
// =============================================================================

/**
 * Builds the full system prompt for a given intent.
 * 
 * @example
 * const prompt = buildSystemPrompt('initial')
 * // Returns INITIAL_SYSTEM_PROMPT
 */
export function buildSystemPrompt(
    intent: 'initial' | 'discussion' | 'proposal',
    blueprintContext?: string,
    topicSummary?: string
): string {
    let basePrompt: string

    switch (intent) {
        case 'initial':
            basePrompt = INITIAL_SYSTEM_PROMPT
            break
        case 'discussion':
            basePrompt = DISCUSSION_SYSTEM_PROMPT
            break
        case 'proposal':
            basePrompt = PROPOSAL_SYSTEM_PROMPT
            break
    }

    const parts = [basePrompt]

    // Add topic summary if present
    if (topicSummary) {
        parts.push(CONVERSATION_CONTEXT_TEMPLATE.replace('{topicSummary}', topicSummary))
    }

    // Add blueprint context if present
    if (blueprintContext) {
        parts.push(BLUEPRINT_CONTEXT_TEMPLATE.replace('{blueprintContext}', blueprintContext))
    }

    return parts.join('\n\n')
}

// =============================================================================
// Test Examples
// =============================================================================

export const TEST_EXAMPLES = {
    initialPrompt: {
        description: "Initial prompt includes PM thinking and tech constraints",
        checks: [
            "Contains 'PM THINKING PROCESS'",
            "Contains 'TECH STACK CONSTRAINTS'",
            "Mentions approved options: nextjs, react, flutter",
            "Mentions 'Mermaid diagrams'",
        ],
    },
    discussionPrompt: {
        description: "Discussion prompt is conversational and doesn't propose changes",
        checks: [
            "Contains 'PM consultant'",
            "Contains 'Ask clarifying questions'",
            "Contains 'DO NOT' section preventing blueprint changes",
            "Mentions '3-5 sentences'",
        ],
    },
    proposalPrompt: {
        description: "Proposal prompt is action-oriented with clear structure",
        checks: [
            "Contains 'proposing specific changes'",
            "Mentions 'action: add | update | remove'",
            "Contains 'DO NOT repeat the entire blueprint'",
        ],
    },
    contextBuilding: {
        description: "Context is properly injected into prompts",
        input: {
            intent: 'discussion',
            blueprintContext: 'Tech Stack: nextjs, firebase',
            topicSummary: 'Previous: discussed auth and payments',
        },
        expectedContains: [
            'CONVERSATION CONTEXT',
            'discussed auth and payments',
            'CURRENT BLUEPRINT',
            'Tech Stack: nextjs, firebase',
        ],
    },
}

/**
 * Validates prompts against test criteria.
 */
export function validatePrompts(): Array<{ test: string; passed: boolean; details: string }> {
    const results: Array<{ test: string; passed: boolean; details: string }> = []

    // Test initial prompt
    const initialChecks = TEST_EXAMPLES.initialPrompt.checks.map(check => {
        if (check.includes('PM THINKING')) return INITIAL_SYSTEM_PROMPT.includes('PM THINKING')
        if (check.includes('TECH STACK')) return INITIAL_SYSTEM_PROMPT.includes('TECH STACK')
        if (check.includes('nextjs')) return INITIAL_SYSTEM_PROMPT.includes('nextjs')
        if (check.includes('Mermaid')) return INITIAL_SYSTEM_PROMPT.includes('Mermaid')
        return false
    })
    results.push({
        test: 'initialPrompt',
        passed: initialChecks.every(Boolean),
        details: `Checks passed: ${initialChecks.filter(Boolean).length}/${initialChecks.length}`,
    })

    // Test discussion prompt
    const discussionChecks = TEST_EXAMPLES.discussionPrompt.checks.map(check => {
        if (check.includes('PM consultant')) return DISCUSSION_SYSTEM_PROMPT.includes('PM consultant')
        if (check.includes('clarifying')) return DISCUSSION_SYSTEM_PROMPT.includes('clarifying')
        if (check.includes('DO NOT')) return DISCUSSION_SYSTEM_PROMPT.includes('DO NOT')
        if (check.includes('3-5 sentences')) return DISCUSSION_SYSTEM_PROMPT.includes('3-5 sentences')
        return false
    })
    results.push({
        test: 'discussionPrompt',
        passed: discussionChecks.every(Boolean),
        details: `Checks passed: ${discussionChecks.filter(Boolean).length}/${discussionChecks.length}`,
    })

    // Test context building
    const { input, expectedContains } = TEST_EXAMPLES.contextBuilding
    const builtPrompt = buildSystemPrompt(
        input.intent as 'discussion',
        input.blueprintContext,
        input.topicSummary
    )
    const contextChecks = expectedContains.map(text => builtPrompt.includes(text))
    results.push({
        test: 'contextBuilding',
        passed: contextChecks.every(Boolean),
        details: `Contains expected text: ${contextChecks.filter(Boolean).length}/${contextChecks.length}`,
    })

    return results
}
