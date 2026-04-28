type ActiveBuild = {
    controller: AbortController
}

const activeBuilds = new Map<string, ActiveBuild>()

export function registerActiveBuild(runId: string): AbortController {
    const controller = new AbortController()
    activeBuilds.set(runId, { controller })
    return controller
}

export function unregisterActiveBuild(runId: string): void {
    activeBuilds.delete(runId)
}

export function cancelActiveBuild(runId: string): boolean {
    const activeBuild = activeBuilds.get(runId)
    if (!activeBuild) return false
    activeBuild.controller.abort()
    return true
}
