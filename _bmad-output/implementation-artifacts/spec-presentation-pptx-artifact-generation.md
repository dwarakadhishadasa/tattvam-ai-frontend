---
title: 'Presentation PPTX Artifact Generation and Readiness Polling'
type: 'feature'
created: '2026-03-29'
status: 'proposed'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The current Presentation step still assumes immediate markdown slide generation and an in-app preview/fullscreen flow. The real backend contract for slide-deck creation is a three-step async artifact workflow: initialize generation, poll task status, and download a completed `.pptx` file. Continuing to model this as a synchronous markdown response would misrepresent both latency and output format.

**Approach:** Replace the active Presentation deck-build path with a server-owned PPTX artifact workflow keyed to the real generated notebook. The browser starts a build job through a same-origin route, stores the returned task id, polls status every 60 seconds, shows an honest waiting state, and switches to a ready-to-download experience when the backend reports completion. The completed file is downloaded through a same-origin route that proxies the backend PPTX stream.

## Boundaries & Constraints

**Always:** Keep the browser talking only to same-origin Next.js routes; use the existing `generatedNotebookId` as the notebook handle for the current Presentation workspace; build backend artifact URLs through centralized `lib/backend/endpoints.ts` helpers; poll status every 60 seconds after init succeeds; proxy PPTX download through the app server; preserve `0.0.0.0` to `127.0.0.1` origin normalization.

**Ask First:** Supporting concurrent deck builds for multiple notebooks in one active session; auto-downloading the file immediately when the task completes; prompting for browser-notification permission automatically; preserving the legacy markdown preview/fullscreen deck path alongside the PPTX build path.

**Never:** Let the browser call notebook-backend artifact endpoints directly; use the existing JSON-only fetch helper for the binary download response; show fake percentage progress when the backend exposes only coarse task states; continue describing this workflow as an inline markdown slide preview once PPTX is the active output.

## Proposed Upstream Contract

### 1. Initialize Artifact Generation

```http
POST /v1/notebooks/{notebook_id}/artifacts/generate
Accept: application/json
Content-Type: application/json
```

Request body:

```json
{
  "type": "slide_deck",
  "options": {
    "instructions": "Derived from the extracted visual theme in settings"
  }
}
```

Sample response:

```json
{
  "ok": true,
  "type": "slide_deck",
  "status": {
    "task_id": "a890e8de-6555-45f2-a45f-579d81fe817d",
    "status": "in_progress",
    "url": null,
    "error": null,
    "error_code": null,
    "metadata": null
  }
}
```

Rules:

- `notebook_id` comes from the real notebook created during Extraction and stored as `generatedNotebookId`.
- `options.instructions` must be wired from the current visual theme / extracted style settings.
- The Presentation step may start only when both `generatedNotebookId` and non-empty style instructions exist.

### 2. Poll Artifact Status

```http
GET /v1/notebooks/{notebook_id}/artifacts/tasks/{task_id}?wait=false
Accept: application/json
```

Sample response:

```json
{
  "ok": true,
  "status": {
    "task_id": "a890e8de-6555-45f2-a45f-579d81fe817d",
    "status": "in_progress",
    "url": null,
    "error": null,
    "error_code": null,
    "metadata": null
  }
}
```

Supported backend states for this story:

- `pending` -- the task is accepted but processing has not started
- `in_progress` -- generation is underway
- `completed` -- the artifact is ready to download

Rules:

- The app must call this endpoint with `wait=false`.
- `task_id` comes from the init response.
- Polling cadence for this story is fixed at 60 seconds.

### 3. Download Completed Artifact

```http
GET /v1/notebooks/{notebook_id}/artifacts/download?type=slide_deck&artifact_id={task_id}&output_format=pptx
```

Rules:

- `artifact_id` maps directly from the prior `task_id`.
- The response body is the binary PowerPoint file.
- The response content type is `application/vnd.openxmlformats-officedocument.presentationml.presentation`.

## Local App Contract

The browser should continue calling only app-owned routes.

### Start Job

`POST /api/slides/jobs`

Request body:

```json
{
  "notebookId": "872f230f-36ca-413b-aadb-b171741cf6fb",
  "instructions": "Derived visual theme text"
}
```

