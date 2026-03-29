---
title: 'Implementation Plan: Presentation PPTX Artifact Generation and Readiness Polling'
type: 'implementation-plan'
created: '2026-03-29'
status: 'proposed'
context:
  - '_bmad-output/implementation-artifacts/spec-presentation-pptx-artifact-generation.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md'
  - '_bmad-output/project-context.md'
---

## Goal

Replace the current synchronous markdown slide-generation path with a server-owned async PPTX artifact workflow that starts from the generated notebook, polls readiness every minute, persists job state across restore, and delivers the finished PowerPoint through a same-origin download route.

## Target Workflow

1. The user reaches Presentation with a real `generatedNotebookId` and a non-empty visual theme.
2. The user clicks `Build PowerPoint`.
3. The app starts a same-origin artifact job for the active notebook and stores the returned `taskId`.
4. Presentation shows a persistent waiting state and polls status every 60 seconds.
5. When the task completes, Presentation switches to a ready state.
6. The user downloads the `.pptx` through a same-origin route.
7. If the page refreshes mid-build, restore resumes the active job instead of resetting it.

## Scope

### In Scope

- Notebook artifact endpoint builders under the shared backend endpoint module
- Same-origin init, status, and binary download routes for PPTX generation
- Server normalization of backend task payloads
- Presentation job state, one-minute polling, restore persistence, and ready/download UI
- Inline ready notification and optional browser notification when permission already exists

### Out of Scope

- WebSocket, SSE, push, or email-based readiness notifications
- Multiple simultaneous PPTX builds per active session
- Automatic browser-notification permission prompts
- Continuing the current markdown preview/fullscreen deck flow as the active path for this feature
- Arbitrary backend URL selection or browser-direct artifact downloads

## Implementation Changes

### 1. Extend Shared Backend Endpoint Builders

Update [endpoints.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/backend/endpoints.ts):

- Add builders for:
  - `POST /v1/notebooks/{notebookId}/artifacts/generate`
  - `GET /v1/notebooks/{notebookId}/artifacts/tasks/{taskId}?wait=false`
  - `GET /v1/notebooks/{notebookId}/artifacts/download?type=slide_deck&artifact_id={taskId}&output_format=pptx`
- Reuse the existing origin normalization and fail-fast notebook-id validation
- Keep artifact path ownership centralized so notebook transport rules do not drift across slides-related modules

### 2. Add Slides Domain Helpers

Add slides-specific server-owned helpers under `lib/slides/`:

- [shared.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/slides/shared.ts)
  - define PPTX artifact route request/response types
  - normalize backend `task_id`, `error_code`, and status values into app-facing fields
  - expose a typed client-facing job state union such as `pending | inProgress | completed | failed`
- [server.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/slides/server.ts)
  - own init, poll, and download transport logic
  - classify transport failures separately from misconfiguration failures
  - preserve binary response headers needed for PPTX downloads

### 3. Add Same-Origin Slide Job Routes

Add thin route handlers:

- [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/slides/jobs/route.ts)
  - validate `{ notebookId, instructions }`
  - start the backend PPTX job
  - return a normalized `job` payload
- [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/slides/jobs/[notebookId]/[taskId]/route.ts)
  - validate route params
  - poll backend job status with `wait=false`
  - return normalized job state
- [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/slides/jobs/[notebookId]/[taskId]/download/route.ts)
  - validate route params
  - proxy the backend PPTX stream
  - preserve `Content-Type` and set or forward `Content-Disposition`

Route design rationale:

- The browser still calls only same-origin app routes.
- `notebookId` and `taskId` remain opaque handles for the active workspace and active artifact job.
- No server-side mapping store is required to recover notebook-to-task relationships after refresh.

### 4. Replace Presentation Client Orchestration

Update [PipelinePageClient.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelinePageClient.tsx):

- Remove the current immediate `/api/slides/generate` markdown path from the active PPTX workflow
- Introduce PPTX job state:
  - `slideDeckTaskId`
  - `slideDeckState`
  - `slideDeckError`
  - `slideDeckErrorCode`
  - `slideDeckRequestedAt`
  - `slideDeckLastCheckedAt`
  - `slideDeckCompletedAt`
