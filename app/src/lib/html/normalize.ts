const HTML_PREFIX_PATTERN = /^\s*<!doctype html/i
const BODY_LIKE_PATTERN = /<\s*(html|head|body)\b/i

function escapeAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}

export function normalizeHtmlDocument(fragment: string, title = "Generated Stitch Screen"): string {
    const trimmed = fragment.trim()

    if (!trimmed) {
        throw new Error("Generated HTML is empty.")
    }

    if (HTML_PREFIX_PATTERN.test(trimmed) || BODY_LIKE_PATTERN.test(trimmed)) {
        return trimmed
    }

    const safeTitle = escapeAttribute(title)

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body>
${trimmed}
  </body>
</html>`
}
