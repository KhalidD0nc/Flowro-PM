export type BuildStartPlanState = {
    status?: "draft" | "approved"
} | null | undefined

export type BuildStartPlanError = {
    error: string
    status: 409
}

export function getBuildStartPlanError(planDoc: BuildStartPlanState): BuildStartPlanError | null {
    if (!planDoc || planDoc.status !== "approved") {
        return { error: "Approve the project plan before starting build.", status: 409 }
    }
    return null
}
