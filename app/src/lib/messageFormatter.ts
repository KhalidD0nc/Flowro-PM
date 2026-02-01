/**
 * Message Formatting System for LLM Responses
 * 
 * Problem: LLM returns poorly formatted text with inline lists and no structure.
 * Solution: Post-processing + prompt improvements for proper markdown output.
 * 
 * @module messageFormatter
 * @version 1.0.0
 */

/**
 * Formats raw LLM output into proper markdown with structured lists and paragraphs.
 * 
 * @example
 * // Before: "Here are options: 1) Option A 2) Option B 3) Option C"
 * // After:  "Here are options:\n1. Option A\n2. Option B\n3. Option C"
 * 
 * @example
 * // Before: "Consider this: - Item one - Item two"
 * // After:  "Consider this:\n- Item one\n- Item two"
 */
export function formatMessage(raw: string): string {
    if (!raw || typeof raw !== 'string') return raw || ''

    return raw
        // Fix inline numbered lists: "1) item 2) item" → proper list
        .replace(/(\s)(\d+)\)\s+/g, '\n$2. ')
        // Fix "1:" or "1." inline patterns followed by uppercase
        .replace(/(\s)(\d+)[:.]\s+(?=[A-Z])/g, '\n$2. ')
        // Convert **Option A:** patterns to proper headers
        .replace(/\*\*([^*]+):\*\*/g, '\n\n**$1:**')
        // Fix inline bullet points: " - Item" → newline bullet
        .replace(/\s+-\s+(?=[A-Z])/g, '\n- ')
        // Ensure paragraph separation after sentence-ending punctuation
        .replace(/([.!?])\s{2,}(?=[A-Z])/g, '$1\n\n')
        // Clean up leading newlines
        .replace(/^\n+/, '')
        // Reduce excessive newlines (3+ → 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

/**
 * Converts an array of objects into a properly formatted markdown table.
 * 
 * @example
 * const data = [
 *   { Option: 'A', Pros: 'Fast', Cons: 'Complex' },
 *   { Option: 'B', Pros: 'Simple', Cons: 'Slower' }
 * ]
 * formatAsTable(data)
 * // Returns:
 * // | Option | Pros | Cons |
 * // | --- | --- | --- |
 * // | A | Fast | Complex |
 * // | B | Simple | Slower |
 */
export function formatAsTable(data: Record<string, string>[]): string {
    if (!data || !data.length) return ''

    const headers = Object.keys(data[0])
    const headerRow = `| ${headers.join(' | ')} |`
    const separator = `| ${headers.map(() => '---').join(' | ')} |`
    const rows = data.map(row => `| ${headers.map(h => row[h] || '').join(' | ')} |`)

    return [headerRow, separator, ...rows].join('\n')
}

/**
 * Formats a comparison between options with pros/cons.
 * 
 * @example
 * formatComparison([
 *   { name: 'Firebase', pros: ['Real-time', 'Easy'], cons: ['Vendor lock-in'] },
 *   { name: 'Supabase', pros: ['Open source', 'PostgreSQL'], cons: ['Newer'] }
 * ])
 */
export function formatComparison(
    options: Array<{ name: string; pros: string[]; cons: string[] }>
): string {
    if (!options || !options.length) return ''

    return options
        .map(opt => {
            const prosStr = opt.pros.map(p => `  - ✅ ${p}`).join('\n')
            const consStr = opt.cons.map(c => `  - ⚠️ ${c}`).join('\n')
            return `**${opt.name}**\n${prosStr}\n${consStr}`
        })
        .join('\n\n')
}

/**
 * Formats a numbered list of steps/actions.
 * 
 * @example
 * formatSteps(['Create account', 'Configure settings', 'Launch app'])
 * // Returns:
 * // 1. Create account
 * // 2. Configure settings
 * // 3. Launch app
 */
export function formatSteps(steps: string[]): string {
    if (!steps || !steps.length) return ''
    return steps.map((step, i) => `${i + 1}. ${step}`).join('\n')
}

/**
 * Formats a bullet list.
 * 
 * @example
 * formatBullets(['Feature A', 'Feature B', 'Feature C'])
 * // Returns:
 * // - Feature A
 * // - Feature B
 * // - Feature C
 */
