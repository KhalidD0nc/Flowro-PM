import { generateCompletion, UBP_SYSTEM_PROMPT, Message } from "@/lib/openrouter"

// Types
export interface GenerateInput {
    message: string
    context?: unknown
}

export interface GenerateResult {
    content: unknown
    reasoningDetails?: unknown
    rawContent: string
}

/**
 * Builds the messages array for the LLM request
 */
export function buildMessages(input: GenerateInput): Message[] {
    const { message, context } = input

    const messages: Message[] = [
        { role: "system", content: UBP_SYSTEM_PROMPT },
    ]

    // Add context if refining existing UBP
    if (context) {
        messages.push({
            role: "assistant",
            content: JSON.stringify(context, null, 2),
        })
    }

    messages.push({
        role: "user",
        content: message,
    })

    return messages
}

/**
 * Calls the LLM and returns the parsed response
 */
export async function callLLM(messages: Message[]): Promise<GenerateResult> {
    const response = await generateCompletion({ messages, stream: false })
    const data = await response.json()

    const choice = data.choices?.[0]?.message
    if (!choice) {
        throw new Error("No response from LLM")
    }

    let content: unknown
    try {
        content = JSON.parse(choice.content)
    } catch {
        content = { raw: choice.content }
    }

    return {
        content,
        reasoningDetails: choice.reasoning_details,
        rawContent: choice.content,
    }
}

/**
 * Generates a completion from the LLM
 */
export async function generateFromMessage(input: GenerateInput): Promise<GenerateResult> {
    const messages = buildMessages(input)
    return callLLM(messages)
}
