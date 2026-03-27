# Story 1.3: Extraction Notebook Workspace

Status: ready-for-review

## Source Artifact

- `_bmad-output/implementation-artifacts/plan-extraction-notebook-workspace.md`

## Story

As a presenter working in extraction,
I want a notebook workspace inside the extraction step where I can review, edit, and compile saved material,
so that I can keep refining content without leaving the chat workflow.

## Acceptance Criteria

1. Given the user has saved at least one response or excerpt, when they review the notebook workspace inside extraction, then they can inspect saved content and see whether the content estimate appears sufficient for the selected lecture duration.
2. Given the user opens a saved response for review, when they edit or trim it, then the notebook preserves the refined version for later use without losing the original source content.
3. Given the user needs to study their material, when they use the notebook workspace, then they can review saved responses and continue chatting without leaving extraction.
4. Given the user has entered a workspace name, when they compile the notebook from extraction, then the system shows a temporary in-progress state, creates a workspace identifier, and advances to presentation mode.
5. Given the user leaves the workspace name blank, when they compile the notebook, then the system assigns a default workspace name and still advances when compilation completes.
6. Given no notebook entries exist, when the user is in extraction, then compile remains unavailable.
7. Given the notebook appears too short for the selected lecture duration, when the user views readiness, then the UI warns that more content is recommended without blocking compile.
8. Given the user reloads a saved session after editing notebook entries, when restore completes, then notebook edits and workspace state are preserved.

## Tasks / Subtasks

- [x] Upgrade the notebook entry data model and derived helpers (AC: 1, 2, 6, 7, 8)
  - [x] Replace the string-only `SavedSnippet` shape in `components/pipeline/types.ts` with the approved notebook-entry fields: `id`, `sourceMessageId`, `sourceType`, `sourceContent`, `content`, `isEdited`, `updatedAt`.
  - [x] Add `activeNotebookEntryId` to `SessionState` and `createEmptySessionState()`.
  - [x] Update `components/pipeline/utils.ts` so word count and compile source use edited entry `content`, not immutable `sourceContent`.
  - [x] Keep `canCompile` and `notebookReadiness` derived from current notebook entries instead of creating new persisted booleans.

- [x] Replace string-only save APIs with provenance-aware notebook actions (AC: 2, 3, 6, 8)
  - [x] Change save handlers in `components/pipeline/PipelinePageClient.tsx` and modal/step props from `onSaveSnippet(content)` to richer save actions that preserve source metadata.
  - [x] Save assistant responses with `sourceType: "response"` and `sourceMessageId` set to the assistant message id.
  - [x] Save citation excerpts with `sourceType: "citation"` and preserve provenance as far as the current modal contract allows.
  - [x] Save context blocks with `sourceType: "context"`.
  - [x] Deduplicate initial saves by exact `sourceContent`, not by mutable edited `content`.

