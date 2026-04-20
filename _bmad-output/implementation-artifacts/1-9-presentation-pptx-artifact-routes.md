# Story 1.9: Presentation PPTX Artifact Job Routes

Status: done

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/plan-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/1-6-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/project-context.md`

## Story

As a frontend integrating with notebook artifact generation,
I want same-origin PPTX job routes and normalized server helpers built around the real notebook artifact contract,
so that the Presentation client can start, poll, and download deck jobs without assembling backend URLs or consuming raw backend payloads.

## Acceptance Criteria

1. Given a valid `notebookId` and non-empty `instructions`, when the browser posts to `POST /api/slides/jobs`, then the app starts `POST /v1/notebooks/{notebook_id}/artifacts/generate` through shared backend endpoint builders and returns a normalized `job` payload.
2. Given the browser polls `GET /api/slides/jobs/{notebookId}/{taskId}`, when the backend returns `pending`, `in_progress`, or `completed`, then the route maps those states to `pending`, `inProgress`, or `completed` and normalizes `task_id` and `error_code` fields.
3. Given the browser requests `GET /api/slides/jobs/{notebookId}/{taskId}/download`, when the backend artifact is ready, then the route proxies the PPTX binary response with content type `application/vnd.openxmlformats-officedocument.presentationml.presentation` and a useful `Content-Disposition`.
4. Given `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` is malformed, or `notebookId`/`taskId` are blank after trimming, when a PPTX job route resolves its target, then it fails before any backend fetch with a clear validation or misconfiguration response.
5. Given this story lands before the Presentation client switch, when the current markdown-preview route still exists, then the new PPTX job routes are available without requiring browser-direct backend calls or breaking current app behavior.

## Tasks / Subtasks

- [x] Extend centralized backend endpoint builders for notebook artifacts (AC: 1, 2, 3, 4)
  - [x] Update `lib/backend/endpoints.ts` with helpers for:
    - [x] `POST /v1/notebooks/{notebookId}/artifacts/generate`
    - [x] `GET /v1/notebooks/{notebookId}/artifacts/tasks/{taskId}?wait=false`
    - [x] `GET /v1/notebooks/{notebookId}/artifacts/download?type=slide_deck&artifact_id={taskId}&output_format=pptx`
  - [x] Reuse existing origin normalization and fail-fast notebook-id validation.
  - [x] Validate trimmed `taskId` inputs centrally instead of per-route string concatenation.

- [x] Add slides domain normalization helpers (AC: 1, 2, 3)
  - [x] Create `lib/slides/shared.ts`.
  - [x] Define app-facing job request/response types for init, status, and download flows.
  - [x] Normalize backend `task_id`, `error_code`, and `status` values into the Presentation contract.
  - [x] Treat malformed backend success payloads as route failures instead of leaking partial raw data.

- [x] Add server-owned PPTX transport helpers (AC: 1, 2, 3, 4)
  - [x] Create `lib/slides/server.ts`.
  - [x] Implement artifact-job init, poll, and download helpers around the shared endpoint builders.
  - [x] Classify transport failures separately from notebook-backend configuration errors.
  - [x] Preserve binary download headers needed for PPTX responses.

- [x] Add same-origin slide-job routes (AC: 1, 2, 3, 4)
  - [x] Create `app/api/slides/jobs/route.ts` for job init.
  - [x] Create `app/api/slides/jobs/[notebookId]/[taskId]/route.ts` for polling with `wait=false`.
  - [x] Create `app/api/slides/jobs/[notebookId]/[taskId]/download/route.ts` for PPTX download proxying.
  - [x] Keep these route files thin: validate, call server helpers, translate errors.

- [x] Keep legacy placeholder routes isolated until the client switches (AC: 5)
  - [x] Leave `app/api/slides/generate/route.ts` and `app/api/slides/status/[taskId]/route.ts` untouched unless a small compatibility note is required.
  - [x] Do not wire the Presentation client to the new routes in this story.
  - [x] Make the new `/api/slides/jobs/*` routes the implementation target for Story 1.10.

- [x] Add focused automated coverage for normalization and route behavior (AC: 1, 2, 3, 4, 5)
  - [x] Extend `tests/backend/endpoints.test.ts` for artifact URL builders.
  - [x] Add `tests/slides/shared.test.ts` for backend-to-app status normalization.
  - [x] Add `tests/slides/server.test.ts` for init, poll, download, and transport-failure classification.
  - [x] Add `tests/slides/routes.test.ts` or route-specific files for init, poll, download, and validation/misconfiguration handling.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story depends on Story 1.6 because artifact URL builders must extend the shared notebook-backend endpoint module already in place.
- Story 1.10 depends on the normalized route contract created here.
- This story can run in parallel with Story 1.7 because the write scopes are separate.

### Current Branch Intelligence

- `app/api/slides/generate/route.ts` currently mixes a fake in-memory task path with a synchronous markdown slide-generation path powered by Gemini.
- `app/api/slides/status/[taskId]/route.ts` currently reads from the placeholder in-memory task store.
- No `lib/slides/` module exists yet.
- `generatedNotebookId` already exists in `SessionState` and is the right notebook anchor for the PPTX workflow, but the current routes do not use it.
- The current client still expects markdown slide content and does not yet call any artifact-job routes.

### Architecture Compliance

- Keep the browser on same-origin routes only. No browser-direct notebook artifact calls.
- Keep notebook artifact path ownership centralized in `lib/backend/endpoints.ts`.
- Keep route files thin; backend transport and normalization belong in `lib/slides/`.
- Do not use JSON-only helpers for the PPTX download route; preserve the binary response correctly.
- Separate misconfiguration, validation, and transport failures so the client can make clean retry decisions later.

### File Structure Requirements

- `lib/backend/endpoints.ts`: artifact URL builders
- `lib/slides/shared.ts`: PPTX job types and normalization
- `lib/slides/server.ts`: transport helpers and error classification
- `app/api/slides/jobs/route.ts`
- `app/api/slides/jobs/[notebookId]/[taskId]/route.ts`
- `app/api/slides/jobs/[notebookId]/[taskId]/download/route.ts`
- `tests/backend/endpoints.test.ts`
- `tests/slides/shared.test.ts`
- `tests/slides/server.test.ts`
- `tests/slides/routes.test.ts` or equivalent route coverage

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Start a PPTX job through `POST /api/slides/jobs` and confirm the returned payload contains normalized `taskId`, `state`, `error`, and `errorCode` fields.
  - Poll a job through `GET /api/slides/jobs/{notebookId}/{taskId}` and confirm `pending`, `in_progress`, and `completed` map to the expected app states.
  - Download a completed artifact and confirm the response content type is `application/vnd.openxmlformats-officedocument.presentationml.presentation`.
  - Set `TATTVAM_NOTEBOOK_BACKEND_ORIGIN=http://0.0.0.0:8000` and confirm artifact routes still resolve against `127.0.0.1`.
  - Break backend reachability and confirm the new routes return clear route-level failures without browser-direct backend calls.

### References

- `_bmad-output/implementation-artifacts/spec-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/plan-presentation-pptx-artifact-generation.md`
- `_bmad-output/implementation-artifacts/1-6-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/project-context.md`
- `lib/backend/endpoints.ts`
- `app/api/slides/generate/route.ts`
- `app/api/slides/status/[taskId]/route.ts`
- `app/api/slides/store.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Focused verification: `npm test -- tests/backend/endpoints.test.ts tests/slides/shared.test.ts tests/slides/server.test.ts tests/slides/routes.test.ts`
- Full verification: `npm test`, `npm run lint`, `npm run build`

### Completion Notes List

- Centralized artifact task URLs now append `wait=false`, preserve trimmed task-id validation, and keep PPTX download URL assembly inside `lib/backend/endpoints.ts`.
- Added `lib/slides/shared.ts` and `lib/slides/server.ts` to normalize backend artifact payloads, classify transport failures, and proxy PPTX transport through server-owned helpers.
- Added same-origin PPTX job init, poll, and download routes under `app/api/slides/jobs/*` while leaving the legacy placeholder slide routes untouched for Story 1.10.
- Added focused coverage for endpoint builders, normalization, transport helpers, and route behavior, including validation and download-header handling.

### File List

- `lib/backend/endpoints.ts`
- `lib/slides/shared.ts`
- `lib/slides/server.ts`
- `app/api/slides/jobs/route.ts`
- `app/api/slides/jobs/[notebookId]/[taskId]/route.ts`
- `app/api/slides/jobs/[notebookId]/[taskId]/download/route.ts`
- `tests/backend/endpoints.test.ts`
- `tests/slides/shared.test.ts`
- `tests/slides/server.test.ts`
- `tests/slides/routes.test.ts`
