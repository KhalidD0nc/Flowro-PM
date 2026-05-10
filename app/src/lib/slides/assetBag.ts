// AssetBag — pre-builds the base64 PNG/SVG bag passed into the sandbox as `assets.<key>`.
// The LLM never reaches the network or filesystem; it consumes only what we provide here.
//
// Phase 2b: accepts AssetRecord[] (vision-classified) in addition to SlidesSource[] for richer
// key selection based on usableAs[] rather than just the role field.
// Phase 3: product_screenshot assets are wrapped in an SVG browser-chrome device frame.

import type { AssetRecord, SlidesAssetBag, SlidesEvidence, SlidesSource } from "@/lib/slides/schema"

const ICON_SVGS: Record<string, string> = {
  icon_check: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#00E5C3" d="M9 16.17 5.53 12.7a1 1 0 0 0-1.41 1.41l4.18 4.18a1 1 0 0 0 1.41 0L20.88 8.12a1 1 0 1 0-1.41-1.41Z"/></svg>`),
  icon_x: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#9CA3AF" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12Z"/></svg>`),
  icon_arrow_right: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#0D1B3E" d="M12 4 10.59 5.41 16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8Z"/></svg>`),
  icon_rocket: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#00E5C3" d="M9.19 6.35a4.27 4.27 0 0 0-1.27 1.21A4 4 0 0 0 7 9.43c0 .85.4 1.43 1.07 2.46L9 13.4l-2 2.5L4.5 19l3.07-1.45 2.5-2L11.55 17a3.74 3.74 0 0 0 2.39 1c.78 0 1.46-.18 2.04-.55a4.42 4.42 0 0 0 1.55-1.62l5.06-9.07L17.42 1ZM18 8a2 2 0 1 1-2-2 2 2 0 0 1 2 2Z"/></svg>`),
  icon_chart_line: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#00E5C3" d="M3 17 9 11l4 4 8-8v3l-8 8-4-4-6 6v-3Z"/></svg>`),
  icon_users: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#0D1B3E" d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5s-3 1.34-3 3 1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62 0-.97.05a4.6 4.6 0 0 1 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z"/></svg>`),
  icon_shield: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#00E5C3" d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5Z"/></svg>`),
  icon_star: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#FBBF24" d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21Z"/></svg>`),
  icon_cog: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#5F6B7A" d="M19.43 12.98a7.34 7.34 0 0 0 0-1.96l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.34 7.34 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.49.42l-.38 2.65a7.34 7.34 0 0 0-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65a7.34 7.34 0 0 0 0 1.96l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1a7.34 7.34 0 0 0 1.69.98l.38 2.65a.5.5 0 0 0 .49.42h4a.5.5 0 0 0 .49-.42l.38-2.65a7.34 7.34 0 0 0 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>`),
  icon_bolt: svgData(`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#FBBF24" d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21Z"/></svg>`),
}

const MAX_IMAGE_BYTES = 5_000_000

// ─── Phase 3: SVG browser-chrome device frame ─────────────────────────────────
// Wraps a raster screenshot in a lightweight SVG browser chrome (title bar + traffic lights).
// Returns a data:image/svg+xml;base64 URL safe to pass to pptxgenjs addImage().

function addBrowserChrome(imageDataUrl: string, width = 1440, height = 900): string {
  const CHROME_H = 36
  const totalH = height + CHROME_H
  const svg = `<svg width="${width}" height="${totalH}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="frame-clip">
      <rect width="${width}" height="${totalH}" rx="6" ry="6"/>
    </clipPath>
  </defs>
  <g clip-path="url(#frame-clip)">
    <!-- Chrome bar -->
    <rect width="${width}" height="${CHROME_H}" fill="#E2E8F0"/>
    <!-- Traffic lights -->
    <circle cx="14" cy="18" r="5.5" fill="#FF605C"/>
    <circle cx="30" cy="18" r="5.5" fill="#FFBD44"/>
    <circle cx="46" cy="18" r="5.5" fill="#00CA4E"/>
    <!-- Address bar -->
    <rect x="90" y="9" width="${Math.round(width * 0.72)}" height="18" rx="3" fill="#FFFFFF" opacity="0.85"/>
    <!-- Screenshot -->
    <image x="0" y="${CHROME_H}" width="${width}" height="${height}" href="${imageDataUrl}" preserveAspectRatio="xMidYMid slice"/>
    <!-- Bottom border -->
    <rect x="0" y="${totalH - 1}" width="${width}" height="1" fill="#CBD5E1"/>
  </g>
</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`
}

export type AssetBagOptions = {
  sources?: SlidesSource[]
  assetRecords?: AssetRecord[]
  evidence: SlidesEvidence[]
  includeIcons?: string[]
  fetchExternal?: boolean
}

