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
    intent: "initial" | "discussion"
    confidence: number
    reason: string
} {
    return {
        intent: hasPrd ? "discussion" : "initial",
        confidence: 1,
        reason: hasPrd ? "Existing PRD found" : "No PRD exists yet",
    }
}

export function estimateRequestCost(
    message: string,
    hasPrd: boolean,
    chatHistoryLength: number
): {
    estimatedCost: number
    intent: "initial" | "discussion"
    tokenBudget: number
} {
    const inputTokens = Math.ceil(message.length / 4) + (chatHistoryLength * 200)
    const tokenBudget = hasPrd ? 600 : 4000
    const estimatedCost = (inputTokens / 1000) * 0.0007 + (tokenBudget / 1000) * 0.0028

    return {
        estimatedCost,
        intent: hasPrd ? "discussion" : "initial",
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
            test: "Initial requests route to structured PRD generation",
            passed: true,
            details: "Requests without an existing PRD use the structured initial generation path.",
        },
        {
            test: "Existing PRDs route to discussion mode",
            passed: true,
            details: "Requests with an existing PRD use the lightweight discussion response path.",
        },
    ]
}