- [x] Fold notebook review, editing, readiness, naming, and compile into extraction UI (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Refactor `components/pipeline/PipelineSteps.tsx` so `ExtractionStep` owns the notebook list, editor/detail panel, readiness indicator, workspace name input, and compile controls.
  - [x] Remove the separate synthesis-stage dependency from the user flow.
  - [x] Implementation decision: use a dedicated editor/detail panel rather than inline card editing so chat scroll and notebook list stability are preserved.
  - [x] Implementation decision: place workspace naming and compile controls together in the notebook footer area.
  - [x] Implementation decision: closing the editor clears `activeNotebookEntryId`.

- [x] Update the step model, navigation, and compile handoff (AC: 4, 5, 6)
  - [x] Change `PipelineStep` from `0 | 1 | 2 | 3` to `0 | 1 | 2`.
  - [x] Update `components/pipeline/constants.ts` and `components/pipeline/PipelineSidebar.tsx` to show `Context`, `Extraction`, and `Presentation`.
  - [x] Stop rendering `SynthesisStep` from `components/pipeline/PipelinePageClient.tsx`; remove dead code if no longer needed.
  - [x] Keep compile behavior in `handleGenerateNotebook()` but advance directly from extraction to presentation.

- [x] Align persistence and restore behavior with notebook edits without reintroducing raw storage calls (AC: 2, 8)
  - [x] Extend `hooks/useSessionPersistence.ts`, `lib/persistence/schema.ts`, and any related validators to accept the new notebook-entry structure and reduced step count.
  - [x] Normalize legacy saved-snippet records into notebook entries during restore if encountered, but do not add migration-specific UI or separate migration flows.
  - [x] Keep persistence ownership inside the existing hook and `lib/persistence/*`; do not move storage logic back into `PipelinePageClient.tsx`.

- [x] Verify compile and presentation still consume edited notebook content (AC: 4, 5, 7, 8)
  - [x] Ensure notebook compile availability is `savedSnippets.length > 0`.
  - [x] Ensure slide generation continues to use edited notebook `content`.
  - [x] Extend existing persistence tests and add any small pure-helper tests needed for notebook-entry restore/validation.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- Implement this story after Story 1.2 so the extraction client is already consuming a normalized chat contract.

### Current Branch Intelligence

- The repository already has a new browser-persistence boundary in `hooks/useSessionPersistence.ts` and `lib/persistence/*`. Extend that work; do not reintroduce direct `localStorage` persistence in `components/pipeline/PipelinePageClient.tsx`.
- Planning artifacts already reflect the new notebook-entry model and the reduced three-step flow, but the current implementation still uses `PipelineStep = 0 | 1 | 2 | 3`, a `SavedSnippet` string shape, and a separate `SynthesisStep`.
- The current worktree is dirty on `components/pipeline/PipelinePageClient.tsx`, `components/pipeline/types.ts`, `hooks/useSessionPersistence.ts`, and `lib/persistence/schema.ts`. Merge carefully with existing changes instead of replacing them wholesale.

### Architecture Compliance

- Keep route and page-shell pressure moving downward: `PipelinePageClient.tsx` should orchestrate state, while notebook rendering and editing stay in feature components and helpers.
- Keep derived rules such as readiness, compile availability, dedupe, and edited-content word counts out of JSX-heavy branches where possible.
- Preserve the current server/client boundary: notebook compilation remains a local simulated handoff in this repo; do not invent server persistence.

### File Structure Requirements

- `components/pipeline/types.ts`: notebook-entry types and session shape
- `components/pipeline/utils.ts`: empty state, snapshot helpers, count/readiness helpers
- `components/pipeline/PipelinePageClient.tsx`: state wiring, provenance-aware save/edit handlers, compile flow
- `components/pipeline/PipelineSteps.tsx`: extraction notebook UI and removal of synthesis dependency
- `components/pipeline/PipelineSidebar.tsx` and `components/pipeline/constants.ts`: three-step navigation
- `components/pipeline/PipelineModals.tsx`: richer save callbacks for context and citation sources
- `hooks/useSessionPersistence.ts`: restore and autosave of notebook edits
- `lib/persistence/schema.ts`: validation and legacy normalization for notebook entries
- Optional alignment target: `lib/persistence/indexedDbStore.ts` only if the record contract itself changes

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Extend `tests/persistence/browser-persistence.test.ts` for notebook-entry validation and legacy restore normalization.
- Prefer small pure-helper and schema tests over introducing a heavy UI harness unless that harness is already practical.
- Manual checks:
  - Save a full assistant response and confirm it appears in the notebook workspace.
  - Save a citation excerpt and confirm dedupe still works by source content.
  - Open a notebook entry, edit it, close it, reload, and confirm the edited content restores while original source content remains preserved.
  - Confirm compile is disabled with no notebook entries and remains allowed when readiness is insufficient.
  - Compile directly from extraction and confirm presentation opens successfully.

### References

- `_bmad-output/implementation-artifacts/plan-extraction-notebook-workspace.md`
- `_bmad-output/planning-artifacts/spec.md`
- `_bmad-output/planning-artifacts/data-model.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/project-context.md`
- `components/pipeline/types.ts`
- `components/pipeline/utils.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `components/pipeline/PipelineSidebar.tsx`
- `components/pipeline/PipelineModals.tsx`
- `hooks/useSessionPersistence.ts`
- `lib/persistence/schema.ts`

## Dev Agent Record

### Agent Model Used

`Codex GPT-5`

### Debug Log References

- Source artifact: `plan-extraction-notebook-workspace.md`
- Verification: `npm test`, `npm run lint`, `npm run build`

### Completion Notes List

- Notebook review and editing move into extraction; synthesis is removed as a user-facing step.
- Notebook entries preserve immutable `sourceContent` plus editable working `content`.
- Existing browser-persistence boundaries must remain the source of truth for restore and autosave.
- Added provenance-aware save actions for assistant responses, citation excerpts, and context blocks while deduplicating by immutable `sourceContent`.
- Extraction now owns notebook review, dedicated editing, readiness messaging, workspace naming, and compile handoff to presentation.
- Persistence restore now normalizes legacy string-only saved snippets into notebook entries and maps the removed synthesis step into the new three-step flow.
- Added focused helper and persistence regression coverage for notebook dedupe, compile-source content, and legacy restore normalization.
- Final verification passed with `npm test`, `npm run lint`, and `npm run build`.

### File List

- `components/pipeline/types.ts`
- `components/pipeline/utils.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `components/pipeline/constants.ts`
- `components/pipeline/PipelineSidebar.tsx`
- `components/pipeline/PipelineModals.tsx`
- `lib/persistence/schema.ts`
- `lib/persistence/indexedDbStore.ts`
- `tests/persistence/browser-persistence.test.ts`
- `tests/pipeline/notebook-utils.test.ts`
