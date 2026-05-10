// PPTX/PPT/KEY slide extraction — stub pending LibreOffice integration.
//
// Full implementation requires converting each slide to a PNG via:
//   libreoffice --headless --convert-to png <file>
// or a hosted converter (CloudConvert, Aspose Cloud, etc.).
// This is a known Phase 2b gap; pptxgenjs cannot read .pptx files, only write them.
// The stub returns an empty slide list so the rest of the pipeline degrades gracefully.

export type ReferenceSlide = {
  index: number
  thumbnail: string   // base64 PNG
  title?: string
  bullets?: string[]
  palette?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function extractFromDeck(_buf: Buffer, _filename: string): ReferenceSlide[] {
  // LibreOffice conversion not available in this environment.
  // Returning empty array — deck reference slides will not be surfaced in the prompt.
  return []
}
