import type { ClarificationQuestion } from "../lib/prd/schema"
import {
    buildClarificationAnswerMessage,
    canAdvanceClarificationQuestion,
    completeClarificationAnswer,
    createEmptyClarificationAnswer,
    getClarificationOptions,
    getClarificationProgress,
    updateClarificationCustomText,
    updateClarificationSelection,
} from "../lib/clarificationFlow"

interface TestResult {
    name: string
    passed: boolean
    details: string
}

const singleQuestion: ClarificationQuestion = {
    id: "q-scope",
    prompt: "What version should we build first?",
    selectionMode: "single",
    options: [
        { id: "mvp", label: "MVP dashboard", kind: "preset" },
        { id: "workspace", label: "Full workspace", kind: "preset" },
    ],
}

const multiQuestion: ClarificationQuestion = {
    id: "q-channels",
    prompt: "Which channels should MVP support?",
    selectionMode: "multiple",
    options: [
        { id: "sms", label: "SMS", kind: "preset" },
        { id: "email", label: "Email", kind: "preset" },
    ],
}

function runClarificationFlowTests(): TestResult[] {
    const results: TestResult[] = []

    const singleOptions = getClarificationOptions(singleQuestion)
    results.push({
        name: "Questions gain a fallback Other option",
        passed: singleOptions[singleOptions.length - 1]?.kind === "other",
        details: `Last option kind: ${singleOptions[singleOptions.length - 1]?.kind}`,
    })

    const autoAnswered = updateClarificationSelection(singleQuestion, undefined, "mvp")
    results.push({
        name: "Single preset answer auto-completes the step",
        passed: autoAnswered.isComplete && autoAnswered.selectedOptionIds[0] === "mvp",
        details: `Selected: ${autoAnswered.selectedOptionIds.join(", ")}, complete: ${autoAnswered.isComplete}`,
    })

    const otherOptionId = singleOptions[singleOptions.length - 1]!.id
    const selectedOther = updateClarificationSelection(singleQuestion, undefined, otherOptionId)
    results.push({
        name: "Selecting Other requires extra input",
        passed: !selectedOther.isComplete && !canAdvanceClarificationQuestion(singleQuestion, selectedOther),
        details: "Other selections should stay incomplete until custom text is provided.",
    })

    const otherWithText = updateClarificationCustomText(selectedOther, singleQuestion.id, "A concierge-first workflow")
    const completedOther = completeClarificationAnswer(singleQuestion, otherWithText)
    results.push({
        name: "Other answer completes after custom text and continue",
        passed: completedOther.isComplete,
        details: `Custom text: ${completedOther.customText}`,
    })

    let multiAnswer = createEmptyClarificationAnswer(multiQuestion.id)
    multiAnswer = updateClarificationSelection(multiQuestion, multiAnswer, "sms")
    multiAnswer = updateClarificationSelection(multiQuestion, multiAnswer, "email")
    results.push({
        name: "Multiple selection does not auto-complete",
        passed: !multiAnswer.isComplete && canAdvanceClarificationQuestion(multiQuestion, multiAnswer),
        details: `Selected: ${multiAnswer.selectedOptionIds.join(", ")}`,
    })

    const completedMulti = completeClarificationAnswer(multiQuestion, multiAnswer)
    const progress = getClarificationProgress(
        [singleQuestion, multiQuestion],
        {
            [singleQuestion.id]: autoAnswered,
            [multiQuestion.id]: completedMulti,
        }
    )
    results.push({
        name: "Progress collapses answered questions into summaries",
        passed: progress.answeredSummaries.length === 2 && progress.activeQuestion === null && progress.isReady,
        details: `Summaries: ${progress.answeredSummaries.length}, ready: ${progress.isReady}`,
    })

    const payload = buildClarificationAnswerMessage(
        [singleQuestion, multiQuestion],
        {
            [singleQuestion.id]: completedOther,
            [multiQuestion.id]: completedMulti,
        }
    )
    results.push({
        name: "Clarification payload serializes custom answers",
        passed: payload.includes("Other: A concierge-first workflow") && payload.includes("SMS, Email"),
        details: payload,
    })

    return results
}

if (require.main === module) {
    const results = runClarificationFlowTests()
    const passed = results.filter((result) => result.passed).length

    console.log("\nClarification Flow Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
        console.log(`  ${result.details}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)

    if (passed !== results.length) {
        process.exit(1)
    }
}

export { runClarificationFlowTests }
