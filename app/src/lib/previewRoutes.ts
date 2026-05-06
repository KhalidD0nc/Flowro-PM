const APP_ROUTE_PREFIX = "/app"

export function normalizePreviewPath(path: string) {
  const trimmedPath = path.trim()
  const absolutePath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`

  if (absolutePath === "/" || absolutePath === APP_ROUTE_PREFIX || absolutePath.startsWith(`${APP_ROUTE_PREFIX}/`)) {
    return absolutePath
  }

  return `${APP_ROUTE_PREFIX}${absolutePath}`
}
