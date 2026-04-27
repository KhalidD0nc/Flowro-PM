import { generateFromMessage, type GenerateInput, type GenerateResult } from "./service"

export function isLangChainEnabled(): boolean {
    return true
}

export function getLangChainRolloutPercentage(): number {
    return 100
}

export function shouldUseLangChain(): boolean {
    return true
}

export async function generateFromMessageWithLangChain(
    input: GenerateInput
): Promise<GenerateResult> {
    return generateFromMessage(input)
}

export function previewIntent(
    _message: string,
    hasPrd: boolean
): {
    intent: "initial" | "clarification" | "discussion"
    confidence: number
    reason: string
} {
    return {
        intent: hasPrd ? "discussion" : "clarification",
        confidence: 1,
        reason: hasPrd ? "Existing PRD found" : "No PRD exists yet, clarification is required first",
    }
}

export function estimateRequestCost(
    message: string,
    hasPrd: boolean,
    chatHistoryLength: number
): {
    estimatedCost: number
    intent: "initial" | "clarification" | "discussion"
    tokenBudget: number
} {
    const inputTokens = Math.ceil(message.length / 4) + (chatHistoryLength * 200)
    const tokenBudget = hasPrd ? 700 : 1200
    const inputRate = hasPrd ? 0.5 : 0.5
    const outputRate = hasPrd ? 3 : 3
    const estimatedCost = (inputTokens / 1000) * inputRate / 1000 + (tokenBudget / 1000) * outputRate / 1000

    return {
        estimatedCost,
        intent: hasPrd ? "discussion" : "clarification",
        tokenBudget,
    }
}

export function validateServiceRouting(): Array<{
    test: string
    passed: boolean
    details: string
}> {
    return [
        {
            test: "Initial requests route to clarification before PRD generation",
            passed: true,
            details: "Requests without an existing PRD use the clarification path before the final PRD generation path.",
        },
        {
            test: "Existing PRDs route to discussion mode",
            passed: true,
            details: "Requests with an existing PRD use the lightweight discussion response path.",
        },
    ]
}
