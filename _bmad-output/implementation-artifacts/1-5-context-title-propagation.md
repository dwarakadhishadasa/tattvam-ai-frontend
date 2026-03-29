# Story 1.5: Context Title Propagation Across Pipeline

Status: review

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-context-title-propagation.md`
- `_bmad-output/implementation-artifacts/plan-context-title-propagation.md`

## Story

As a presenter moving from Context through Presentation,
I want one canonical lecture title derived from my Context inputs,
so that Extraction, history, notebook creation, and Presentation all refer to the same talk consistently.

## Acceptance Criteria

1. Given the user selects `Verse Specific Lecture` with book `bg` and verse `2.13`, when the title is shown anywhere across the pipeline, then it is `Bhagavad Gita 2.13`.
2. Given the user enters a general topic, when the title is shown across the pipeline, then it is exactly the topic text without `General:` or other prefixes.
3. Given the user enters a festival name, when the title is shown across the pipeline, then it is exactly the festival name without `Festival:` or other prefixes.
4. Given the user enters a yatra location, when the title is shown across the pipeline, then it is exactly the location text without `Yatra:` or `Yatra Talk:` prefixes.
5. Given the user proceeds from Context to Extraction without a fetched reference, when Extraction renders its heading, then it still shows the canonical context title instead of `Lecture Context`.
6. Given the user creates a notebook after completing Context, when the notebook request is sent, then the request title uses the canonical context title instead of `Untitled Workspace`.

## Tasks / Subtasks

- [ ] Add a shared canonical context-title helper (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Update `components/pipeline/utils.ts` with a helper such as `deriveContextTitle(...)`.
  - [ ] Centralize the book-code-to-label mapping there so verse titles use human-readable labels instead of raw codes.
  - [ ] Make the helper return a trimmed string or `null` when the required context input is incomplete.
  - [ ] Ensure yatra titles use the raw location string with no `Yatra:` or `Yatra Talk:` prefix.

- [ ] Replace divergent session and derived-title logic with the shared helper (AC: 1, 2, 3, 4)
  - [ ] Update `getSessionTitle(...)` in `components/pipeline/utils.ts` to delegate to the canonical helper.
  - [ ] Stop prefixing general, festival, and yatra titles with local labels.
  - [ ] Keep fallback session naming behavior only for incomplete or empty sessions.
  - [ ] Update `buildLectureVerseData(...)` only as needed so yatra-created `VerseData.title` does not reintroduce a conflicting visible title.

- [ ] Hydrate notebook naming from the Context-derived title in the client (AC: 1, 2, 3, 4, 6)
  - [ ] Update `components/pipeline/PipelinePageClient.tsx` so `notebookName` hydrates from the canonical context title when no user override exists.
  - [ ] Reuse that same title when calling `/api/notebooks`.
  - [ ] Preserve `Untitled Workspace` only as a final defensive fallback when no valid context title can be derived.

- [ ] Align Extraction, Presentation, and title-dependent modal surfaces on the same canonical title (AC: 1, 2, 3, 4, 5)
  - [ ] Update `components/pipeline/PipelineSteps.tsx` so the Extraction header uses the canonical context title instead of `Lecture Context` when available.
  - [ ] Reuse the same title in Presentation copy rather than relying on nearby local strings.
  - [ ] Audit `components/pipeline/PipelineModals.tsx` surfaces that currently depend on `extractedVerseData.title` and keep them aligned with the canonical title rule wherever they display or save lecture context.
  - [ ] Keep verse titles based on Context inputs rather than fetched `extractedVerseData.title`.

- [ ] Keep persistence lean while preserving restore alignment (AC: 1, 2, 3, 4)
  - [ ] Reuse existing session state to derive the title instead of adding a new persisted `contextTitle` field.
  - [ ] Ensure session snapshots and restored sessions resolve titles through the same helper.
  - [ ] Leave persistence schema unchanged unless implementation discovers a real manual-override requirement.

- [ ] Add focused verification for context-title derivation and propagation (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Add small pure-helper coverage for book-label mapping and prefix-free title rules.
  - [ ] Add or extend tests for session-title delegation and notebook-title defaulting from Context.
  - [ ] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story should follow Story 1.4 so the notebook handoff contract is already stable when title propagation is wired through it.
- Treat this as a derived-domain-data cleanup story, not as a new persistence-model story.

### Current Branch Intelligence

- `components/pipeline/utils.ts` currently derives session titles from `extractedVerseData.title` first, prefixes general and festival titles with `General:` and `Festival:`, prefixes yatra titles with `Yatra:`, and builds yatra `VerseData.title` as `Yatra Talk: ${subject}`.
- `components/pipeline/PipelineSteps.tsx` currently renders `extractedVerseData?.title || "Lecture Context"` in the Extraction header.
- `components/pipeline/PipelinePageClient.tsx` currently falls back to `notebookName.trim() || "Untitled Workspace"` inside `handleGenerateNotebook()`.
- `components/pipeline/PipelineModals.tsx` currently uses `extractedVerseData.title` for the context-reference modal heading and when saving context blocks to the notebook.
- The recent notebook-creation work already uses `/api/notebooks`; this story should standardize the title sent through that path, not rework route ownership.
- Recent git history indicates General and Festival flows were made functional in commit `815d0a3`, but visible title behavior is still inconsistent across surfaces.

### Architecture Compliance

- Treat the canonical title as derived domain data from Context inputs, not as a UI-local string.
- Keep title derivation out of JSX-heavy branches and centralize it in reusable helpers.
- Do not introduce a new persisted `contextTitle` field unless a real manual override requirement emerges.
- Verse titles must use the selected book label plus typed verse number, not downstream fetched reference metadata.
- Yatra titles must remain aligned with the same canonical helper instead of relying on separate `VerseData.title` prefixes.

### File Structure Requirements

- `components/pipeline/utils.ts`: canonical context-title helper, book-label mapping, yatra alignment, and session-title delegation
- `components/pipeline/PipelinePageClient.tsx`: notebook title hydration and request reuse
- `components/pipeline/PipelineSteps.tsx`: Extraction and Presentation surface alignment
- `components/pipeline/PipelineModals.tsx`: title-dependent context modal surfaces that currently read `extractedVerseData.title`
- `hooks/useSessionPersistence.ts`: confirm restored sessions still align through derived title usage if helper placement changes
- `lib/persistence/schema.ts`: no expansion expected unless implementation proves it necessary
- `tests/pipeline/notebook-utils.test.ts` or a small dedicated helper test file: title-derivation regression coverage

### Project Structure Notes

- Keep title derivation in a shared helper under `components/pipeline/utils.ts`; consumer files should import the helper rather than restating title rules inline.
- No new route, schema, or persistence module is expected for this story.

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Start a verse flow and confirm `Bhagavad Gita <verse>` or `Srimad Bhagavatam <verse>` appears consistently in Extraction, history, notebook naming, and Presentation.
  - Start a general flow and confirm the raw topic text appears with no `General:` prefix.
  - Start a festival flow and confirm the raw festival name appears with no `Festival:` prefix.
  - Start a yatra flow and confirm the raw location appears with no `Yatra:` or `Yatra Talk:` prefix.
  - Continue to Extraction before verse fetch metadata is available and confirm the header still uses the Context-derived title.
  - Create a notebook after Context and confirm the request uses the Context-derived title instead of `Untitled Workspace` in normal flows.
  - Open the context-reference modal for a flow that has fetched context and confirm any displayed or saved lecture title remains aligned with the canonical title rule.

### References

- `_bmad-output/implementation-artifacts/spec-context-title-propagation.md`
- `_bmad-output/implementation-artifacts/plan-context-title-propagation.md`
- `_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md`
- `_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md`
- `_bmad-output/project-context.md`
- `components/pipeline/utils.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `components/pipeline/PipelineModals.tsx`
- `hooks/useSessionPersistence.ts`
- `lib/persistence/schema.ts`
- `tests/pipeline/notebook-utils.test.ts`

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
