# Flowro AI Slides Service Plan

## Goal

Build **Flowro AI Slides** as a separate service from the app builder: a no-headache AI presentation workflow where users start with a prompt, attach supporting files/images/links, preview generated slides, request AI edits, and export a finished deck.

Flowro Slides is not a manual PowerPoint editor and is not trying to clone or beat any closed product. It takes the best proven UX patterns for AI slide creation and makes them open-source, inspectable, self-hostable, and aligned with Flowro's builder-first philosophy.

## Product Principles

- **No headache:** prompt first, attachments second, AI starts work when the request is clear.
- **Separate service:** slides have higher repeat usage than app building, so they need their own route, state, history, and generation pipeline.
- **Preview, not manual editing:** users review slides visually, select a slide/deck, and ask AI to edit. No drag/drop canvas tooling in this scope.
- **Attachments are context:** files/images are classified and used intentionally, not treated as generic upload chips.
- **Same Flowro builder flow:** prompt sends the user into the chat/workspace view. If the agent has enough context, it does not ask extra questions or force an approval step.
- **Transparent sources:** show when a slide used uploaded files, images, links, or web search.
- **Current AI stack:** use the existing OpenRouter integration for all AI generation. Use OpenAI web search API only when live search is required.

## Experience Shape

```text
Prompt + attachments
  -> user chooses Apps or Slides
  -> chat/workspace view
  -> source classification + optional search status
  -> slide generation status
  -> generated slide preview
  -> AI edits on selected slide or whole deck
  -> export PPTX/PDF
```

### Core UX

- Add a dedicated **Slides** entry separate from App Builder.
- Start with the current Flowro-style prompt box.
- The composer mode selector controls the workflow:
  - `Apps` keeps the current app-builder project creation flow.
  - `Slides` creates a Slides project/session and starts the presentation workflow.
- The selected mode must be included in the create request/session state so chat and right-side workspace know whether to run app builder or slides.
- On submit, route into the same left-chat/right-workspace layout pattern used by the current builder.
- If the prompt and attachments are clear, the agent starts immediately. Do not block with extra questions, deck brief approval, or outline approval.
- Ask follow-up questions only when generation would be materially wrong without the missing answer.
- Let users attach PDFs, docs, spreadsheets, PPTX files, images, screenshots, and links.
- Classify attachments into clear roles:
  - `source material`
  - `reference deck`
  - `style/template guide`
  - `brand asset`
  - `data file`
  - `product screenshot`
  - `image library`
  - `web/link source`
- Generate the deck brief and outline internally so the agent can work, but keep the user experience focused on progress and preview.
- Show slide previews after generation.
- Support AI edits through chat:
  - edit selected slide
  - regenerate selected slide
  - shorten/expand deck
  - change tone
  - use/ignore specific attachment
  - convert a file/data source into a chart
  - replace web-backed claims with uploaded-file-only claims

## Architecture Decisions

- Create a **Slides domain** independent from app-builder build runs.
- Reuse the current builder workspace rhythm: chat remains left, Slides workspace appears right after submission.
- Build a Slides-specific right panel, not a reused app-builder panel:
  - no route selector
  - no code explorer
  - no app files tab
  - no publish/deploy button
  - no generated app preview controls
  - keep only slides status, slide preview, source indicators, export, and AI edit anchors
- Keep all non-search AI calls on the existing OpenRouter path:
  - attachment summaries
  - deck brief generation
  - outline generation
  - slide copy
  - design direction
  - AI edit planning
  - slide regeneration
- Add a small OpenAI-only search adapter for live research:
  - use OpenAI Responses API with `web_search`
  - return evidence summaries, citations, and source URLs
  - never use OpenAI search for normal deck generation when no live/current information is needed
- Store a structured deck model before rendering:
  - deck metadata
  - source inventory
  - outline
  - slide list
  - per-slide claim
  - per-slide proof object
  - per-slide source references
  - preview/export status
- Render previews from the same structured deck model used for export.
- Right-side workspace statuses should be visual and calm:
  - `reading sources`
  - `searching web` when OpenAI search is active
  - `building story`
  - `designing slides`
  - `rendering preview`
  - `ready`
- Keep manual canvas editing out of scope.

## Trackable Phases

### Phase 1: Slides Workspace + Source Intake

- [x] Add separate Slides navigation and workspace route.
- [x] Add prompt-first Slides creation screen.
- [x] Wire the home composer selector so `Apps` starts the existing app-builder flow and `Slides` starts the Slides flow.
- [x] Persist the selected project type/session mode as `app` or `slides`.
- [x] Reuse the current chat/workspace layout pattern after prompt submission.
- [x] Add a Slides-specific right panel with status animation and preview space.
- [x] Remove app-builder-only controls from the Slides right panel: route selector, code explorer, files tab, publish button, and deploy controls.
- [x] Add attachment intake for files, images, and links.
- [x] Store uploaded source metadata and file roles.
- [x] Use OpenRouter to classify attachments and summarize usable content.
- [x] Show source-understanding progress in the right panel while the agent works.
- [x] Add toggle/setting for web search when the deck needs current research.

**Implementation notes, 2026-05-06:**

- Added `/slides` as the Slides entry route, plus a sidebar Slides navigation item. `/slides` opens `/app?mode=slides` with Slides preselected.
- Added `projectType: "app" | "slides"` to project creation, list, detail, and frontend view types. Existing projects default to `app`.
- Slides projects bypass the app-builder `/api/generate` path in chat. The first Slides turn is persisted as normal chat and opens a Slides workspace instead of creating an app plan.
- Added a Slides-specific right panel for source intake status, web-search state, source inventory, and preview space. It does not render the app-builder route selector, code explorer, files tab, publish, or deploy controls.
- Added file, image, and link metadata intake on the prompt composer for Slides mode. Binary file storage/content extraction is not implemented yet; Phase 1 stores client-provided metadata and classified roles only.
- Added OpenRouter-backed source classification with a deterministic fallback so project creation remains reliable when OpenRouter is unavailable.
- Added a focused source-intake test covering source role classification.

