# Flowro Slides — Quality Overhaul Roadmap

> **Goal:** Make Flowro generate slides that rival Claude web, Genspark, and Gamma — premium visual quality, editorial content, brand-correct assets, and zero generic output.

---

## Why Slides Are Bad Right Now

Three layers of failure that compound each other:

1. **Schema is too permissive** — allows 900+ words per slide; premium standard is 25–30 words
2. **LLM prompts are vague** — say "concise" but never define it; AI fills every character limit it's given
3. **One chart type for everything** — horizontal bars rendered regardless of whether the data is a trend, proportion, funnel, or comparison
4. **Renderer has 6 static layouts** — Gamma has 20+, Genspark generates a unique visual per slide
5. **No brand intelligence** — logo dropped randomly, no color extraction, no device frames on screenshots

The architecture gap vs. Claude web: Claude generates raw HTML/CSS per slide (full visual control). Flowro cages Claude in a JSON schema rendered by a fixed template.

---

## Milestone 0 — Schema & Prompt Foundation
**Status: `DONE`**
**Impact: 🔴 Critical — every subsequent milestone depends on this**

This milestone makes the AI produce better content before any visual changes. Fastest path to meaningful quality improvement.

### 0.1 — Tighten Schema Limits
File: `app/src/lib/slides/schema.ts`

| Field | Current | Target | Reason |
|---|---|---|---|
| `title` | 120 chars | **60 chars** | ~10 words max — assertion, not sentence |
| `claim` | 280 chars | **110 chars** | One sharp sentence, ~16 words |
| `body[]` count | 1–5 items | **1–3 items** | 3 bullets max per slide |
| `body[]` per item | 180 chars | **72 chars** | ~10 words — fragment, not sentence |
| `proof.title` | 160 chars | **80 chars** | Scannable headline only |
| `proof.description` | 420 chars | **160 chars** | 25 words max — AI shouldn't write paragraphs here |
| `proof.data.label` | 80 chars | **40 chars** | 5-word max label |
| `proof.data.value` | 140 chars | **60 chars** | Number or short phrase |

### 0.2 — Rewrite Story Generation Prompt
File: `app/src/lib/slides/story.ts`

Add these rules to the system prompt:
- Titles are **assertive claims**, max 8 words. Not topic labels. BAD: "Q3 Results" → GOOD: "Revenue exceeded forecast by 12%"
- Claims: one specific falsifiable sentence, max 16 words
- Vary layouts: never more than 2 consecutive `claim_visual` slides
- Always prefer `chart`, `comparison`, or `timeline` over `source_backed_visual`
- Outline is a **designed argument** — each slide advances the story, none repeats the previous

### 0.3 — Rewrite Deck Generation Prompt
File: `app/src/lib/slides/deck.ts`

**Text rules (add verbatim to system prompt):**
```
Body bullets: max 3 items, each under 10 words. Use fragments: "Revenue up 3× in Q4",
not sentences. Cut every word that adds no signal.

Claim: one sharp assertion, max 16 words. No hedging. No "we believe that".

Title: echo and amplify the claim in ≤8 words.
```

**Chart data rules:**
```
Charts: every data point MUST have a numericValue (integer or decimal).
Minimum 4 data points. Labels max 5 words. Values are real numbers or percentages.
The highest bar tells the story — name it clearly.
```

**Comparison rules:**
```
Comparison: two sides MUST have named headers (e.g. "Without Flowro" / "With Flowro",
"Old Way" / "New Way"). Each side max 3 items. Last item in the right column = the win.
```

**Timeline rules:**
```
Timeline: 4–5 steps. Each step = a verb phrase (action, not noun). Max 6 words per step.
```

**Layout variety enforcement:**
```
Slide 1: always layout=cover. Last slide: always layout=closing.
Middle slides: include at least one timeline or comparison when content supports it.
Never more than 2 consecutive slides with layout=claim_visual.
```

**Theme rules:**
```
Derive accent color from attached brand_asset or style_template_guide when available.
Never use generic blue (#0066ff range) as accent unless the brand explicitly uses it.
background + foreground must have contrast ratio ≥ 4.5:1.
```

---

## Milestone 1 — Chart System (Multiple Types, Context-Aware)
**Status: `IN PROGRESS`**
**Impact: 🔴 Critical — charts are the most visible proof of quality**

Files: `app/src/lib/slides/schema.ts`, `app/src/lib/slides/deck.ts`, `app/src/components/workspace/SlideRenderer.tsx`

### Core Principle
Charts are not one-size-fits-all. The chart type must match the **data story** being told. Currently Flowro renders every "chart" as horizontal bars regardless of context — that's wrong.

