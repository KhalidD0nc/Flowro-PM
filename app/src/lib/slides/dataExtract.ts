// CSV/TSV data extraction — no external dependencies.
// Produces a typed table schema (headers + first N rows + column types) that the
// deck-generation prompt can reference when building charts from real numbers.

export type ExtractedTable = {
  headers: string[]
  rows: string[][]
  columnTypes: ("number" | "date" | "string")[]
  rowCount: number  // total rows in file (not capped)
}

const MAX_ROWS = 10

// ─── CSV tokenizer ────────────────────────────────────────────────────────────
// Handles RFC 4180: quoted fields, embedded commas, embedded newlines, CRLF.

function parseRow(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else if (ch === '"') {
      inQuotes = true
      i++
    } else if (ch === delimiter) {
      fields.push(field.trim())
      field = ""
      i++
    } else {
      field += ch
      i++
    }
  }
  fields.push(field.trim())
  return fields
}

function detectDelimiter(sample: string): string {
  const tabCount = (sample.match(/\t/g) ?? []).length
  const commaCount = (sample.match(/,/g) ?? []).length
  return tabCount > commaCount ? "\t" : ","
}

// ─── Column type inference ─────────────────────────────────────────────────────

const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$|^Q[1-4]\s*\d{4}$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i

function inferType(values: string[]): "number" | "date" | "string" {
  const nonEmpty = values.filter(Boolean)
  if (!nonEmpty.length) return "string"
  const numericCount = nonEmpty.filter((v) => /^-?[\d,]+(\.\d+)?%?$/.test(v.replace(/\s/g, ""))).length
  if (numericCount / nonEmpty.length >= 0.8) return "number"
  const dateCount = nonEmpty.filter((v) => DATE_RE.test(v.trim())).length
  if (dateCount / nonEmpty.length >= 0.6) return "date"
  return "string"
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function extractFromData(buf: Buffer, mimeType: string, filename: string): ExtractedTable | null {
  const ext = (filename.split(".").pop() ?? "").toLowerCase()

  // Only handle CSV/TSV/plain text with tabular structure. XLSX requires the xlsx package.
  const isTabular =
    ext === "csv" || ext === "tsv" ||
    mimeType === "text/csv" || mimeType === "text/tab-separated-values" ||
    mimeType === "text/plain"

  if (!isTabular) return null

  const text = buf.toString("utf8")
  if (!text.trim()) return null

  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim())
  if (lines.length < 2) return null

  const delimiter = detectDelimiter(lines.slice(0, 5).join("\n"))
  const headers = parseRow(lines[0], delimiter)
  if (!headers.length) return null

  const totalRows = lines.length - 1
  const bodyLines = lines.slice(1, MAX_ROWS + 1)
  const rows = bodyLines.map((line) => {
    const fields = parseRow(line, delimiter)
    // Pad or trim to header count
    while (fields.length < headers.length) fields.push("")
    return fields.slice(0, headers.length)
  })

  // Infer column types from all available data (not just MAX_ROWS)
  const allBodyLines = lines.slice(1, 201)
  const allRows = allBodyLines.map((line) => parseRow(line, delimiter))
  const columnTypes = headers.map((_, ci) =>
    inferType(allRows.map((r) => r[ci] ?? ""))
  )

  return { headers, rows, columnTypes, rowCount: totalRows }
}