**Done when:** choosing `Slides` in the composer starts the presentation flow, lands in the chat/workspace view, shows the Slides right panel working, and avoids app-builder controls entirely.

### Phase 2: Brief + Outline + Evidence

- [x] Generate an internal deck brief from prompt and attachments using OpenRouter.
- [x] Generate an internal outline with slide titles as claims, not generic topics.
- [x] Add source mapping to the internal outline.
- [x] If web search is enabled, call OpenAI web search only for evidence gathering.
- [x] Save web evidence with citations and source URLs.
- [x] Show animated right-panel progress for `searching web`, `building story`, and `designing slides`.
- [x] Continue directly into slide generation when enough context exists.

**Implementation notes, 2026-05-06:**

- Added a Slides deck-story model with internal brief, claim-led outline, source IDs, evidence IDs, evidence citations, and Slides generation status.
- Added `/api/projects/[projectId]/slides/story` to persist the first Slides user turn, generate the internal brief/outline, save evidence, and update Slides workspace status.
- Added OpenRouter-backed deck story generation with deterministic fallback so Slides workspaces still progress when OpenRouter is unavailable.
- Added an OpenAI Responses API web-search adapter used only when Slides web search is enabled. It stores evidence summaries, citations, and source URLs on the deck story.
- Updated the Slides workspace to animate the `searching web`, `building story`, and `designing slides` phases while the request is running, then display the internal brief, claim outline, and web evidence.
- Verification: targeted ESLint passed for the changed Slides files; deterministic deck-story generation passed via `tsx`. Full repo `tsc --noEmit` is currently blocked by existing build executor and Vercel publish test fixture type errors. Full repo `npm run lint` is currently blocked by existing generated `.vercel`, template, example, and unrelated component lint issues.

**Done when:** a clear prompt proceeds automatically from context intake to slide generation, with questions only for real blockers.

### Phase 3: Slide Preview + AI Edits + Export

- [x] Generate structured slides from the internal outline using OpenRouter.
- [x] Render slide previews in the browser.
- [x] Keep the preview visually aligned with the current right-side workspace design, but adapted for slides.
- [x] Add selected-slide AI edit flow.
- [x] Add whole-deck AI edit flow.
- [x] Preserve source references after edits.
- [x] Export to PPTX and PDF.
- [x] Add simple generation status states: `drafting`, `rendering`, `ready`, `needs attention`, `failed`.

**Implementation notes, 2026-05-06:**

- Added a structured Slides deck model with theme, slide list, one-claim slide structure, proof objects, speaker notes, source IDs, and evidence IDs.
- Added OpenRouter-backed deck generation from the internal outline, with deterministic fallback generation so Slides projects still produce previews when OpenRouter is unavailable.
- Updated the Slides story route to continue from brief/outline into structured deck generation and mark status as `ready` when preview data is available.
- Added Slides-specific generation, edit, and export API routes under `/api/projects/[projectId]/slides/*`.
- Added selected-slide and whole-deck AI edit flows. Edits preserve mapped source/evidence references unless the instruction explicitly removes them.
- Replaced the placeholder preview with a selectable browser slide preview, thumbnails, proof-object rendering, edit controls, and PPTX/PDF export controls.
- Added `jszip` for PPTX package generation. PDF export is generated directly from the structured deck model.
- Verification: Slides source-intake tests passed 7/7; project-plan regression tests passed 8/8; targeted ESLint passed for all changed Slides files and routes; deterministic deck/export smoke test produced valid non-empty PDF and PPTX buffers. Full repo `tsc --noEmit` is still blocked by the existing build executor and Vercel publish fixture type errors noted in Phase 2, not by the Slides phase 3 changes.

**Done when:** a user can watch the agent work, preview the generated deck, request AI edits, and export without using a manual editor.

## Quality Bar

- Every slide should have one clear claim.
- Every non-cover slide should have a proof object: chart, image, comparison, timeline, diagram, table, or source-backed visual.
- Avoid repeated generic card-grid layouts.
- Uploaded images must be used intentionally or ignored.
- Web-sourced claims must keep citations.
- Generated decks should be editable after export, but in-app manual editing is out of scope.
- The preview should match export closely enough that users can trust what they see.

## AI Provider Rules

- **OpenRouter:** default for all generation, classification, summarization, outline creation, slide generation, design decisions, and AI edits.
- **OpenAI Search API:** only for web search / live evidence retrieval.
- **No OpenAI file search for v1:** uploaded files are handled by Flowro's own intake and OpenRouter summarization unless this is revisited later.
- **No hidden provider switching:** if search is used, mark it clearly in the deck/source UI.

## Out Of Scope For This Plan

- Manual drag/drop slide editor.
- Full PowerPoint replacement UI.
- Collaborative live editing.
- App-builder dependency as a requirement.
- Trying to position Flowro as a closed-product competitor.
- Complex template marketplace.

## Success Criteria

- A new user can create a slide deck from a prompt and attachments with minimal choices.
- A returning user can make multiple presentations per week without re-learning the workflow.
- Users can see what sources were used and ask AI to change them.
- Users can preview slides before export.
- Users can improve the deck through AI edits instead of manual design tools.
- The service remains cleanly separated from App Builder while sharing Flowro's auth, workspace, storage, and OpenRouter infrastructure.
- Choosing `Apps` still behaves like the current builder; choosing `Slides` runs the presentation flow.
