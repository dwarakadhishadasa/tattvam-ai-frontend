# Story 1.4: Extraction Notebook Source Text Seeding

Status: done

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md`
- `_bmad-output/implementation-artifacts/plan-extraction-notebook-source-text-seeding.md`

## Story

As a presenter preparing slides from Extraction,
I want the generated backend notebook to be seeded immediately with my compiled notebook content,
so that Presentation starts from a real notebook that already contains the material I curated.

## Acceptance Criteria

1. Given the user clicks `Generate Slides` with saved Extraction content, when notebook creation succeeds, then the app immediately sends one concatenated text source to `POST /v1/notebooks/{notebook_id}/sources/text`.
2. Given the saved Extraction content contains edited notebook entries, when source text is built, then the uploaded `content` uses the edited working copy and not the immutable original source text.
3. Given the user leaves the source title unspecified, when the route seeds the notebook, then it uses the default title `Extraction Notes`.
4. Given notebook creation succeeds but source-text seeding fails, when the handoff completes, then the client remains in Extraction and does not treat the notebook as presentation-ready.
5. Given the current saved Extraction content compiles to blank or whitespace-only text, when the user clicks `Generate Slides`, then the route rejects the request instead of creating a notebook with an empty text source.

## Tasks / Subtasks

- [x] Expand the local notebook route contract for create-and-seed orchestration (AC: 1, 3, 4, 5)
  - [x] Update `app/api/notebooks/route.ts` to accept `title`, `sourceText`, and optional `sourceTitle`.
  - [x] Validate `title.trim()` and `sourceText.trim()` before calling the backend.
  - [x] Default `sourceTitle` to `Extraction Notes` when the client omits it.
  - [x] Keep the existing normalized notebook summary response contract on success.

- [x] Add notebook backend transport for text-source seeding (AC: 1, 4)
  - [x] Extend `lib/notebooks/server.ts` with a helper for `POST /v1/notebooks/{notebook_id}/sources/text`.
  - [x] Reuse the current backend URL normalization and `NotebookBackendUnavailableError` classification.
  - [x] Keep raw backend transport ownership in `lib/notebooks/server.ts` rather than moving it into the route or client.

- [x] Orchestrate notebook creation plus source upload at the server boundary (AC: 1, 3, 4, 5)
  - [x] Update `app/api/notebooks/route.ts` to create the notebook first, then seed it only after creation succeeds.
  - [x] Return success to the browser only after both upstream calls succeed.
  - [x] Preserve existing notebook-creation error behavior when the first call fails.
  - [x] Surface source-upload failure as an overall handoff failure instead of advancing with a partially useful notebook.

- [x] Reuse the existing Extraction compile helper for source text mapping (AC: 1, 2, 5)
  - [x] In `components/pipeline/PipelinePageClient.tsx`, build `sourceText` from `buildNotebookCompileSource(savedSnippets)`.
  - [x] Send the expanded payload to `/api/notebooks` from the existing `Generate Slides` action.
  - [x] Do not introduce a second string-assembly path for notebook content in the client.

- [x] Preserve current Extraction UX expectations while tightening failure handling (AC: 3, 4)
  - [x] Keep the current notebook title fallback and Extraction-side error feedback pattern.
  - [x] Keep the user in Extraction when seeding fails.
  - [x] Continue clearing stale generated slides only after a successful create-and-seed handoff.

- [x] Add focused verification for transport, validation, and orchestration behavior (AC: 1, 2, 3, 4, 5)
  - [x] Extend `tests/notebooks/server.test.ts` for the new `sources/text` helper and failure wrapping.
  - [x] Extend `tests/notebooks/shared.test.ts` if shared request validation helpers are added.
  - [x] Add or update coverage for the create-then-seed orchestration path and blank-source rejection.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story should be implemented before Story 1.5 because it expands the notebook handoff contract that Story 1.5 will reuse for context-derived titles.
- Build on the current real notebook-creation flow rather than revisiting the older simulated compile path documented in Story 1.3.

### Current Branch Intelligence

- The current worktree already includes a real notebook-creation proxy in `app/api/notebooks/route.ts` and `lib/notebooks/server.ts`.
- `app/api/notebooks/route.ts` currently accepts only `title`, proxies `POST /v1/notebooks`, and normalizes the returned notebook summary.
- `components/pipeline/PipelinePageClient.tsx` currently posts only `{ title }` from `handleGenerateNotebook()` and advances to Presentation when the notebook is created.
- `buildNotebookCompileSource(savedSnippets)` already exists in `components/pipeline/utils.ts` and already uses edited notebook-entry `content`; reuse it as the source of truth for seeding.
- Recent git history already reflects the shipped notebook-creation work in commit `815d0a3`; extend that flow rather than replacing it.

### Architecture Compliance

- Keep the browser talking only to the local Next.js route. The client must not own backend sequencing or raw snake_case payload handling.
- Keep request shaping, transport error classification, and backend orchestration on the server boundary.
- Reuse the existing normalized notebook summary contract for the browser unless a later UX explicitly needs source-upload metadata.
- Do not seed from stale generated slides. Seed from current Extraction notebook content only.

### File Structure Requirements

- `app/api/notebooks/route.ts`: expanded request contract and create-then-seed orchestration
- `lib/notebooks/server.ts`: backend transport helper for `sources/text`
- `lib/notebooks/shared.ts`: shared validation helpers only if needed; do not move transport logic here
- `components/pipeline/PipelinePageClient.tsx`: expanded client request payload
- `components/pipeline/utils.ts`: source of truth for compiled Extraction notebook text
- `tests/notebooks/server.test.ts`: transport and failure regression coverage
- `tests/notebooks/shared.test.ts`: shared validation coverage if introduced

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Save multiple Extraction notebook entries, click `Generate Slides`, and confirm the created backend notebook receives one concatenated text source.
  - Edit a saved notebook entry, click `Generate Slides`, and confirm the uploaded source text uses the edited content.
  - Omit `sourceTitle`, click `Generate Slides`, and confirm the backend receives `Extraction Notes`.
  - Simulate a `sources/text` backend failure after notebook creation and confirm Extraction does not advance.
  - Try generating from whitespace-only compiled content and confirm the handoff is rejected.

### References

- `_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md`
- `_bmad-output/implementation-artifacts/plan-extraction-notebook-source-text-seeding.md`
- `_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md`
- `_bmad-output/project-context.md`
- `app/api/notebooks/route.ts`
- `lib/notebooks/server.ts`
- `lib/notebooks/shared.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/utils.ts`
- `tests/notebooks/server.test.ts`
- `tests/notebooks/shared.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test`
- `npm run lint`
- `npm run build`

### Completion Notes List

- Expanded `/api/notebooks` to validate `title` and compiled `sourceText`, default omitted `sourceTitle` to `Extraction Notes`, create the notebook, then seed one text source before returning success.
- Added notebook backend transport for `POST /v1/notebooks/{notebook_id}/sources/text` with the existing URL normalization and backend-unavailable error classification.
- Updated the Extraction handoff in `PipelinePageClient` to seed from `buildNotebookCompileSource(savedSnippets)` so edited working-copy notebook entries remain the single source of truth.
- Added regression coverage for shared request normalization, `sources/text` transport, orchestration success/failure, and blank-source rejection.
- Verified the completed handoff with passing `npm test`, `npm run lint`, and `npm run build`.

### File List

- `app/api/notebooks/route.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `lib/notebooks/server.ts`
- `lib/notebooks/shared.ts`
- `tests/notebooks/route.test.ts`
- `tests/notebooks/server.test.ts`
- `tests/notebooks/shared.test.ts`
