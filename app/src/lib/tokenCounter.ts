// Token counting and cost estimation for LLM calls
// Helps control costs and prevent bill shock

/**
 * Rough token estimation
 * 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Count tokens in message array
 * Includes overhead for role/formatting
 */
export function estimateMessageTokens(messages: { role: string; content: string }[]): number {
  let total = 0
  for (const msg of messages) {
    total += estimateTokens(msg.content)
    total += 4 // Add overhead for role/formatting
  }
  return total
}

/**
 * Calculate cost based on model pricing
 * Returns costs in USD
 */
export function estimateCost(
  tokens: number,
  model: string
): { input: number; output: number; total: number } {
  const pricing: Record<string, { input: number; output: number }> = {
    "deepseek/deepseek-v3.2": { input: 0.0001, output: 0.0002 },
    "xiaomi/mimo-v2-flash:free": { input: 0, output: 0 },
    "google/gemini-2.0-flash-exp:free": { input: 0, output: 0 },
    "openai/gpt-4": { input: 0.01, output: 0.03 },
    "anthropic/claude-3-sonnet": { input: 0.003, output: 0.015 }
  }

  const rate = pricing[model] || pricing["deepseek/deepseek-v3.2"]

  // Assume 70% input tokens, 30% output tokens
  const inputTokens = tokens * 0.7
  const outputTokens = tokens * 0.3

  const inputCost = (inputTokens * rate.input) / 1000
  const outputCost = (outputTokens * rate.output) / 1000

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost
  }
}

/**
 * Format cost as readable string
 */
export function formatCost(cents: number): string {
  const dollars = (cents).toFixed(4)
  return `$${dollars}`
}

/**
 * Check if cost estimate exceeds budget
 */
export function isWithinBudget(
  estimatedCost: number,
  currentDailySpend: number,
  dailyBudget: number = 5.00
): boolean {
  return (currentDailySpend + estimatedCost) <= dailyBudget
}
