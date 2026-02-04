/**
 * JSON Repair utility for handling malformed LLM JSON output
 * Common issues: trailing commas, missing commas, markdown code blocks
 */

/**
 * Attempt to repair common JSON syntax errors from LLM output
 */
export function repairJSON(input: string): string {
  let json = input.trim()

  // 1. Remove markdown code blocks (various formats)
  // Handle: ```json\n...\n```, ```\n...\n```, ` ```json...``` `
  json = json
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .replace(/^`+|`+$/g, '')
    .trim()

  // 2. Find the JSON object boundaries
  const firstBrace = json.indexOf('{')
  const lastBrace = json.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    // No valid JSON object found
    return input
  }

  // Extract just the JSON part (remove any text before/after)
  json = json.substring(firstBrace, lastBrace + 1)

  // 3. Fix trailing commas in arrays: [item,] -> [item]
  json = json.replace(/,(\s*[\]}])/g, '$1')

  // 4. Fix trailing commas in objects: {key: value,} -> {key: value}
  json = json.replace(/,(\s*})/g, '$1')

  // 5. Fix missing commas between array elements
  // Pattern: }\s*{ without comma (common in arrays of objects)
  json = json.replace(/}(\s*){/g, '},$1{')

  // 6. Fix missing commas between string values and next key
  // Pattern: "value"\s*"key" without comma
  json = json.replace(/"(\s*)"(?=[a-zA-Z_])/g, '",$1"')

  // 7. Remove any control characters except allowed ones
  json = json.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

  // 8. Fix unescaped newlines in strings (replace with \n)
  // This is tricky - we need to be careful not to break valid escaped newlines

  return json
}

/**
 * Attempt to parse JSON with automatic repair on failure
 */
export function parseJSONSafe<T = unknown>(input: string): {
  success: true
  data: T
} | {
  success: false
  error: string
  position?: number
} {
  // First try parsing as-is
  try {
    const data = JSON.parse(input) as T
    return { success: true, data }
  } catch (e) {
    // Extract error position if available
    const errorMsg = e instanceof Error ? e.message : String(e)
    const posMatch = errorMsg.match(/position (\d+)/)
    const position = posMatch ? parseInt(posMatch[1], 10) : undefined

    // Try with repairs
    try {
      const repaired = repairJSON(input)
      const data = JSON.parse(repaired) as T
      return { success: true, data }
    } catch (e2) {
      const repairError = e2 instanceof Error ? e2.message : String(e2)
      return {
        success: false,
        error: `Original: ${errorMsg}. After repair: ${repairError}`,
        position
      }
    }
  }
}

/**
 * Extract a partial message from incomplete JSON for display purposes
 * Useful when streaming JSON that hasn't completed yet
 */
export function extractPartialMessage(json: string): string | null {
  // Look for "message": "..." pattern
  const messageMatch = json.match(/"message"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/)
  if (messageMatch) {
    // Unescape the string
    try {
      return JSON.parse(`"${messageMatch[1]}"`)
    } catch {
      return messageMatch[1]
    }
  }

  // Look for partial message that hasn't closed yet
  const partialMatch = json.match(/"message"\s*:\s*"([^"]*(?:\\.[^"]*)*)$/)
  if (partialMatch) {
    try {
      return JSON.parse(`"${partialMatch[1]}"`)
    } catch {
      return partialMatch[1]
    }
  }

  return null
}
