import type { BrandColors } from "@/lib/slides/schema"

// ─── Vision dominant-color extraction (Phase 2b / Phase 3) ───────────────────
// When a vision classifier returns dominantColors[], use them to build BrandColors.
// This takes priority over SVG parsing for raster images and gives the LLM accurate
// hex values to use in the slideCode palette.

export function extractBrandColorsFromDominant(dominantColors: string[]): BrandColors | null {
  const colors = dominantColors.filter((c) => /^#[0-9a-f]{6}$/i.test(c))
  if (!colors.length) return null

  const chromatic = colors.filter((c) => !isNearWhite(c) && !isNearBlack(c) && !isNeutralGray(c))
  const light = colors.filter(isNearWhite)
  if (!chromatic.length) return null

  return {
    primary: chromatic[0],
    accent: chromatic.find((c) => c !== chromatic[0]) ?? chromatic[0],
    background: light[0] ?? "#ffffff",
  }
}

// ─── SVG color extraction (server-safe, no canvas required) ──────────────────

const HEX_COLOR_RE = /#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi

function expand3(hex3: string): string {
  return `#${hex3[0]}${hex3[0]}${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}`
}

function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function isNearWhite(hex: string): boolean {
  return hexLuminance(hex) > 0.85
}

function isNearBlack(hex: string): boolean {
  return hexLuminance(hex) < 0.05
}

function isNeutralGray(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const maxC = Math.max(r, g, b)
  const minC = Math.min(r, g, b)
  return maxC - minC < 20
}

function extractSvgColors(svgText: string): string[] {
  const colors = (svgText.match(HEX_COLOR_RE) ?? []).map((color) => {
    const normalized = color.toLowerCase()
    return normalized.length === 4 ? expand3(normalized.slice(1)) : normalized
  })

  // Deduplicate while preserving first-occurrence order
  return [...new Set(colors)]
}

function pickBrandColors(allColors: string[]): BrandColors | null {
  const chromatic = allColors.filter((c) => !isNearWhite(c) && !isNearBlack(c) && !isNeutralGray(c))
  const light = allColors.filter(isNearWhite)

  if (!chromatic.length) return null

  // Primary = most saturated chromatic color (appear early in SVG = likely the brand color)
  const primary = chromatic[0]

  // Accent = second distinct chromatic color, or a lighter variant of primary
  const accent = chromatic.find((c) => c !== primary) ?? primary

  // Background = lightest available color, or white fallback
  const background = light[0] ?? "#ffffff"

  return { primary, accent, background }
}

export function extractBrandColorsFromSvg(dataUrl: string): BrandColors | null {
  try {
    let svgText: string
    if (dataUrl.startsWith("data:image/svg+xml;base64,")) {
      const b64 = dataUrl.slice("data:image/svg+xml;base64,".length)
      svgText = Buffer.from(b64, "base64").toString("utf-8")
    } else if (dataUrl.startsWith("data:image/svg+xml,")) {
      svgText = decodeURIComponent(dataUrl.slice("data:image/svg+xml,".length))
    } else {
      return null
    }
    const colors = extractSvgColors(svgText)
    return pickBrandColors(colors)
  } catch {
    return null
  }
}

// ─── Client-side canvas extraction (browser only) ────────────────────────────

export async function extractBrandColorsFromImage(dataUrl: string): Promise<BrandColors | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    // Server-side: attempt SVG parsing, skip raster
    if (dataUrl.startsWith("data:image/svg+xml")) {
      return extractBrandColorsFromSvg(dataUrl)
    }
    return null
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const SIZE = 64
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext("2d")
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE)
        const sampled: string[] = []
        for (let i = 0; i < data.length; i += 4 * 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          if (a < 128) continue // skip transparent
          const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
          sampled.push(hex)
        }
        resolve(pickBrandColors([...new Set(sampled)]))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
