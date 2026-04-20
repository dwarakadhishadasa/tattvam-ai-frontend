# Story 1.10: Presentation PPTX Job Orchestration and Download Experience

Status: done

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/plan-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/1-9-presentation-pptx-artifact-routes.md`
- `_bmad-output/project-context.md`

## Story

As a presenter waiting for a real slide deck,
I want Presentation to manage a long-running PPTX job with honest waiting states, resumable polling, and a same-origin download action,
so that I can refresh or stay on the page without losing track of deck generation progress.

## Acceptance Criteria

1. Given `generatedNotebookId` and non-empty visual instructions are available, when the user clicks `Build PowerPoint`, then the client starts `POST /api/slides/jobs`, stores the returned `taskId`, and enters `pending` or `inProgress` state instead of expecting immediate markdown slides.
2. Given a PPTX job is active, when the page remains open, then the client polls `GET /api/slides/jobs/{notebookId}/{taskId}` every 60 seconds until the job reaches `completed` or `failed`.
3. Given the backend reports `pending` or `inProgress`, when Presentation renders, then it shows an honest queued/building state with timing context and no fake preview or percentage progress.
4. Given the backend reports `completed`, when Presentation updates, then it shows a ready state and exposes a `Download .pptx` action that uses the same-origin download route rather than the JSON fetch helper.
5. Given the app restores a session with `slideDeckState` of `pending` or `inProgress`, when the Presentation step loads, then it resumes the saved job state and restarts polling instead of resetting to idle.
6. Given notebook generation is repeated, a rebuild is explicitly started, or the backend returns a terminal failure, when Presentation state updates, then stale PPTX task data is cleared appropriately and the user can retry.
7. Given the tab is hidden and notification permission already exists, when a job transitions from active to `completed`, then the app may show a local browser notification without auto-prompting for permission.

## Tasks / Subtasks

- [x] Extend the session model for PPTX job state (AC: 1, 2, 4, 5, 6)
  - [x] Update `components/pipeline/types.ts` with:
    - [x] `slideDeckTaskId`
    - [x] `slideDeckState`
    - [x] `slideDeckError`
    - [x] `slideDeckErrorCode`
    - [x] `slideDeckRequestedAt`
    - [x] `slideDeckLastCheckedAt`
    - [x] `slideDeckCompletedAt`
  - [x] Update `components/pipeline/utils.ts` so `createEmptySessionState()` and related helpers include the new fields.
  - [x] Clear stale PPTX job state when a new notebook is created or a rebuild intentionally starts.

- [x] Preserve restore and autosave compatibility for the new PPTX fields (AC: 5, 6)
  - [x] Update `lib/persistence/schema.ts` to validate and normalize the PPTX job fields.
  - [x] Update `hooks/useSessionPersistence.ts` so restored sessions keep the PPTX job state intact.
  - [x] Preserve backward compatibility for older sessions that do not yet include PPTX fields.

- [x] Replace markdown deck generation with job-oriented client orchestration (AC: 1, 2, 4, 5, 6, 7)
  - [x] Update `components/pipeline/PipelinePageClient.tsx` so Presentation starts jobs through `/api/slides/jobs`, not `/api/slides/generate`.
  - [x] Add polling logic that runs every 60 seconds while the job is active and stops on `completed` or `failed`.
  - [x] Store last-checked and completion timestamps as the job progresses.
  - [x] Add a same-origin PPTX download action that does not use the generic `fetchJson()` helper.
  - [x] Handle terminal failures with clear retryable state instead of writing placeholder markdown into `generatedSlides`.

- [x] Reshape Presentation UI around PPTX job states (AC: 1, 3, 4, 6, 7)
  - [x] Update `components/pipeline/PipelineSteps.tsx` to replace preview/fullscreen/export assumptions with job-centric idle, pending, in-progress, completed, and failed states.
  - [x] Rename the primary action from `Generate Slide Deck` to `Build PowerPoint`.
  - [x] Show honest waiting copy with next-check and/or last-checked timing.
  - [x] Replace the placeholder `Export to PPTX` action with the real `Download .pptx` flow.
  - [x] Retire or isolate the legacy markdown preview and fullscreen controls from the active Presentation workflow.

- [x] Add optional ready-notification handling without permission prompts (AC: 7)
  - [x] Trigger inline ready-state messaging immediately on completion.
  - [x] If `document.visibilityState === "hidden"` and `Notification.permission === "granted"`, optionally fire a browser notification when the job completes.
  - [x] Do not add service workers, push infrastructure, or automatic permission prompts in this story.

- [x] Add focused automated coverage for persistence compatibility and client-state helpers (AC: 1, 2, 4, 5, 6)
  - [x] Extend `tests/persistence/browser-persistence.test.ts` for PPTX job-field validation and restore compatibility.
  - [x] Add helper-level tests for any extracted polling/state-transition utilities introduced to keep `PipelinePageClient.tsx` readable.
  - [x] Prefer lightweight pure-function coverage over a heavy UI harness unless an existing harness makes component tests practical.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story depends on Story 1.9 because the Presentation client must consume the normalized `/api/slides/jobs/*` routes created there.
- Do not switch the Presentation client to the new job model until the route contract and binary download path are stable.
- This story should not be combined with unrelated Extraction chat work.

### Current Branch Intelligence

- `components/pipeline/PipelinePageClient.tsx` currently posts to `/api/slides/generate` with compiled notebook content and expects immediate markdown slide output.
- `components/pipeline/PipelineSteps.tsx` currently renders preview/fullscreen/export controls around `generatedSlides`.
- `SessionState` currently stores `generatedNotebookId` and `generatedSlides` only; no PPTX task metadata exists yet.
- `slideImage` and `extractedStyle` are already restored separately through `useSessionPersistence()` visual-settings handling and can be reused as the visual-instructions source.
- The current `Export to PPTX` button is a placeholder alert and must not remain the active product path once the PPTX workflow lands.

### Architecture Compliance

- Keep the browser on same-origin routes only; Presentation must not call notebook artifact endpoints directly.
- Keep polling/state-transition logic out of JSX-heavy render paths where possible. Extract helpers if the effect logic becomes dense.
- Do not use the JSON fetch helper for PPTX download responses.
- Keep progress honest: queued/building/ready/failed states only, with no fake percentages.
- Preserve restore safety by treating the saved task id and state as durable client-side orchestration data, not as a throwaway local spinner.

### File Structure Requirements

- `components/pipeline/types.ts`: PPTX job fields on `SessionState`
- `components/pipeline/utils.ts`: empty-state and reset helpers for PPTX job tracking
- `components/pipeline/PipelinePageClient.tsx`: start, poll, retry, and download orchestration
- `components/pipeline/PipelineSteps.tsx`: PPTX job-centric Presentation UI
- `hooks/useSessionPersistence.ts`: restore and autosave compatibility
- `lib/persistence/schema.ts`: backward-compatible session validation
- `app/api/slides/generate/route.ts`: remove from active Presentation usage once the client switches
- `app/api/slides/status/[taskId]/route.ts`: remove from active Presentation usage once the client switches
- `tests/persistence/browser-persistence.test.ts`

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Enter Presentation with a real `generatedNotebookId` and visual style, then start `Build PowerPoint` and confirm the UI enters a waiting state using the returned `taskId`.
  - Leave the page open through at least one poll cycle and confirm status checks occur every 60 seconds.
  - Simulate `pending` and `inProgress` responses and confirm the UI shows waiting copy rather than markdown slide preview.
  - Simulate a `completed` response and confirm `Download .pptx` becomes available and uses the same-origin download route.
  - Refresh during an active PPTX job and confirm the restored session resumes polling instead of resetting to idle.
  - Force a terminal backend failure and confirm the UI shows a retryable failed state.
  - Complete a job while the tab is hidden and permission is already granted, and confirm the optional browser notification behavior does not prompt for permission.

### References

- `_bmad-output/implementation-artifacts/spec-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/plan-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/1-9-presentation-pptx-artifact-routes.md`
- `_bmad-output/project-context.md`
- `components/pipeline/types.ts`
- `components/pipeline/utils.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `hooks/useSessionPersistence.ts`
- `lib/persistence/schema.ts`
- `app/api/slides/generate/route.ts`
- `app/api/slides/status/[taskId]/route.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Focused verification: `npm test -- tests/backend/endpoints.test.ts tests/slides/shared.test.ts tests/slides/server.test.ts tests/slides/routes.test.ts tests/persistence/browser-persistence.test.ts tests/pipeline/slide-deck.test.ts`
- Full verification: `npm test`, `npm run lint`, `npm run build`

### Completion Notes List

- Extended `SessionState` and persistence normalization with durable PPTX task tracking fields while preserving compatibility for older saved sessions that do not yet include them.
- Added `components/pipeline/slideDeck.ts` to centralize idle/reset, polling cadence, and state-transition helpers so `PipelinePageClient.tsx` could orchestrate start, poll, retry, restore, and completion handling without JSX-heavy logic.
- Switched Presentation to `/api/slides/jobs/*`, replaced preview/fullscreen/export assumptions with honest PPTX job states, and wired `Download .pptx` through the same-origin binary route.
- Added completion timestamps, next-check timing, retryable failure handling, and hidden-tab browser notifications when permission is already granted.

### File List

- `components/pipeline/types.ts`
- `components/pipeline/utils.ts`
- `components/pipeline/slideDeck.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `lib/persistence/schema.ts`
- `tests/persistence/browser-persistence.test.ts`
- `tests/pipeline/slide-deck.test.ts`
