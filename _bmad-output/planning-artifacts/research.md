# Research: Tattvam AI Lecture Synthesis Workflow

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-03-26  
**Method**: Reverse-engineered from the current frontend implementation in
`app/page.tsx`, `components/SettingsModal.tsx`, `app/api/**`, `app/layout.tsx`,
`app/globals.css`, and `package.json`

## Decision 1: Treat the live experience as a four-step implementation with a three-stage product core

**Decision**: Document the implementation as `activeStep: 0 | 1 | 2 | 3`, where
step 0 captures context and steps 1-3 align to extraction, synthesis, and
presentation.

**Rationale**:
- The code defines a step array with `Context`, `Extraction`, `Synthesis`, and
  `Presentation`.
- Step gating depends on prior state: extracted context unlocks extraction, saved
  snippets unlock synthesis, and a generated notebook ID unlocks presentation.
- The business spec intentionally focuses on the three-stage lecture workflow, but
  future engineering work must still account for the context-selection step because
  it shapes state, API calls, and session titles.

**Alternatives considered**:
- Model the implementation as only the three-stage business flow. Rejected because
  it would omit the actual entry state used by the code.
- Treat context selection as a separate feature. Rejected for now because it is
  tightly coupled to the same route, state machine, and history snapshots.

## Decision 2: Move extraction chat behind a backend-owned notebook interface while keeping other AI work mixed-surface

**Decision**: Record extraction chat as a backend-owned notebook integration reached
through a frontend server boundary, while style extraction and slide generation
remain browser-driven Gemini calls and only verse/yatra context helpers remain
route-backed in the active UI.

**Rationale**:
- The supplied integration target is
  `POST /v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask` on the
  NotebookLM backend.
- Project guidance explicitly says server-appropriate integrations should stay off
  the client when the platform allows it.
- `app/page.tsx` can remain responsible for interaction state while the chat request
  itself moves behind a route handler or server adapter.
- `components/SettingsModal.tsx` instantiates `GoogleGenAI` directly for image-based
  style extraction.
- `app/api/lecture/yatra` still calls Gemini for optional reference scaffolding.
- General and festival setup no longer call a helper route in the active UI because
  extraction does not require a generated reference for those talk types.
- The practical effect is that chat becomes the main server-owned AI boundary in
  the active workflow, while the rest of the product remains mixed-surface.

**Alternatives considered**:
- Keep chat in the browser and only swap the URL. Rejected because it would add yet
  another privileged integration directly inside `app/page.tsx`, contrary to the
  project-context rules.
- Move all AI work behind backend interfaces in this pass. Rejected because the
  requested change is specifically about chat queries, and broad AI surface
  migration would exceed the scope of this patch.

## Decision 3: Treat browser storage as the only durable state layer in this repository

**Decision**: Use `localStorage` as the documented persistence contract for slide
settings and session history.

**Rationale**:
- The code reads and writes `slide_image_cache`, `slide_style_cache`,
  `lecture_duration_cache`, and `tattvam_sessions`.
- Session history is automatically saved whenever the current session has meaningful
  content.
- There is no database, server-side session store, or remote notebook persistence in
  this repository.

**Alternatives considered**:
- Describe persistence as temporary UI state only. Rejected because the implementation
  explicitly restores sessions and visual settings across reloads.
- Describe persistence as NotebookLM-backed. Rejected because compilation is simulated
  and no external notebook record is created here.

## Decision 4: Document notebook compilation as a simulated local handoff

**Decision**: Record synthesis as a client-side transition that fabricates a
notebook ID after a timeout instead of invoking a real notebook service.

**Rationale**:
- `handleGenerateNotebook()` waits 2.5 seconds, writes a synthetic
  `nb_<timestamp>` identifier, and advances to step 3.
- The UI conveys a compile step, but the code does not call an external notebook
  API from this repo.
- The spec already frames compilation as a current limitation; the implementation
  artifacts should make that boundary explicit.

**Alternatives considered**:
- Document a future external notebook contract. Rejected because it would not match
  the shipped code.
- Treat the synthesis step as purely visual. Rejected because the generated notebook
  ID is a real gating signal inside the state machine.

## Decision 5: Document context acquisition as a hybrid of scraping and AI-generated scaffolding

**Decision**: Split context acquisition into three families:
- verse-specific context via `GET /api/verse` scraping `prabhupadabooks.com`
- yatra context via a Gemini-backed route handler
- general and festival setup via local topic/name state with no required reference fetch

**Rationale**:
- Verse context is fetched with `cheerio` and parsed from remote HTML.
- Yatra uses a POST route handler that returns `overview` plus `keyPoints`.
- General and festival enter extraction immediately and keep their setup data in
  `generalTopic` or `festivalName` without populating `extractedVerseData`.
- When `extractedVerseData` exists, the extraction UI, session history, and
  reference-saving flows can treat it as a single context object while chat
  requests still send only the user's raw question.

**Alternatives considered**:
- Document all contexts as model-generated. Rejected because verse lookup is a real
  scrape-and-parse flow and general/festival no longer fetch generated context in
  the active UI.
- Document separate downstream state per talk type. Rejected because the UI still
  uses one optional `extractedVerseData` shape whenever a fetched reference exists.

## Decision 6: Preserve the deterministic citation demo path in verification guidance

**Decision**: Preserve the built-in `"envy"` prompt shortcut as the primary deterministic
manual-validation path for citation review and snippet saving unless the backend is
explicitly intended to replace local test determinism.

**Rationale**:
- When a user message contains `"envy"`, the page can still bypass the live backend
  request and return a canned citation-rich sample payload.
- That sample includes structured citations and timestamped YouTube URLs, making it
  the most reliable way to validate citation review, embeds, and duplicate-save
  handling without depending on external transcript infrastructure.

**Alternatives considered**:
- Rely only on live prompt generation for citation checks. Rejected because live
  responses may not reliably produce citation metadata.
- Omit the shortcut because it is implementation-specific. Rejected because the
  entire point of this pass is to capture implementation truth.

## Decision 7: Treat slide export and slide-task APIs as incomplete interfaces

**Decision**: Document two separate limitations:
- the visible PPTX export button is a placeholder alert
- `app/api/slides/generate` is a dormant background-task stub not used by the UI

**Rationale**:
- The presentation UI calls `alert("PPTX export functionality would be integrated here.")`.
- The slide-generation route returns a processing task object, but the main workflow
  generates slides directly in the browser and never calls that route.
- These interfaces matter because future contributors could otherwise assume export
  or async slide generation already exists.

**Alternatives considered**:
- Ignore dormant interfaces and document only active UI behavior. Rejected because
  reverse-engineered implementation artifacts should make partial work visible.

## Decision 8: Keep verification centered on lint, build, and manual journey checks

**Decision**: Maintain `npm run lint`, `npm run build`, and guided manual walkthroughs
as the verification baseline for this feature set.

**Rationale**:
- The repository has no committed automated test harness.
- The flow depends on browser APIs, local persistence, animation, fullscreen, and
  live model access, which are currently best validated through manual walkthroughs.
- The quickstart artifact can still make validation repeatable and concrete.

**Alternatives considered**:
- Invent a test harness in this pass. Rejected because the request is to reverse
  engineer implementation artifacts, not introduce new source architecture.
