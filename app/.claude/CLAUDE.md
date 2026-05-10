      # Flowro Slides — Path A: Code-as-Design Architecture

      > **Goal:** Match Claude.ai web slide quality. End the era of templated, generic-looking decks. Give the LLM full visual control by letting it emit executable design code, not fill-in-the-blank JSON.

      ---

      ## Why we are rewriting (root cause)

      The current pipeline cages the LLM:

      1. LLM emits JSON conforming to `slidesStructuredSlideSchema` ([schema.ts:189](app/src/lib/slides/schema.ts:189))
      2. JSON has a fixed `layout` enum of 12 templates ([schema.ts:199-212](app/src/lib/slides/schema.ts:199))
      3. `SlideRenderer.tsx` paints those templates with React
      4. `export.ts` re-paints the same JSON via pptxgenjs (drawing rectangles where charts should be — [export.ts:159-195](app/src/lib/slides/export.ts:159))

      The reference deck the user wants to match (`/Users/khalidr/Downloads/flowro_deck.js`) is built from **primitives at arbitrary coordinates**: low-opacity oval blobs for decoration, layered cards, accent bars, status pills, FontAwesome icons rendered to PNG, real `pres.charts.BAR` charts, mock UI dashboards composed from rectangles, alternating dark/light backgrounds per slide. The current schema cannot express any of that. There is no `shapes[]`, `icons[]`, `freeform`, per-slide `background`, or arbitrary x/y/w/h vocabulary. There never can be — every enum we add is another bar of the cage.

      Templates do not produce designed slides. Composition produces designed slides. Only the LLM has the design judgment to compose. The current architecture takes that judgment away from it.

      **Path A removes the cage entirely.** The LLM writes the code that builds the slide.

      ---

      ## What we want to achieve

      A user types a prompt + uploads a brand asset. They get back a deck where:

      - Every slide is uniquely composed — no two slides are visually identical "templates"
      - Decorative elements (blobs, accent bars, geometric shapes) appear where they aid hierarchy
      - Charts are real, native pptxgenjs charts with grids, axis labels, data labels — not rectangles pretending to be bars
      - Icons appear inline, color-matched to the brand
      - Backgrounds alternate (navy / light / dark) to create rhythm across the deck
      - The exported `.pptx` is **editable in PowerPoint** — shapes are real shapes, charts are real charts, text is real text
      - Browser preview is **pixel-faithful to the export** — what you see is what you get
      - The deck visually rivals the reference deck at `/Users/khalidr/Downloads/flowro_deck.js`

      The 3-second test: a viewer can identify the main claim of any slide in 3 seconds. The 30-second test: a viewer cannot tell whether the deck was made by Flowro or by a designer in Keynote.

      ---

      ## Architecture

      ### Single source of truth: pptxgenjs as the slide IR

      The LLM emits JavaScript that calls a constrained subset of `pptxgenjs`. That code is the slide. It is rendered two ways from the same source:

      ```
                        ┌─────────────────────────────────────┐
                        │  LLM (Claude / GPT)                 │
                        │  emits: pres.addSlide() + shapes +  │
                        │  charts + images + text             │
                        └────────────────┬────────────────────┘
                                    │
                        slideCode.js (per slide, sandboxed)
                                    │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
            ┌───────▼────────┐                  ┌─────────▼────────┐
            │ Browser preview │                  │  pptx export    │
            │ pptx-to-DOM     │                  │  pptxgenjs      │
            │ interpreter →   │                  │  writeFile()    │
            │ HTML/SVG/CSS    │                  │  → .pptx        │
            └─────────────────┘                  └──────────────────┘
      ```

      Why pptxgenjs as the IR and not raw HTML/CSS:
      - The user's deliverable is `.pptx`. If we use HTML and rasterize to images for export, we get an unmaintainable deck that is just screenshots — uneditable, blurry, large file size.
      - pptxgenjs primitives map naturally to PowerPoint shapes. Native shapes are editable, scalable, accessible.
      - The reference deck the user pasted is *already* pptxgenjs code. The LLM has clearly seen and is good at this format.
      - We only need to write **one** preview interpreter; the export is free (pptxgenjs already does it).

      ### What the LLM emits

      A plain JS module per deck, exporting an async `build(pres, assets)` function:

      ```js
      // slide source emitted by the LLM
      export async function build(pres, assets) {
      const C = { navy: "0D1B3E", accent: "00E5C3", /* ... */ }

      // Slide 1 - Cover
      {
      const s = pres.addSlide()
      s.background = { color: C.navy }
      s.addShape(pres.shapes.OVAL, { x: 6.8, y: -1.2, w: 4.8, h: 4.8,
            fill: { color: C.blue, transparency: 82 }, line: { color: C.blue, width: 0 } })
      s.addImage({ data: assets.logo, x: 0.65, y: 0.55, w: 0.52, h: 0.52 })
      s.addText("Workflow Intelligence\nThat Pays for Itself.", {
            x: 0.65, y: 1.95, w: 6.5, h: 1.6,
            fontSize: 36, bold: true, color: C.white, fontFace: "Trebuchet MS",
      })
      s.addChart(pres.charts.BAR, [...], { /* real chart options */ })
      // ...
      }
      // Slide 2 ...
      }
      ```

      `assets` is a pre-built bag of base64 PNGs the host prepares before execution: brand logo, requested icons, evidence images. The LLM never reaches the network or filesystem — it consumes only what the host provides.

      ### Sandboxed execution

      This is the obvious risk: arbitrary LLM code. Mitigations:

      1. **Static AST gate.** Parse the emitted JS with `acorn`. Reject the module if it contains: `import` / `require`, function declarations outside the exported `build`, `eval`, `new Function`, property access matching `__proto__|constructor|prototype`, any `await` other than on the provided `pres` API, any global identifier other than the allowlist (`pres`, `assets`, `Math`, `Number`, `String`, `Array`, `Object.{keys,values,entries}`, `console.log` mapped to a buffered logger).
      2. **VM execution.** Run the validated module in `node:vm` with an empty context. Inject only `pres` (a wrapped pptxgenjs instance) and `assets`. No `process`, no `globalThis` leakage.
      3. **Resource limits.** Wall clock 8 s. Slide count cap 24 (already enforced). Per-slide shape count cap (e.g. 60). Total addImage data cap 6 MB. Hard kill on overflow.
      4. **No filesystem write inside the sandbox.** The wrapped `pres` does not expose `writeFile`; the host calls `pres.write({ outputType: "nodebuffer" })` after `build` returns.

      A failed gate or runtime error falls back to a single retry with the error embedded in the prompt ("the previous attempt threw X — fix it"). After two failures we fall back to a deterministic minimal deck and surface a `needs_attention` status.

      ### Browser preview: the interpreter

      Preview is a small JS module that takes the same `slideCode.js` and renders it to DOM/SVG instead of pptx. We write a `PreviewPres` shim with the same surface (`addSlide`, `addShape`, `addText`, `addImage`, `addChart`, `shapes.{OVAL,RECTANGLE,LINE,ROUNDED_RECTANGLE}`, `charts.{BAR,LINE,DOUGHNUT,SCATTER,AREA}`). Each call pushes a primitive into a per-slide list; the preview component renders the list as absolutely-positioned divs and inline SVG.

      Coordinates: pptxgenjs uses inches on a 10×5.625 canvas. Preview multiplies by a px-per-inch scale (configurable for the editor's current zoom). Fonts, colors, transparency, line weight all map directly.

      Charts: render as `<svg>` using a tiny renderer (~200 LOC) that handles BAR / LINE / DOUGHNUT / SCATTER / AREA from the same `chartData` the LLM passed.

      This interpreter is the only new significant code we own. Everything else is delegation to pptxgenjs.

      ### What becomes secondary

      - `app/src/lib/slides/schema.ts` still persists legacy `slides[]`, but `slideCode` + `assets` are now the primary design payload for previews and PPTX export.
      - `app/src/lib/slides/export.ts` prefers sandboxed slideCode for PPTX. The JSON exporter stays as fallback and for current PDF support.
      - `app/src/components/workspace/SlideRenderer.tsx` is no longer the primary preview path for new decks; `SlideCanvas` renders decks with `slideCode`, and `SlideRenderer` remains only as compatibility fallback.
      - `app/src/__tests__/slidesSandboxTests.ts` now carries the core sandbox/preview safety checks. `slidesDeckTests.ts` still covers legacy normalization and fallback behavior during the transition.

      The goal is still to remove the cage, but deletion is gated behind Phase 4 validation/retry so the product keeps a usable fallback while slideCode reliability hardens.

      ---

      ## Implementation status (2026-05-10)

      | Phase | Status | Notes |
      |---|---|---|
      | **Phase 1 — Sandbox + IR + preview** | ✅ **Done** | `sandbox.ts`, `previewPres.ts`, `SlideCanvas.tsx`, `sampleDecks.ts`, 19 tests passing (`slidesSandboxTests.ts`). Static gate rejects `import`, `require`, `eval`, `Function`, `process`, `__proto__`, `fetch`, `XMLHttpRequest`. `node:vm` for server execution, `new Function` for browser preview. Wall-clock timeout enforced. |
      | **Phase 2a — slideCode generation + assets (core)** | ✅ **Done** | `generateSlidesDeckCode()` in `deck.ts` with full pptxgenjs-teaching prompt (API declaration + 3 worked examples + design rules). `assetBag.ts` builds logo/screenshot/icon PNG bag. Generation route attaches `slideCode` + `assets` to the deck; export route prefers slideCode → real native pptx shapes/charts. Schema extended additively (`slideCode?`, `assets?`, sandbox diagnostics). Legacy JSON pipeline still runs in parallel as fallback. |
      | **Phase 2b — Vision-driven asset intake** | ✅ **Done** | Full multi-stage pipeline: `visionClassify.ts` (multimodal OpenRouter call → role + dominantColors + looksLikeLogo + usableAs), `documentExtract.ts` (TXT/MD/PDF heuristic text extraction), `dataExtract.ts` (manual CSV/TSV parser → typed table schema), `deckExtract.ts` (stub; LibreOffice/hosted converter deferred), `intentParse.ts` (regex intent matcher: "use this as logo" etc.). `sourceIntake.ts` rewritten as `analyzeAssets()` running all passes in parallel with intent-reconcile at the end. `AssetRecord` type added to `schema.ts`. XLSX, full-fidelity PDF, and PPTX→PNG remain pending (no pdfjs-dist/mammoth/LibreOffice). |
      | **Phase 2c — End-to-end slideCode wiring** | ✅ **Done** | `SlidesWorkspace` now renders `SlideCanvas` whenever `deck.slideCode` exists, with `SlideRenderer` retained only as fallback for old decks or preview execution failure. Initial `/slides/story`, `/slides/generate`, and `/slides/edit` all attach or refresh `slideCode` through `attachSlideCodeToDeck()`. Added `/api/projects/[projectId]/slides/regenerate-code` plus a workspace "Regenerate design" action. Split browser execution into `sandboxBrowser.ts` so the client bundle does not import `node:vm`. |
      | **Phase 3 — Brand intelligence** | ✅ **Done** | Vision `dominantColors` drive the deck theme via `themeFromAssetRecords()` — exact hex values propagated into the slideCode prompt. Logo placement hardened: `assets.logo` restricted to cover + closing via prompt rule. Product screenshots wrapped in SVG browser-chrome device frame (`addBrowserChrome()` in `assetBag.ts`). Real CSV chart data injected into the prompt via `dataContextFromRecords()`. `colorExtract.ts` gains `extractBrandColorsFromDominant()`. |
      | **Phase 4 — Validation & retry loop** | ✅ **Done** | `generateSlidesDeckCode()` now executes emitted slideCode against `PreviewPres`, validates captured primitives for text overflow, missing text, missing shapes, and missing decorative shapes, retries once with rejection reasons, then falls back to deterministic slideCode if the retry still fails. Added `primitiveValidation.ts` and Phase 4 sandbox tests. |
      | **Phase 5 — Polish + traceability** | ✅ **Done** | Added no-brand theme presets (navy/forest/mono/warm), persisted slideCode attempt/request metadata, speaker-note preview plumbing from `PreviewPres`, and deck-navigator thumbnails now reuse one captured preview primitive deck instead of re-running slideCode per thumbnail. Added structured logs for Slides LLM/search requests. |

      ### Files added in Phase 1 + 2a
      ```
      app/src/lib/slides/sandbox.ts          — AST-style gate + node:vm + browser Function executor
      app/src/lib/slides/previewPres.ts      — pptxgenjs API shim that records primitives
      app/src/lib/slides/sampleDecks.ts      — hand-written reference slideCode (cover, chart, comparison) + minimal fallback
      app/src/lib/slides/assetBag.ts         — logo/screenshot/evidence/icon SVG bag builder
      app/src/components/workspace/SlideCanvas.tsx — DOM/SVG renderer for PreviewPres primitives
      app/src/__tests__/slidesSandboxTests.ts — 19 sandbox + preview + sample-deck tests, all passing
      ```

      ### Files added in Phase 2b + 3
      ```
      app/src/lib/slides/visionClassify.ts   — multimodal OpenRouter call: role + dominantColors + looksLikeLogo + usableAs
      app/src/lib/slides/documentExtract.ts  — TXT/MD/PDF text + heading extraction (no external deps)
      app/src/lib/slides/dataExtract.ts      — manual CSV/TSV parser → typed table schema (no external deps)
      app/src/lib/slides/deckExtract.ts      — PPTX slide extraction stub (LibreOffice deferred)
      app/src/lib/slides/intentParse.ts      — regex intent matcher ("use this as logo", "this is our dashboard", etc.)
      ```

      ### Files added in Phase 4
      ```
      app/src/lib/slides/primitiveValidation.ts — captured PreviewPres primitive validator for text overflow, per-slide text/shape presence, and decorative-shape coverage
      ```

      ### Files added in Phase 5
      ```
      app/src/lib/slides/llmTrace.ts — bounded structured logging helper for Slides LLM/search requests and validation outcomes
      ```

      ### Files modified in Phase 1 + 2a
      ```
      app/src/lib/slides/schema.ts           — added slideCode?, assets?, sandbox diagnostics fields (additive)
      app/src/lib/slides/deck.ts             — added generateSlidesDeckCode() with pptxgenjs-teaching prompt + retry
      app/src/lib/slides/export.ts           — added exportSlidesDeckCodeToPptx() that runs sandbox
      app/src/app/api/projects/[projectId]/slides/generate/route.ts — attaches slideCode + assets to deck
      app/src/app/api/projects/[projectId]/slides/export/route.ts   — prefers slideCode export, falls back to legacy
      ```

      ### Files modified in Phase 2b + 3
      ```
      app/src/lib/slides/schema.ts           — AssetRecord, AssetRole, AssetUsage types added; tables.rowCount added
      app/src/lib/slides/sourceIntake.ts     — new analyzeAssets() multi-stage pipeline (vision+doc+data+intent); legacy exports kept
      app/src/lib/slides/assetBag.ts         — AssetRecord[] path (usableAs-based key selection); addBrowserChrome() SVG device frame
      app/src/lib/slides/colorExtract.ts     — new extractBrandColorsFromDominant() for vision-extracted hex arrays
      app/src/lib/slides/deck.ts             — themeFromAssetRecords() uses vision dominantColors; dataContextFromRecords() injects CSV data; assetRecords? param on generateSlidesDeckCode
      app/src/app/api/projects/[projectId]/slides/generate/route.ts — calls analyzeAssets() with story.brief.objective as intent; passes assetRecords to generateSlidesDeckCode
      ```

      ### Files added/modified in Phase 2c
      ```
      app/src/lib/slides/codeDeck.ts        — shared attachSlideCodeToDeck() helper for story/generate/edit/regenerate flows
      app/src/lib/slides/sandboxShared.ts   — client/server-safe validator and shared sandbox result types
      app/src/lib/slides/sandboxBrowser.ts  — browser-only slideCode executor used by SlideCanvas
      app/src/components/workspace/SlidesWorkspace.tsx — prefers SlideCanvas for slideCode decks; keeps SlideRenderer fallback; adds Regenerate design action
      app/src/app/api/projects/[projectId]/slides/story/route.ts — initial creation now returns a code-designed deck preview
      app/src/app/api/projects/[projectId]/slides/edit/route.ts — deck edits now refresh slideCode so the visible preview changes
      app/src/app/api/projects/[projectId]/slides/regenerate-code/route.ts — re-rolls slideCode without rebuilding story/evidence
      ```

      ### Files modified in Phase 4
      ```
      app/src/lib/slides/deck.ts            — validates emitted slideCode by executing it against PreviewPres, then retries once with primitive rejection reasons
      app/src/lib/slides/codeDeck.ts        — persists sandboxDurationMs from successful validation
      app/src/__tests__/slidesSandboxTests.ts — adds primitive validation coverage; 22/22 sandbox tests passing
      ```

      ### Files modified in Phase 5
      ```
      app/src/lib/slides/deck.ts            — no-brand theme presets, slideCode request logging, validation logging, notes/thumbnail diagnostics
      app/src/lib/slides/story.ts           — story-generation request/response/failure logging
      app/src/lib/slides/sourceIntake.ts    — source-classification request/response/failure logging
      app/src/lib/slides/visionClassify.ts  — vision request/response/failure logging
      app/src/lib/slides/webSearch.ts       — OpenAI web-search request/response/failure logging
      app/src/lib/slides/schema.ts          — diagnostics fields for theme preset, slideCode request IDs, notes count, thumbnail count
      app/src/lib/slides/codeDeck.ts        — persists Phase 5 slideCode diagnostics
      app/src/components/workspace/SlidesWorkspace.tsx — reuses one PreviewPres deck for thumbnails and shows selected-slide speaker notes
      ```

      ### Known gaps remaining after Phase 2b
      - **XLSX parsing**: requires `xlsx` package (not installed). CSV works; XLSX returns null.
      - **DOCX/DOC parsing**: requires `mammoth` (not installed). Returns empty extraction.
      - **PPTX → PNG slide thumbnails**: requires LibreOffice or a hosted converter. `deckExtract.ts` returns empty.
      - **Full-fidelity PDF parsing**: the heuristic regex extracts text from simple PDFs; complex PDFs with embedded fonts need `pdfjs-dist`.

      ### Phase 2c completion notes
      - The in-app preview and thumbnails now prefer the slideCode primitive renderer, so newly created decks should visibly move away from the legacy template renderer.
      - Legacy JSON slides remain in the persisted deck as compatibility fallback for old decks, PDF export, and failed slideCode preview execution. Do not delete `SlideRenderer` or the JSON exporter until Phase 4 validation/retry proves slideCode output is reliable enough to be the only runtime path.
      - Users can re-roll only the visual design through `/api/projects/[projectId]/slides/regenerate-code` or the workspace "Regenerate design" button, without rebuilding the story/outline/evidence.

      ## Implementation phases

      ### Phase 1 — Sandbox + IR + preview parity (foundation) ✅ DONE
      **Why first:** without a working sandbox and preview, nothing else can be tested. This is the technical risk concentration; clear it before touching prompts.

      - New file `app/src/lib/slides/sandbox.ts` — AST gate, vm execution, resource limits.
      - New file `app/src/lib/slides/previewPres.ts` — `PreviewPres` shim mirroring the pptxgenjs subset we accept.
      - New file `app/src/components/workspace/SlideCanvas.tsx` — renders preview primitives. Includes inline SVG renderers for BAR / LINE / DOUGHNUT / SCATTER / AREA.
      - Hand-write 3 reference decks as `slideCode.js` files (cover, chart, comparison). Verify pptx export and preview match pixel-for-pixel.
      - Visual regression test: render preview to canvas, hash it, compare across runs.

      **Done when:** a hand-authored `slideCode.js` produces an identical-looking preview and `.pptx`.

      ### Phase 2 — LLM emits slideCode.js  ✅ Phase 2a DONE  ✅ Phase 2b DONE  ✅ Phase 2c DONE
      **Why second:** until Phase 1 works, we cannot evaluate prompt quality.

      Phase 2a (slideCode prompt + asset bag) shipped 2026-05-09. Phase 2b (vision-driven asset
      intake) shipped 2026-05-10 — `analyzeAssets()` runs vision classification, document extraction,
      CSV parsing, and intent override in parallel for every uploaded asset. See status table for
      remaining gaps (XLSX, DOCX, PPTX→PNG). Phase 2c shipped 2026-05-10 — `SlideCanvas`
      now drives in-app previews for decks with `slideCode`, edits refresh slideCode, and
      `/api/projects/[projectId]/slides/regenerate-code` can re-roll design code without
      rebuilding story/evidence.

      - Replace `deck.ts` system prompt. The new prompt:
      - Shows the LLM the exact `pres` API surface as TypeScript declarations (the only contract).
      - Provides 4 worked examples (cover / chart / comparison / closing) lifted from the reference deck.
      - Instructs: emit a single ES module exporting `async function build(pres, assets)`. No imports. Use only the documented API.
      - Embeds `assets` keys (`logo`, `icon_check`, `icon_x`, `icon_arrow`, evidence images) so the LLM knows what is available.
      - Hard rules: 6–10 slides; first slide = cover; last slide = closing; vary backgrounds; use real charts not rectangles; one decorative shape per slide minimum.
      - Pre-build the asset bag at request time:
      - Brand logo: extract from uploaded brand_asset, render to PNG at 256px.
      - Icon set: render a fixed FontAwesome subset (`check`, `x`, `arrow-right`, `rocket`, `chart-line`, `users`, `shield`, `star`, `cog`, `layer-group`, `bolt`, `circle-check`) via `react-icons` + `sharp` to PNG once at startup, cached.
      - Evidence images: pre-fetched and base64'd as today.
      - Story stage (`story.ts`) keeps its current shape — outline + evidence + brief — but no longer constrains layouts. Output is fed verbatim into the deck prompt as research input.

      **Done when:** the LLM-emitted `slideCode.js` compiles through the sandbox on ≥95% of test prompts and the rendered output is recognizably "designed." Phase 2 is now wired end-to-end; Phase 4 owns stricter primitive validation and retry reliability.

      ### Phase 3 — Brand intelligence  ✅ Done (2026-05-10)
      **Why third:** quality gain per unit work is high once the codepath works.

      - Vision `dominantColors` from `visionClassify.ts` drive theme via `themeFromAssetRecords()` in `deck.ts`. Exact hex values injected into the slideCode prompt with instruction to use them verbatim.
      - Logo placement enforced in the prompt: `assets.logo` must only appear on cover (top-left, w≈0.6) and closing slides.
      - Product screenshots wrapped in SVG browser-chrome device frame via `addBrowserChrome()` in `assetBag.ts` (gray title bar + traffic lights). Applied to all `framed_screenshot` assets.
      - Real CSV chart data injected into the prompt via `dataContextFromRecords()` so the LLM uses actual numbers.

      **Done when:** a deck generated from an uploaded brand asset uses that brand's exact accent color across charts, accent bars, and status pills.

      ### Phase 4 — Validation & retry loop ✅ Done (2026-05-10)
      **Why fourth:** catches the long-tail failures that prompt-only fixes miss.

      - `generateSlidesDeckCode()` now validates every LLM slideCode candidate by running it against `PreviewPres` before persistence.
      - Static gate failures, sandbox execution failures, missing text, missing shapes, missing decorative shapes, and likely text overflow all produce concrete rejection reasons.
      - Text overflow uses a rough line-capacity metric based on text length, font size, and bounding box width/height.
      - The first failed candidate triggers one OpenRouter retry with `previousAttempt`, `rejectionReasons`, and a strict instruction to emit only the fixed build body.
      - If the retry fails validation, Flowro falls back to deterministic minimal slideCode and records the failure reason in diagnostics.
      - Successful candidates persist `sandboxDurationMs` through `attachSlideCodeToDeck()`.

      **Done when:** invalid slideCode is caught before preview/export persistence, a single corrective retry gets concrete primitive-level reasons, and failed retries degrade to deterministic slideCode instead of broken previews.

      **Verification, 2026-05-10:** `npx tsx src/__tests__/slidesSandboxTests.ts` passed 22/22; targeted ESLint passed for `deck.ts`, `codeDeck.ts`, `primitiveValidation.ts`, and `slidesSandboxTests.ts`; `npm run build` passed.

      ### Phase 5 — Polish ✅ Done (2026-05-10)
      - Theme presets (navy / forest / mono / warm) are selected when no brand asset is available, injected into the slideCode prompt, and persisted as `diagnostics.themePreset`.
      - Speaker notes are preserved through `pres.addNotes`; `PreviewPres` captures them, PowerPoint export keeps them, and the workspace displays the selected slide's notes from preview primitives when available.
      - Slide thumbnails for the deck navigator now come from a single captured `PreviewDeck` primitive tree, so thumbnails and the main preview share the same low-resolution primitive source instead of executing slideCode separately for every thumbnail.
      - Structured logs now track Slides LLM and search calls: `slides_llm_request`, `slides_llm_response`, and `slides_llm_failure` include request ID, stage, provider, model, prompt/message sizes, bounded previews, duration, output size, usage when returned, validation rejection reasons, asset keys, theme preset, and retry attempts.

      **Verification, 2026-05-10:** `npx tsx src/__tests__/slidesSandboxTests.ts` passed 22/22; focused ESLint passed for touched Slides files and `SlidesWorkspace.tsx`; `npm run build` passed.

      ---

      ## File-by-file change map

      | File | Action |
      |---|---|
      | `app/src/lib/slides/schema.ts` | **Transition.** Keep brief / outline / evidence / source schemas. Decks now carry `slideCode` and `assets` additively while legacy `slides[]` remains as fallback until Phase 4 reliability is proven. |
      | `app/src/lib/slides/deck.ts` | **Rewrite prompt.** New system prompt teaches the pptxgenjs API + provides 4 worked examples. Output parsing becomes "read first ```js block." |
      | `app/src/lib/slides/story.ts` | **Trim.** Drop layout/proofType signals. Keep argument structure (brief + outline + evidence) as research input only. |
      | `app/src/lib/slides/sourceIntake.ts` | **Keep.** Brand color extraction is more valuable than ever now that the LLM can use the colors freely. |
      | `app/src/lib/slides/sandbox.ts` | **New.** Server-side static gate + vm execution + resource limits. Shared validation lives in `sandboxShared.ts`; browser execution lives in `sandboxBrowser.ts`. |
      | `app/src/lib/slides/previewPres.ts` | **New.** PreviewPres shim that records pptxgenjs calls as primitives. |
      | `app/src/lib/slides/assetBag.ts` | **New.** Pre-builds logo + icon PNGs + evidence images. |
      | `app/src/lib/slides/codeDeck.ts` | **New.** Shared helper that attaches or refreshes slideCode for create/generate/edit/regenerate routes. |
      | `app/src/lib/slides/export.ts` | **Prefer slideCode.** PPTX export runs slideCode through the sandbox, with JSON export retained as fallback and PDF support. |
      | `app/src/components/workspace/SlideRenderer.tsx` | **Fallback.** Retained only for legacy decks, PDF/JSON compatibility, and failed slideCode preview execution. |
      | `app/src/components/workspace/SlideCanvas.tsx` | **Primary preview.** Reads preview primitives, renders DOM + inline SVG charts for decks with slideCode. |
      | `app/src/__tests__/slidesSandboxTests.ts` | **Primary safety tests.** Sandbox safety + preview primitive execution. |

      ---

      ## What we are deliberately NOT doing

      - **Not** emitting raw HTML/CSS — this would force `.pptx` export to be a screenshot, killing editability.
      - **Not** making JSON templates the primary design path. `SlideCanvas` owns previews when `slideCode` exists.
      - **Not** deleting `SlideRenderer.tsx` before Phase 4 validation/retry. It remains a compatibility fallback until slideCode can safely be the only runtime path.
      - **Not** building a visual editor that lets users drag shapes. The LLM is the designer; the user edits via prompt.
      - **Not** continuing the M0–M5 roadmap. Word-count tightening and typography polish are irrelevant in a primitive-composition pipeline.

      ---

      ## Definition of done

      A Flowro deck is shippable under Path A when:

      - [ ] Side-by-side blind test against the reference deck (`/Users/khalidr/Downloads/flowro_deck.js`): designers cannot consistently identify which is Flowro
      - [ ] Generated `.pptx` opens in PowerPoint with shapes, text, and charts as native editable objects (not images)
      - [ ] Preview is pixel-faithful to the export (≤2% pixel diff at 1× zoom)
      - [ ] Sandbox rejects 100% of a static-analysis attack corpus (arbitrary import / eval / prototype mutation / fs / network)
      - [ ] Median generation time ≤ 25 s for a 6-slide deck on the production model
      - [ ] Brand-asset upload visibly drives the deck's color system across ≥80% of slides
      - [ ] No two consecutive slides share the same background color or composition skeleton

      ---

      ## Asset intake — deep vision analysis, not filename guessing

      ### Why this matters

      The current intake ([sourceIntake.ts:24-38](app/src/lib/slides/sourceIntake.ts:24)) classifies by filename and extension only. `BRAND_HINTS = ["brand", "logo", ...]` is a substring check. The OpenRouter classifier ([sourceIntake.ts:80-96](app/src/lib/slides/sourceIntake.ts:80)) sends `JSON.stringify({ sources })` — metadata only, never the pixels. Consequences:

      - A logo uploaded as `IMG_3429.png` → classified as `image_library`, treated as evidence, never used as the brand mark.
      - A user message saying "use this as the logo" is ignored — the upload pipeline does not read user intent.
      - A dashboard screenshot named `Untitled.png` → `image_library` instead of `product_screenshot`, so it never gets a device frame.
      - A reference deck PDF → only its filename is read; slide content, palette, layout cues, fonts are invisible to the deck generator.
      - A CSV gets `data_file` role but its actual columns/rows/units are never extracted, so the LLM can't build a real chart from it.

      **This must change.** With Path A the LLM is composing slides freely — it needs to know what every asset *actually contains*, not what its filename says.

      ### What we want

      For each attached file the pipeline produces a rich `AssetRecord` that downstream stages (deck prompt, asset bag, retry loop) can reason over:

      ```ts
      type AssetRecord = {
        id: string
        filename: string
        mimeType: string
        // What the asset IS (vision-decided, not filename-guessed)
        role: "logo" | "brand_guideline" | "product_screenshot" | "photo"
             | "illustration" | "icon" | "chart_image" | "diagram"
             | "reference_deck" | "data_table" | "document" | "web_link"
        // Free-form description from vision LLM — what it depicts, in plain English
        description: string                    // 1–3 sentences, max ~280 chars
        // Where in a deck this asset is appropriate
        usableAs: Array<"cover_logo" | "closing_logo" | "inline_icon"
                      | "full_bleed_background" | "framed_screenshot"
                      | "inline_evidence" | "color_palette_source"
                      | "chart_source_data" | "narrative_source">
        // Vision-extracted properties
        properties: {
          dominantColors?: string[]            // hex, ordered by area
          hasTransparency?: boolean
          aspectRatio?: number
          subjectFocus?: { x: number; y: number }   // 0–1 normalized — for object-position
          textInImage?: string                 // OCR'd text if present
          isMonochrome?: boolean
          looksLikeLogo?: boolean              // small, simple, transparent bg, high contrast
          looksLikeScreenshot?: boolean        // browser/app chrome detected
        }
        // For documents / decks / data files
        extracted?: {
          text?: string                        // up to 8000 chars, body content
          pageCount?: number
          headings?: string[]
          tables?: Array<{ headers: string[]; rows: string[][] }>
          embeddedImages?: Array<{ index: number; description: string }>
          referenceSlides?: Array<{            // for reference_deck only
            index: number
            thumbnail: string                  // base64 PNG
            title?: string
            bullets?: string[]
            palette?: string[]
          }>
        }
        // User-stated intent overrides everything
        userIntent?: string                    // raw user instruction tied to this asset
        intentRole?: AssetRole                 // parsed from userIntent if assertive
      }
      ```

      ### Pipeline

      ```
      upload  ──┬──► metadata sniff (cheap, deterministic)
                │       extension, mime, size, dimensions, transparency
                │
                ├──► vision pass (image files)        ──► role + description + properties
                │       single multimodal call per image
                │       prompts vary by sniff result for sharper output
                │
                ├──► document pass (pdf / docx / pptx / md / txt)
                │       extract text + tables + embedded images
                │       embedded images each get their own vision pass
                │
                ├──► data pass (csv / tsv / xlsx / json)
                │       parse → schema (column names, types, sample rows, units)
                │
                ├──► deck pass (ppt / pptx / key)
                │       render each slide to PNG → vision describe each
                │       extract palette + recurring fonts
                │
                ├──► link pass (url)
                │       fetch og:image + readable text, then vision on og:image
                │
                └──► user-intent reconciliation (last)
                        parse the prompt for "use X as logo / background / data"
                        override role + intentRole when explicit
      ```

      ### Vision call shape

      One multimodal call per image, model: a strong vision model (Claude 3.5 Sonnet or GPT-4o-class — configurable via env). Returns strict JSON.

      ```
      You are classifying an asset for a slide deck. Examine the image carefully.
      Return JSON only:
      {
        "role": "logo|brand_guideline|product_screenshot|photo|illustration|icon|chart_image|diagram|reference_deck|data_table|document",
        "description": "what this image depicts, in 1–3 sentences",
        "looksLikeLogo": boolean,             // simple mark, transparent or solid bg, high contrast, small text
        "looksLikeScreenshot": boolean,       // app/browser chrome, UI elements, dashboard
        "subjectFocus": { "x": 0..1, "y": 0..1 } | null,
        "dominantColors": ["#RRGGBB", ...]    // up to 5, ordered by area
        "textInImage": "..."                  // OCR if any meaningful text
        "usableAs": [...],                    // from the enum above
        "warnings": ["low_resolution"|"watermark"|"contains_pii"|"distorted"|...]
      }
      ```

      When vision says `looksLikeLogo: true` the role is `logo` regardless of filename. When `looksLikeScreenshot: true` and the user's prompt mentions "our product" / "our app" → role is `product_screenshot`. Filename is a tiebreaker, never the primary signal.

      ### User intent — the decisive override

      The user's message accompanying the upload (or any prior message) is parsed for assertive intent. Patterns:

      - "use this as (the )?logo" → bind to that upload, force `role = logo`
      - "this is our brand colors" → `role = brand_guideline`, mine `dominantColors` for theme
      - "use this image as the cover background" → `usableAs += "full_bleed_background"`, prioritized for slide 1
      - "this screenshot is our dashboard" → `role = product_screenshot`, `usableAs += "framed_screenshot"`

      Implementation: a small intent parser runs over the user message after vision classification. When intent maps cleanly to one upload (only one image attached, or filename matches), we override `role` to `intentRole` and store the raw `userIntent` for the deck prompt.

      When ambiguous (multiple uploads, intent says "the logo" but two images both look like logos), we **do not guess** — we surface a `needs_attention` step asking the user which one is the logo.

      ### Documents and data — extract, don't just label

      - **PDF / DOCX / TXT / MD:** extract text via `pdfjs-dist` or `mammoth`, hold up to 8 000 chars in `extracted.text`, plus the headings list. Every embedded image runs through the same vision pass.
      - **CSV / XLSX:** parse via `papaparse` / `xlsx`, store column headers + first 10 rows + inferred numeric/date/string types in `extracted.tables`. The deck prompt can then write a real chart against real numbers instead of inventing values.
      - **PPT / PPTX / KEY:** convert each slide to a PNG (via `libreoffice --headless --convert-to png` or a hosted converter). Each thumbnail goes through vision for title + bullets + palette. The deck prompt can then say "match the palette and tone of slide 3 of the reference."
      - **URL:** fetch og:image + first 4 000 chars of readable text via Readability. og:image runs through the vision pass.

      ### What this enables in the Path A prompt

      The deck-generation prompt now receives a structured asset manifest:

      ```
      ASSETS AVAILABLE:
      - assets.logo       (logo, transparent, dominant #1F7FEC, intent: "use as logo")
      - assets.dashboard  (product_screenshot, browser chrome detected, focus 0.45/0.32)
      - assets.headshot   (photo, single subject, focus 0.5/0.35, monochrome bg)
      - assets.metrics    (data_table, 8 columns: month, arr, churn, ...) ← real numbers
      - assets.refDeck.s3 (reference_slide, palette ["#0D1B3E","#00E5C3"], "investor cover")

      USER INTENT NOTES:
      - assets.logo: explicitly designated as the brand logo by the user.
      - assets.dashboard: requested for the product walkthrough slide.
      ```

      The LLM, freed from templates, can now compose: cover slide uses `assets.logo` at corner + brand color from `dominantColors[0]`; product slide places `assets.dashboard` inside a device frame; chart slide pulls real numbers from `assets.metrics`.

      ### Files

      | File | Action |
      |---|---|
      | `app/src/lib/slides/sourceIntake.ts` | **Rewrite.** Becomes a multi-stage analyzer (sniff → vision/extract → intent reconcile) returning `AssetRecord[]`. |
      | `app/src/lib/slides/visionClassify.ts` | **New.** Single-image vision call, returns the JSON above, with retry + safe fallback. |
      | `app/src/lib/slides/documentExtract.ts` | **New.** PDF / DOCX / TXT / MD text + heading extraction; embedded image enumeration. |
      | `app/src/lib/slides/dataExtract.ts` | **New.** CSV / XLSX → typed table schema. |
      | `app/src/lib/slides/deckExtract.ts` | **New.** Slide-by-slide PNG conversion + per-slide vision pass for reference decks. |
      | `app/src/lib/slides/intentParse.ts` | **New.** Reads the user prompt, finds asset-intent statements, maps to upload IDs. |
      | `app/src/lib/slides/assetBag.ts` | **Updated.** Consumes `AssetRecord[]`, exposes pre-prepared base64 PNGs to the sandbox. |
      | `app/src/lib/slides/schema.ts` | **Updated.** `AssetRecord` replaces `SlidesSource`; old role enum widened. |
      | `app/src/lib/slides/colorExtract.ts` | **Updated.** Pixel-based extraction (canvas / sharp) takes priority over the SVG-only path. |

      ### Ordering vs. Path A phases

      Asset intake lands as part of **Phase 2** — once the sandbox + preview exist, but before the LLM prompt rewrite finalizes. The deck prompt cannot be authored until we know the shape of the asset manifest it will receive. Run intake rewrite and prompt rewrite in lockstep.

      ### Done when

      - [ ] Uploading `IMG_3429.png` of a logo + saying "use this as the logo" → it's bound as `assets.logo` and appears on the cover slide
      - [ ] Uploading a CSV with monthly revenue → the chart slide uses those exact numbers, not invented values
      - [ ] Uploading a reference deck → at least one new slide adopts its palette and a layout idea from a specific source slide
      - [ ] Filename is `Untitled.png` and the image is a dashboard screenshot → role = `product_screenshot`, framed in a device chrome on the slide
      - [ ] User intent override beats vision when assertive ("use this image as background" → `full_bleed_background`)
      - [ ] Ambiguous intent surfaces a clarifying question instead of guessing

      ---

      ## Open questions to resolve before Phase 1

      1. **Model choice.** Which model emits the slide code? Claude is best at this format; budget vs. quality trade-off.
      2. **Streaming.** Do we stream slides one at a time (better UX, simpler retry) or whole-deck in one call (more coherent design, harder to recover)?
      3. **Editing primitive.** Once a deck is generated, how does the user edit a single slide? Re-prompt that slide only? Edit the emitted JS in a code-aware editor? (Phase 5 question — defer.)
      4. **Deterministic fallback.** What does the minimal fallback deck look like when both LLM attempts fail? Probably a single hand-authored "we couldn't generate, here's your brief" slide.

      ---

      ## Key files at a glance

      ```
      app/src/lib/slides/sandbox.ts         — NEW: AST gate + vm execution
      app/src/lib/slides/sandboxShared.ts   — NEW: shared slideCode validation/types
      app/src/lib/slides/sandboxBrowser.ts  — NEW: client-safe slideCode executor
      app/src/lib/slides/previewPres.ts     — NEW: pptxgenjs API shim that records primitives
      app/src/lib/slides/assetBag.ts        — NEW: builds logo + icons + images
      app/src/lib/slides/codeDeck.ts        — NEW: attaches/refreshes slideCode on persisted decks
      app/src/lib/slides/deck.ts            — REWRITTEN: prompt teaches pptxgenjs API
      app/src/lib/slides/story.ts           — TRIMMED: drops layout/proof signals
      app/src/lib/slides/schema.ts          — TRANSITIONAL: deck includes slideCode/assets plus legacy slides fallback
      app/src/lib/slides/export.ts          — PREFERS slideCode PPTX export, retains JSON fallback/PDF
      app/src/components/workspace/SlideCanvas.tsx     — PRIMARY: preview primitive renderer
      app/src/components/workspace/SlideRenderer.tsx   — FALLBACK: legacy JSON renderer
      app/src/app/api/projects/[projectId]/slides/regenerate-code/route.ts — NEW: re-rolls slideCode only
      ```
