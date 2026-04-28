import type { ClarificationOption, ClarificationQuestion } from "@/lib/prd/schema"
import type { ClarificationAnswerState, ClarificationAnsweredSummary } from "@/lib/types/views"

const SYNTHETIC_OTHER_SUFFIX = "__other"

function createSyntheticOtherOption(questionId: string): ClarificationOption {
    return {
        id: `${questionId}${SYNTHETIC_OTHER_SUFFIX}`,
        label: "Other",
        description: "Type something different.",
        kind: "other",
    }
}

export function getClarificationOptions(question: ClarificationQuestion): ClarificationOption[] {
    return question.options.some((option) => option.kind === "other")
        ? question.options
        : [...question.options, createSyntheticOtherOption(question.id)]
}

export function createEmptyClarificationAnswer(questionId: string): ClarificationAnswerState {
    return {
        questionId,
        selectedOptionIds: [],
        customText: "",
        isComplete: false,
    }
}

export function normalizeClarificationAnswers(
    questions: ClarificationQuestion[],
    current: Record<string, ClarificationAnswerState>
): Record<string, ClarificationAnswerState> {
    const next: Record<string, ClarificationAnswerState> = {}

    questions.forEach((question) => {
        const existing = current[question.id] || createEmptyClarificationAnswer(question.id)
        const validOptionIds = new Set(getClarificationOptions(question).map((option) => option.id))
        const selectedOptionIds = existing.selectedOptionIds.filter((optionId) => validOptionIds.has(optionId))

        next[question.id] = {
            questionId: question.id,
            selectedOptionIds: question.selectionMode === "single" ? selectedOptionIds.slice(0, 1) : selectedOptionIds,
            customText: existing.customText,
            isComplete: existing.isComplete && canAdvanceClarificationQuestion(question, {
                ...existing,
                selectedOptionIds,
            }),
        }
    })

    return next
}

export function isOtherOption(question: ClarificationQuestion, optionId: string): boolean {
    return Boolean(getClarificationOptions(question).find((option) => option.id === optionId && option.kind === "other"))
}

export function canAdvanceClarificationQuestion(
    question: ClarificationQuestion,
    answer: ClarificationAnswerState | undefined
): boolean {
    if (!answer) {
        return false
    }

    if (answer.selectedOptionIds.length === 0) {
        return false
    }

    const selectedOther = answer.selectedOptionIds.some((optionId) => isOtherOption(question, optionId))
    if (selectedOther && answer.customText.trim().length === 0) {
        return false
    }

    if (question.selectionMode === "single") {
        return answer.selectedOptionIds.length === 1
    }

    return answer.selectedOptionIds.length >= 1
}

export function updateClarificationSelection(
    question: ClarificationQuestion,
    answer: ClarificationAnswerState | undefined,
    optionId: string
): ClarificationAnswerState {
    const current = answer || createEmptyClarificationAnswer(question.id)

    if (question.selectionMode === "single") {
        const nextSelected = current.selectedOptionIds[0] === optionId ? [] : [optionId]
        const complete = nextSelected.length === 1 && !isOtherOption(question, optionId)

        return {
            ...current,
            selectedOptionIds: nextSelected,
            customText: nextSelected.length === 1 && isOtherOption(question, optionId) ? current.customText : "",
            isComplete: complete,
        }
    }

    const selectedOptionIds = current.selectedOptionIds.includes(optionId)
        ? current.selectedOptionIds.filter((value) => value !== optionId)
        : [...current.selectedOptionIds, optionId]

    const otherStillSelected = selectedOptionIds.some((selectedId) => isOtherOption(question, selectedId))

    return {
        ...current,
        selectedOptionIds,
        customText: otherStillSelected ? current.customText : "",
        isComplete: false,
    }
}

export function updateClarificationCustomText(
    answer: ClarificationAnswerState | undefined,
    questionId: string,
    customText: string
): ClarificationAnswerState {
    const current = answer || createEmptyClarificationAnswer(questionId)

    return {
        ...current,
        customText,
        isComplete: false,
    }
}

export function completeClarificationAnswer(
    question: ClarificationQuestion,
    answer: ClarificationAnswerState | undefined
): ClarificationAnswerState {
    const current = answer || createEmptyClarificationAnswer(question.id)

    return {
        ...current,
        isComplete: canAdvanceClarificationQuestion(question, current),
    }
}

export function getClarificationAnswerLabel(
    question: ClarificationQuestion,
    answer: ClarificationAnswerState | undefined
): string {
    if (!answer || answer.selectedOptionIds.length === 0) {
        return ""
    }

    const options = getClarificationOptions(question)
    const labels = answer.selectedOptionIds
        .map((optionId) => {
            const option = options.find((candidate) => candidate.id === optionId)
            if (!option) {
                return null
            }

            if (option.kind === "other") {
                const custom = answer.customText.trim()
                return custom ? `Other: ${custom}` : "Other"
            }

            return option.label
        })
        .filter((label): label is string => Boolean(label))

    return labels.join(", ")
}

export function getClarificationProgress(
    questions: ClarificationQuestion[],
    answers: Record<string, ClarificationAnswerState>
): {
    activeQuestion: ClarificationQuestion | null
    activeQuestionIndex: number
    answeredSummaries: ClarificationAnsweredSummary[]
    isReady: boolean
} {
    const answeredSummaries: ClarificationAnsweredSummary[] = []
    let activeQuestion: ClarificationQuestion | null = null
    let activeQuestionIndex = -1

    questions.forEach((question, index) => {
        const answer = answers[question.id]
        if (answer?.isComplete) {
            answeredSummaries.push({
                questionId: question.id,
                prompt: question.prompt,
                answerText: getClarificationAnswerLabel(question, answer),
            })
            return
        }

        if (!activeQuestion) {
            activeQuestion = question
            activeQuestionIndex = index
        }
    })

    return {
        activeQuestion,
        activeQuestionIndex,
        answeredSummaries,
        isReady: questions.length > 0 && questions.every((question) => answers[question.id]?.isComplete),
    }
}

export function buildClarificationAnswerMessage(
    questions: ClarificationQuestion[],
    answers: Record<string, ClarificationAnswerState>
): string {
    const lines = questions.map((question) => {
        const answerText = getClarificationAnswerLabel(question, answers[question.id])
        return `- ${question.prompt}: ${answerText || "No answer provided"}`
    })

    return `Clarification answers:\n${lines.join("\n")}`
}