Successful response:

```json
{
  "ok": true,
  "job": {
    "taskId": "a890e8de-6555-45f2-a45f-579d81fe817d",
    "state": "pending",
    "error": null,
    "errorCode": null,
    "metadata": null
  }
}
```

### Poll Job Status

`GET /api/slides/jobs/{notebookId}/{taskId}`

Successful response:

```json
{
  "ok": true,
  "job": {
    "taskId": "a890e8de-6555-45f2-a45f-579d81fe817d",
    "state": "inProgress",
    "error": null,
    "errorCode": null,
    "metadata": null
  }
}
```

### Download Completed Job

`GET /api/slides/jobs/{notebookId}/{taskId}/download`

Behavior:

- Proxies the backend binary response
- Returns `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- Preserves or sets a useful `Content-Disposition` filename

Normalization rules:

- Map backend `task_id` to `taskId`.
- Map backend `error_code` to `errorCode`.
- Map backend `status` values:
  - `pending` -> `pending`
  - `in_progress` -> `inProgress`
  - `completed` -> `completed`
- Any explicit backend error payload should be surfaced as a failed job state or a route error rather than leaked raw to the client.

## Presentation State Model

The active Presentation build experience should become job-oriented with these client-visible states:

| State | Meaning | Primary UI treatment |
|-------|---------|----------------------|
| `idle` | No PPTX job started yet | Show `Build PowerPoint` call to action |
| `pending` | Backend has accepted the job but not started work | Show queued message and next-check timing |
| `inProgress` | Deck build is running | Show preparation message and last-checked timestamp |
| `completed` | PPTX is ready | Show success message and `Download .pptx` action |
| `failed` | Backend returned an error or polling failed terminally | Show explicit failure copy and allow retry |

Design rules:

- Do not show fake percentage progress.
- Do not blank the entire step into a spinner for 10 to 20 minutes.
- The waiting state should reassure the user that they can remain on the page and that the app will check again in about a minute.
- The legacy markdown preview/fullscreen deck path is no longer the active contract for this workflow.

## Notification Strategy

Required behavior for this story:

- Show an inline ready state immediately when the polled job transitions to `completed`.
- If the tab is hidden and browser notification permission already exists, the app may also show a local browser notification that the deck is ready.

Not required for this story:

- Service-worker push notifications
- Closed-browser notifications
- Email or external callbacks
- Automatic permission prompts on first use

## Persistence Strategy

Session restore must preserve enough information to resume the waiting experience without starting over.

Approved additions to persisted session state:

- `slideDeckTaskId: string | null`
- `slideDeckState: 'idle' | 'pending' | 'inProgress' | 'completed' | 'failed'`
- `slideDeckError: string | null`
- `slideDeckErrorCode: string | null`
- `slideDeckRequestedAt: number | null`
- `slideDeckLastCheckedAt: number | null`
- `slideDeckCompletedAt: number | null`

Rules:

- Do not persist backend download URLs.
- Keep `generatedNotebookId` as the notebook anchor for artifact actions.
- On restore, if the saved PPTX task state is `pending` or `inProgress`, the app should resume polling rather than silently reset to `idle`.

## User Flow

1. The user reaches Presentation with a real `generatedNotebookId` and a configured visual theme.
2. The user clicks `Build PowerPoint`.
3. The app starts a same-origin PPTX artifact job for the current notebook and stores the returned `taskId`.
4. Presentation switches to a waiting state and polls status every 60 seconds.
5. If the task remains `pending` or `inProgress`, the waiting state continues without faking progress.
6. When the task becomes `completed`, Presentation switches to a ready state and offers `Download .pptx`.
7. If the tab is hidden and notification permission already exists, the app may show a browser notification that the deck is ready.
8. If the user refreshes during `pending` or `inProgress`, the restored session resumes the same job instead of starting a new one.
9. If the task fails, the UI shows a clear failure state and allows retry.

## Code Map

- `lib/backend/endpoints.ts` -- centralized backend origin resolution plus notebook artifact endpoint builders
- `lib/slides/shared.ts` -- PPTX artifact request/response types and backend-to-app normalization helpers
- `lib/slides/server.ts` -- server-owned transport helpers for artifact init, status polling, and binary download proxying
- `app/api/slides/jobs/route.ts` -- validate init payload and start the backend PPTX job
- `app/api/slides/jobs/[notebookId]/[taskId]/route.ts` -- poll normalized job status
- `app/api/slides/jobs/[notebookId]/[taskId]/download/route.ts` -- proxy the PPTX file response
- `components/pipeline/PipelinePageClient.tsx` -- start job, poll every minute, persist job state, and handle ready/download transitions
- `components/pipeline/PipelineSteps.tsx` -- replace markdown-preview-centric Presentation copy and controls with PPTX artifact states
- `components/pipeline/types.ts` and persistence helpers -- extend session state for artifact job tracking and restore

## Tasks & Acceptance

**Execution:**
- [ ] Add server-owned notebook artifact endpoint builders for init, status, and download.
- [ ] Add normalized PPTX artifact server helpers and same-origin slide-job routes.
- [ ] Replace the current immediate markdown deck-generation client path with an async PPTX job workflow.
- [ ] Poll job status every 60 seconds while the task is active.
- [ ] Persist PPTX job state so restore can continue polling for the active notebook.
- [ ] Replace preview/fullscreen-oriented Presentation controls with build, wait, ready, download, and retry states for this workflow.
- [ ] Add inline ready-state notification and optional browser notification behavior when permission already exists and the tab is hidden.
- [ ] Verify PPTX download is proxied through the app server with the correct content type.

**Acceptance Criteria:**
- Given the user is in Presentation with a real `generatedNotebookId` and non-empty visual instructions, when they click `Build PowerPoint`, then the app starts `POST /v1/notebooks/{notebook_id}/artifacts/generate` through a same-origin route using `type=slide_deck`.
- Given init succeeds, when the backend returns a `task_id`, then the client stores that task id, enters a waiting state, and does not expect immediate markdown slides.
- Given a PPTX job is active, when the page remains open, then the client polls the normalized same-origin status route every 60 seconds until the task completes or fails.
- Given the backend reports `pending`, when the poll returns, then the UI shows a queued or waiting state rather than a success state or fake preview.
- Given the backend reports `completed`, when the client receives that status, then Presentation switches to a ready state and offers a `Download .pptx` action.
- Given the user triggers the download route after completion, when the app responds, then it returns a PPTX binary response with content type `application/vnd.openxmlformats-officedocument.presentationml.presentation`.
- Given the app restores a session with an active PPTX job, when the Presentation step loads, then it resumes that job state and polling behavior instead of discarding the task id.
- Given the backend returns an error or the PPTX job fails, when the client receives that result, then Presentation shows a clear failure state and allows the user to retry.

</frozen-after-approval>

## Design Notes

This change intentionally treats the backend notebook artifact flow as the product truth. The key architectural move is to stop pretending that long-running binary artifact generation is the same thing as immediate markdown rendering. Once the notebook backend owns deck creation, the frontend should own orchestration, status honesty, recovery, and download delivery instead of fabricating a synchronous preview abstraction.

I am also intentionally keeping this workflow server-owned even though the client still holds the active `generatedNotebookId`. The browser may carry the current notebook handle back to same-origin routes as an opaque workspace identifier, but it must never assemble backend URLs, preserve backend host knowledge, or call the artifact service directly.

## Spec Change Log

- Replace the active markdown-preview slide generation contract with an async PPTX artifact workflow.
- Add one-minute readiness polling, PPTX download proxying, and resumable Presentation job state.
- Introduce inline ready-state notification and optional browser notification when the tab is hidden and permission already exists.

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Start a PPTX build from Presentation and confirm the UI enters a waiting state using the returned task id.
- Leave the tab open for at least one poll interval and confirm status checks occur every 60 seconds.
- Simulate a `pending` task and confirm the UI remains queued instead of showing success.
- Simulate a completed task and confirm the ready state exposes `Download .pptx`.
- Download the artifact and confirm the response is a real PPTX file with the expected content type.
- Refresh during an active PPTX build and confirm the restored session resumes polling for the same task.
- Fail the backend task and confirm Presentation shows a retryable failure state.