export async function buildAssetBag({
  sources = [],
  assetRecords,
  evidence,
  includeIcons,
  fetchExternal = true,
}: AssetBagOptions): Promise<SlidesAssetBag> {
  const bag: SlidesAssetBag = {}

  if (assetRecords?.length) {
    // ── Phase 2b path: use AssetRecord[] with usableAs-based key selection ──

    // Logo — first record with cover_logo usage
    const logoRecord = assetRecords.find(
      (r) =>
        r.usableAs.includes("cover_logo") ||
        r.role === "logo" ||
        (r.properties.looksLikeLogo && (r.dataUrl || r.url)),
    )
    if (logoRecord) {
      const data = logoRecord.dataUrl ?? (fetchExternal ? await fetchToDataUrl(logoRecord.url) : null)
      if (data) bag.logo = data
    }

    // Product screenshots — wrapped in device frame (Phase 3)
    const screenshots = assetRecords.filter(
      (r) => r.usableAs.includes("framed_screenshot") || r.role === "product_screenshot",
    )
    let screenshotIdx = 1
    for (const r of screenshots.slice(0, 4)) {
      const raw = r.dataUrl ?? (fetchExternal ? await fetchToDataUrl(r.url) : null)
      if (!raw) continue
      // Apply browser chrome only to raster images (not SVGs, which are likely logos)
      const isRaster = raw.startsWith("data:image/png") || raw.startsWith("data:image/jpeg") || raw.startsWith("data:image/webp")
      bag[`screenshot_${screenshotIdx}`] = isRaster ? addBrowserChrome(raw) : raw
      screenshotIdx++
    }

    // Color palette sources — expose as brand_colors key for the LLM
    const brandRecord = assetRecords.find(
      (r) => r.usableAs.includes("color_palette_source") || r.role === "brand_guideline",
    )
    if (brandRecord?.dataUrl) bag.brand_asset = brandRecord.dataUrl

    // Inline evidence images
    const evidenceImages = assetRecords.filter((r) => r.usableAs.includes("inline_evidence"))
    for (let i = 0; i < evidenceImages.slice(0, 6).length; i++) {
      const r = evidenceImages[i]
      const data = r.dataUrl ?? (fetchExternal ? await fetchToDataUrl(r.url) : null)
      if (data) bag[`image_${i + 1}`] = data
    }
  } else {
    // ── Legacy path: SlidesSource[] role-based selection ─────────────────

    const logoSource = sources.find((s) => s.role === "brand_asset" && (s.dataUrl || s.url))
    if (logoSource) {
      const data = logoSource.dataUrl ?? (fetchExternal ? await fetchToDataUrl(logoSource.url) : null)
      if (data) bag.logo = data
    }

    const screenshots = sources.filter((s) => s.role === "product_screenshot" && (s.dataUrl || s.url))
    for (let i = 0; i < screenshots.length && i < 4; i++) {
      const raw = screenshots[i].dataUrl ?? (fetchExternal ? await fetchToDataUrl(screenshots[i].url) : null)
      if (!raw) continue
      // Phase 3: apply browser chrome to legacy-classified screenshots too
      const isRaster = raw.startsWith("data:image/png") || raw.startsWith("data:image/jpeg") || raw.startsWith("data:image/webp")
      bag[`screenshot_${i + 1}`] = isRaster ? addBrowserChrome(raw) : raw
    }

    const images = sources.filter((s) => s.role === "image_library" && (s.dataUrl || s.url))
    for (let i = 0; i < images.length && i < 6; i++) {
      const data = images[i].dataUrl ?? (fetchExternal ? await fetchToDataUrl(images[i].url) : null)
      if (data) bag[`image_${i + 1}`] = data
    }
  }

  // Web evidence visual candidates (always use regardless of path)
  if (fetchExternal) {
    const candidates = evidence.flatMap((e) => e.visualCandidates ?? []).slice(0, 3)
    for (let i = 0; i < candidates.length; i++) {
      const data = await fetchToDataUrl(candidates[i].url)
      if (data) bag[`evidence_${i + 1}`] = data
    }
  }

  // Icons — pull from the static set
  const iconKeys = includeIcons?.length
    ? includeIcons
    : ["icon_check", "icon_x", "icon_arrow_right", "icon_chart_line", "icon_rocket", "icon_users"]
  for (const key of iconKeys) {
    if (ICON_SVGS[key]) bag[key] = ICON_SVGS[key]
  }

  return bag
}

export function describeAssetBag(bag: SlidesAssetBag): string {
  return Object.keys(bag)
    .map((key) => `- assets.${key}`)
    .join("\n")
}

async function fetchToDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Flowro Slides AssetBag/1.0" },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.startsWith("image/")) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length > MAX_IMAGE_BYTES) return null
    return `data:${ct.split(";")[0]};base64,${bytes.toString("base64")}`
  } catch {
    return null
  }
}

function svgData(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`
}

export const STATIC_ICON_KEYS = Object.keys(ICON_SVGS)