### 1.1 — Add `chartType` to Schema
File: `app/src/lib/slides/schema.ts`

Add `chartType` field to `SlidesProofObject`:
```typescript
chartType?: "bar_horizontal" | "bar_vertical" | "line" | "area" | "donut" | "progress" | "scatter" | "funnel"
```

Default: `"bar_horizontal"` (existing behavior preserved as fallback).

### 1.2 — Teach the AI When to Use Each Chart Type
File: `app/src/lib/slides/deck.ts` — add to deck system prompt:

```
When proof.type is "chart", choose chartType based on the data story:

bar_horizontal  — comparing discrete categories side by side (e.g. feature scores, market share by company)
bar_vertical    — showing ranked values or distribution across categories with short labels (e.g. monthly revenue by quarter)
line            — showing a trend over time with 5+ data points (e.g. weekly active users, churn rate over months)
area            — same as line but emphasizing volume/cumulative growth (e.g. ARR growth, total signups over time)
donut           — showing part-to-whole proportions, 2–5 segments (e.g. revenue by segment, traffic sources)
progress        — showing progress toward a single goal or milestone (e.g. "78% of target reached")
scatter         — showing correlation between two variables (e.g. deal size vs. close rate)
funnel          — showing conversion drop-off through sequential stages (e.g. sign-up → activation → paid)

Rules:
- Use line/area for anything time-based with 5+ points
- Use bar_horizontal for any comparison with long category labels
- Use bar_vertical for short labels and ranked/sequential data
- Use donut only for proportions — never for trend or comparison data
- Use funnel only for conversion or pipeline data (stages must be sequential)
- NEVER use bar_horizontal as a default for time-series data
```

### 1.3 — Build Each Chart Renderer
File: `app/src/components/workspace/SlideRenderer.tsx`

Render logic dispatches on `proof.chartType` (or infers from data shape if not set).

---

#### `bar_horizontal` (redesigned — replaces current broken version)
```
WHO   ████████████████████ 47%    ← value label ON bar end
WHAT  ████████████ 28%
WHY   ████████ 19%
HOW   ████ 6%
```
- Bar: `h-6`, `rounded-full`, accent color, opacity gradient (max = 100%, others = 65%)
- Label: `w-28 shrink-0`, `0.8rem semibold`, right-aligned
- Value: `0.72rem bold white`, inside bar at right edge
- Background track: `bg-black/6 rounded-full` full width
- Grid: 4 faint vertical lines at 25% intervals
- Max 6 rows

---

#### `bar_vertical`
```
     █
  █  █  █
  █  █  █  █
 Q1  Q2  Q3  Q4
```
- Equal-width columns, bars grow upward from baseline
- Value label above each bar: `0.72rem bold`
- Axis label below: `0.75rem muted`
- Highlight tallest bar in full accent; others at 65%
- Max 8 bars; label rotates -45° if > 5 items

---

#### `line`
- SVG polyline connecting data points
- Points: `r=3` circles in accent color
- Line: `stroke-width: 2`, accent color
- X-axis: category labels (`0.7rem muted`)
- Y-axis: auto-scaled min/max with 3 reference lines (`stroke-dasharray`)
- Last point: larger circle + bold value label callout
- Max 12 points

---

#### `area`
- Same as `line` but with `fill` polygon from line to baseline
- Fill: accent at 15% opacity
- Line: accent at 100%
- Emphasizes cumulative volume vs. point-to-point trend

---

#### `donut`
- SVG arc segments, `stroke-width: 28`, `r: 40`
- Each segment: accent family (full, 75%, 50%, 30%, 15% opacity) — no rainbow colors
- Center text: largest segment value (big) + its label (small muted)
- Legend: right of chart, dots + labels + values
- Max 5 segments; extras collapsed into "Other"

---

#### `progress`
- Single thick horizontal bar (or circular gauge)
- Large percentage number centered: `3rem bold`
- Bar: accent fill, `h-3 rounded-full`
- Goal label below: `0.75rem muted` ("of $2M ARR target")
- Optional milestone markers on track

---

#### `funnel`
- Stacked trapezoid shapes narrowing downward
- Each stage: label left + value right + conversion % badge between stages
- Colors: accent at decreasing opacity (top = 100%, bottom = ~30%)
- Drop-off arrow with `%` between each stage pair
- Max 6 stages

---

#### `scatter`
- SVG dots on XY axes
- X-axis label + Y-axis label
- Dot size: uniform or scaled by optional `group` weight
- Color: accent for main cluster, muted for outliers
- Optional trend line: `stroke-dasharray`, muted color
- Max 20 points

---