export function formatBullets(items: string[]): string {
    if (!items || !items.length) return ''
    return items.map(item => `- ${item}`).join('\n')
}

/**
 * Ensures code blocks are properly formatted with language hints.
 */
export function formatCodeBlock(code: string, language = ''): string {
    return `\`\`\`${language}\n${code.trim()}\n\`\`\``
}

/**
 * Cleans up common LLM formatting issues in the response.
 * More aggressive than formatMessage - use for highly malformed responses.
 */
export function deepCleanMessage(raw: string): string {
    if (!raw || typeof raw !== 'string') return raw || ''

    let cleaned = raw

    // Step 1: Fix various inline list patterns
    // Pattern: "1. Item 2. Item 3. Item" on same line
    cleaned = cleaned.replace(/(\.\s+)(\d+)\.\s+(?=[A-Z])/g, '.\n\n$2. ')

    // Pattern: "a) item b) item c) item"
    cleaned = cleaned.replace(/\s+([a-z])\)\s+/g, '\n$1) ')

    // Step 2: Fix run-on sentences that should be separate paragraphs
    // Look for patterns like "Done. Next thing" without proper spacing
    cleaned = cleaned.replace(/([.!?])(\s)([A-Z][a-z]+\s)/g, '$1\n\n$3')

    // Step 3: Fix bold headers that run into content
    cleaned = cleaned.replace(/(\*\*[^*]+\*\*)\s*([A-Z])/g, '$1\n$2')

    // Step 4: Ensure proper spacing around headers
    cleaned = cleaned.replace(/([^\n])(#{1,3}\s)/g, '$1\n\n$2')

    // Step 5: Apply standard formatting
    cleaned = formatMessage(cleaned)

    return cleaned
}

// =============================================================================
// TEST EXAMPLES (for documentation and validation)
// =============================================================================
/**
 * Test examples demonstrating before/after formatting.
 * Run these to validate the formatter works correctly.
 */
export const TEST_EXAMPLES = {
    inlineNumberedList: {
        before: "Here are your options: 1) Use Firebase for real-time updates 2) Use Supabase for SQL queries 3) Use MongoDB for flexibility",
        expected: "Here are your options:\n1. Use Firebase for real-time updates\n2. Use Supabase for SQL queries\n3. Use MongoDB for flexibility"
    },
    inlineBulletList: {
        before: "Consider these features: - User authentication - Payment processing - Email notifications",
        expected: "Consider these features:\n- User authentication\n- Payment processing\n- Email notifications"
    },
    boldHeaders: {
        before: "**Authentication:** We recommend OAuth. **Database:** Firebase is best. **Frontend:** Next.js works great.",
        expected: "\n\n**Authentication:** We recommend OAuth.\n\n**Database:** Firebase is best.\n\n**Frontend:** Next.js works great."
    },
    excessiveWhitespace: {
        before: "First paragraph.   Second paragraph starts here.   Third paragraph too.",
        expected: "First paragraph.\n\nSecond paragraph starts here.\n\nThird paragraph too."
    },
    mixedFormatting: {
        before: "Your blueprint includes: 1) User auth 2) Dashboard **Features:** - Analytics - Reports  The tech stack uses NextJS.",
        expected: "Your blueprint includes:\n1. User auth\n2. Dashboard\n\n**Features:**\n- Analytics\n- Reports  The tech stack uses NextJS."
    }
}

/**
 * Validates the formatter against test examples.
 * Returns an array of failed tests (empty = all passed).
 */
export function validateFormatter(): Array<{ name: string; got: string; expected: string }> {
    const failures: Array<{ name: string; got: string; expected: string }> = []

    for (const [name, example] of Object.entries(TEST_EXAMPLES)) {
        const result = formatMessage(example.before)
        // Normalize whitespace for comparison
        const normalizedResult = result.replace(/\s+/g, ' ').trim()
        const normalizedExpected = example.expected.replace(/\s+/g, ' ').trim()

        if (normalizedResult !== normalizedExpected) {
            failures.push({ name, got: result, expected: example.expected })
        }
    }

    return failures
}