- Start the PPTX job from the current `generatedNotebookId` plus `extractedStyle`
- Poll every 60 seconds while state is `pending` or `inProgress`
- Stop polling on `completed` or `failed`
- Resume polling after restore when a saved task is still active
- Use a dedicated download action for the PPTX route rather than the existing JSON fetch helper

### 5. Reshape Presentation UI

Update [PipelineSteps.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineSteps.tsx):

- Replace the current preview-centric empty state with a job-centric idle state
- Replace spinner-only behavior with explicit waiting states:
  - queued
  - building
  - ready
  - failed
- Rename the primary action from `Generate Slide Deck` to `Build PowerPoint`
- Replace preview/fullscreen/export controls with:
  - current job status
  - next-check / last-checked copy
  - `Download .pptx`
  - retry or rebuild actions
- Remove or retire markdown preview/fullscreen assumptions for this path

### 6. Extend Types and Persistence

Update [types.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/types.ts), [utils.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/utils.ts), [schema.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/persistence/schema.ts), and persistence helpers as needed:

- Extend `SessionState` with PPTX job tracking fields
- Keep `generatedNotebookId` as the anchor for the active notebook
- Do not persist backend URLs
- Ensure restore logic can restart polling for active PPTX jobs
- Clear stale PPTX task state appropriately when a new notebook is created or a rebuild is explicitly started

### 7. Notification Handling

Add lightweight readiness notification logic in the client:

- Required:
  - inline ready-state message when a job transitions to `completed`
- Optional within this story if time stays bounded:
  - fire a browser notification when:
    - `document.visibilityState === "hidden"`
    - `Notification.permission === "granted"`
    - the task transitions from active to `completed`

Guardrails:

- Do not auto-prompt for notification permission without a deliberate user action
- Do not introduce service workers or push infrastructure in this story

### 8. Remove or Isolate Obsolete Slide Route Assumptions

Update or retire the old in-repo async stub surfaces:

- [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/slides/generate/route.ts)
- [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/slides/status/[taskId]/route.ts)
- [store.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/slides/store.ts)

Plan decision:

- The new PPTX job routes become the active contract.
- The placeholder in-memory five-second task simulation should not remain the product-facing deck-generation path once implementation begins.

### UI Reuse Impact

No new shared `components/ui` primitives are required to land the first implementation. The ready/wait/failure states can be handled inside the product-specific Presentation surface. Existing toast infrastructure is effectively absent, so inline status is the primary user-feedback mechanism for this story.

## Suggested Delivery Order

1. Extend shared backend endpoint builders for notebook artifact routes.
2. Add `lib/slides/shared.ts` normalization and `lib/slides/server.ts` transport helpers.
3. Add the three same-origin PPTX job routes.
4. Extend session types and persistence shape for PPTX job state.
5. Replace Presentation client orchestration with start/poll/download behavior.
6. Update Presentation UI states and remove preview-centric controls for this path.
7. Add readiness notification behavior if still within bounded scope.
8. Remove or isolate obsolete placeholder slide-job route usage.
9. Run lint, test, and build verification plus manual end-to-end checks.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Start a PPTX job from Presentation and confirm the init route stores the returned `taskId`.
2. Simulate or observe `pending` status and confirm the UI remains in a waiting state.
3. Simulate or observe `in_progress` status and confirm polling continues every 60 seconds.
4. Simulate or observe `completed` status and confirm the UI flips to ready and exposes `Download .pptx`.
5. Download the PPTX and confirm the response content type is `application/vnd.openxmlformats-officedocument.presentationml.presentation`.
6. Refresh during an active PPTX build and confirm restore resumes polling for the saved job.
7. Force an upstream failure and confirm Presentation shows a retryable failed state.
8. Run with `TATTVAM_NOTEBOOK_BACKEND_ORIGIN=http://0.0.0.0:8000` and confirm artifact routes still resolve against `127.0.0.1`.

## Risks

- If the implementation keeps using the JSON-only fetch helper for download, PPTX delivery will fail or corrupt the response.
- If notebook artifact endpoint building is not centralized, slides-related transport rules can drift away from the shared notebook-backend contract.
- If the app does not persist task state, refresh during a 10 to 20 minute build will feel like data loss.
- If the old markdown-preview assumptions remain mixed into Presentation, users will receive contradictory feedback about what the system is producing.