### 1.4 — Smart Chart Type Inference (Fallback)
If `chartType` is missing or invalid, infer from data shape:
```typescript
function inferChartType(proof: SlidesProofObject): ChartType {
  const items = proof.data ?? []
  const hasTime = items.some(d => /\b(jan|feb|mar|q[1-4]|20\d\d|week|month|day)\b/i.test(d.label))
  const isProportional = items.every(d => d.numericValue) && sum(items) >= 95 && sum(items) <= 105
  const isFunnel = items.every((d, i) => i === 0 || d.numericValue! <= items[i - 1].numericValue!)

  if (isFunnel && items.length >= 3) return "funnel"
  if (isProportional && items.length <= 5) return "donut"
  if (hasTime && items.length >= 5) return "line"
  if (items.length === 1) return "progress"
  return "bar_horizontal"
}
```

---

### 1.5 — Comparison, Timeline, Diagram (also redesigned)

#### Comparison
- Left column header: muted uppercase ("WITHOUT FLOWRO")
- Right column header: accent uppercase ("WITH FLOWRO")
- Left items: `—` prefix, muted text
- Right items: `✓` prefix, accent text
- Headers: `1rem bold uppercase tracking-wide`

#### Timeline
- Horizontal flow with connecting lines
- Each step: accent pill number → bold title → short description
- Connector: `border-t-2 border-accent/40`
- Final step: full accent background fill

#### Diagram
- Each node: accent-bordered box, label max 4 words
- Directional chevron arrows between nodes
- Last node: filled accent background (= outcome)

---

## Milestone 2 — Layout System Expansion
**Status: `TODO`**
**Impact: 🟠 High — eliminates the "all slides look the same" problem**

File: `app/src/components/workspace/SlideRenderer.tsx`
Supporting: `app/src/lib/slides/schema.ts`, `app/src/lib/slides/deck.ts`

### Current: 6 layouts
`cover`, `claim_visual`, `comparison`, `timeline`, `data_table`, `closing`

### Target: 12+ layouts

| New Layout | Description | When to Use |
|---|---|---|
| `big_number` | Giant metric centered, claim below, 1-2 supporting bullets | Stats, KPIs, market size |
| `side_by_side` | Two equal columns, each with icon + title + 3 bullets | Feature comparison, dual concept |
| `quote_highlight` | Large pull quote, source attribution, supporting context | Testimonials, analyst quotes |
| `timeline_vertical` | Vertical stepped timeline (for 5+ steps) | Process, roadmap, history |
| `image_left` | Full-bleed image left 50%, content right 50% | Product proof, real examples |
| `image_full` | Full-bleed background image with overlay + centered text | Section breaks, emotional beats |

### Cover Slide Improvements
- Remove `max-w-[10ch]` constraint — title should breathe
- Accent geometric shape (stripe or angular cutout) as right-panel background
- Subtitle: `1.4rem`, light weight, max 12 words
- Deck title feeds into large hero treatment: `clamp(2.5rem, 6vw, 7rem)`

---

## Milestone 3 — Brand Intelligence
**Status: `TODO`**
**Impact: 🟠 High — makes every deck feel "made for this company"**

### 3.1 — Automatic Color Extraction from Logo
File: `app/src/lib/slides/sourceIntake.ts`

When a `brand_asset` source is classified:
- Extract dominant and accent colors from the image using canvas pixel analysis
- Store as `brandColors: { primary, accent, background }` on the source
- Pass `brandColors` to deck generation prompt
- Deck prompt instructed: "Use these exact hex values for theme, do not invent colors"

### 3.2 — Logo Placement Rules
File: `app/src/components/workspace/SlideRenderer.tsx`
File: `app/src/lib/slides/deck.ts`

Professional logo rules (backed by brand guideline research):
- **Cover slide**: Logo rendered prominently (15–25% visual presence), bottom-left or centered
- **Closing slide**: Logo rendered at same position as cover
- **All other slides**: NO logo — this is the standard (recurring logos = advertising, not design)
- **Size enforcement**: Logo container = `h-12 w-auto` max on cover, `h-8` on closing
- **Clear space**: Minimum padding equal to logo height on all sides
- **Format priority**: SVG → PNG with transparency → fallback to text name

Logo is passed as a special `brand_asset` source and the renderer must identify and handle it separately from evidence images.

### 3.3 — Product Screenshot Treatment
File: `app/src/components/workspace/SlideRenderer.tsx`

When `proof.type === "image"` and source role is `product_screenshot`:
- Wrap in a browser/laptop device frame (`rounded-t-lg bg-[#1a1a1a]` header bar with 3 dots)
- Add subtle drop shadow: `shadow-2xl`
- Never render raw screenshots without frame — looks like a bug report

### 3.4 — Image Overlay Rule
When a `visualAsset` with `kind=source_image` or `kind=web_image` is used as a background:
- Apply `bg-black/50` overlay layer between image and text
- `object-fit: cover`, `object-position: center` default
- For images with a face or focal point: expose `object-position` from the visual asset metadata

---

## Milestone 4 — Post-Generation Validation Pass
**Status: `TODO`**
**Impact: 🟡 Medium — catches layout failures before user sees them**

Genspark's "Fix Layout" is the inspiration. After deck generation, run a validation pass:

File: `app/src/lib/slides/deck.ts` (new `validateSlidesDeck()` function)

Rules to enforce:
- `body[]` items over 72 chars → truncate at last word boundary
- Slides with `body.length > 3` → trim to 3 items
- `claim` over 110 chars → trim to last sentence boundary
- Charts with no `numericValue` → assign equally-spaced fallback values (1, 2, 3...) so bars render with width
- Comparison with no left/right headers in `proof.data` → inject "Option A" / "Option B" labels
- `layout=claim_visual` more than 2× in a row → flag in `deck.diagnostics` for prompt retry
- No cover slide → inject one
- No closing slide → inject one

---

## Milestone 5 — Visual Polish & Typography
**Status: `TODO`**
**Impact: 🟡 Medium — makes good slides look great**

File: `app/src/components/workspace/SlideRenderer.tsx`

### Typography Scale Audit
Current sizes are too small across the board:

| Element | Current | Target |
|---|---|---|
| Chart labels | `0.65rem` | `0.8rem` |
| Proof type badge | `0.62rem` | `0.72rem` |
| Body bullets | `clamp(0.7rem, 0.92vw, 1.05rem)` | `clamp(0.85rem, 1vw, 1.1rem)` |
| Claim (standard slide) | `clamp(0.95rem, 1.45vw, 1.65rem)` | `clamp(1.05rem, 1.6vw, 1.8rem)` |

### Proof Panel Improvements
- If `proof.description` is empty or < 20 chars: hide the description area, give space back to data rows
- Proof type badge: change from `replace(/_/g, " ")` raw text → human-readable labels:
  - `source_backed_visual` → `EVIDENCE`
  - `chart` → `DATA`
  - `comparison` → `COMPARISON`
  - `timeline` → `TIMELINE`
  - `diagram` → `FLOW`
  - `table` → `TABLE`

### Cover Slide Visual
- Accent stripe on right panel: angular geometric shape via CSS `clip-path` or `border` trick
- Right panel background: `accent` at 15% opacity as base, stripe at 100% accent as overlay element
- Deck title line-height tightened: `leading-[0.9]` for big display type (looks intentional, not accidental)

---

## Implementation Order

Execute milestones in this order. Each one builds on the previous:

```
M0 (Prompt + Schema)  ← Start here. Highest ROI, zero visual work.
      ↓
M1 (Charts + Proofs)  ← Biggest visible quality jump.
      ↓
M3 (Brand: Logo + Screenshots + Colors)  ← Makes it feel "made for you".
      ↓
M2 (Layout Expansion)  ← Eliminates visual monotony.
      ↓
M4 (Validation Pass)  ← Catches failures before they ship.
      ↓
M5 (Typography Polish)  ← Final 10% that separates good from great.
```

---

## Definition of Done

A Flowro slide deck is "great" when it passes all of these:

- [ ] Body text across all slides ≤ 30 words per slide
- [ ] Every chart uses the correct type for its data story (line for trends, donut for proportions, funnel for conversion, bar for comparisons)
- [ ] Every chart has visible value labels and ≥ 4 data points with `numericValue`
- [ ] No two consecutive slides share the same layout
- [ ] Logo appears only on cover and closing slides, correctly sized
- [ ] Product screenshots are wrapped in a device frame
- [ ] Accent color derives from the uploaded brand asset (when provided)
- [ ] Cover slide title fills its column without `max-width` clipping
- [ ] 3-second test: the main claim is identifiable in 3 seconds on every slide
- [ ] No `source_backed_visual` on more than 1 slide unless evidence is actually attached

---

## Key Files

```
app/src/lib/slides/schema.ts              — M0: limits
app/src/lib/slides/story.ts               — M0: story prompt
app/src/lib/slides/deck.ts                — M0: deck prompt + M4: validation
app/src/lib/slides/sourceIntake.ts        — M3: brand color extraction
app/src/components/workspace/SlideRenderer.tsx  — M1, M2, M3, M5: renderer
app/src/__tests__/slidesDeckTests.ts      — verification
```
