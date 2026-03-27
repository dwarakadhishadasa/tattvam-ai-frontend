---
title: 'Implementation Plan: Extraction Generate Slides Notebook Creation'
type: 'implementation-plan'
created: '2026-03-27'
status: 'done'
context:
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/1-3-extraction-notebook-workspace.md'
---

## Goal

Replace the Extraction-stage timeout simulation behind `Generate Slides` with a real notebook-creation handoff backed by `POST /v1/notebooks`, while preserving the current three-step flow and storing the returned notebook ID for later slide generation.

## Target Workflow

1. The user saves notebook entries inside Extraction.
2. The user clicks `Generate Slides`.
3. The client resolves the final notebook title, defaulting to `Untitled Workspace` when blank.
4. The client posts the title to `/api/notebooks`.
5. The Next.js route proxies to the notebook backend `POST /v1/notebooks`.
6. The route normalizes the backend response and returns the created notebook summary.
7. The client stores `notebook.id` in `generatedNotebookId`, clears stale slide output, and advances to Presentation.

## Scope

### In Scope

- Add a notebook-creation proxy route in Next.js
- Add a server adapter for notebook-backend URL normalization and transport failures
- Normalize the create-notebook success payload into an app-facing contract
- Replace the Extraction timeout simulation with a real create-notebook call
- Surface notebook-creation failures in the Extraction UI
- Add focused test coverage for the adapter and success-payload normalization

### Out of Scope

- Uploading sources into the created notebook
- Switching chat to the newly created notebook ID
- Changing Presentation generation to call notebook artifact endpoints
- Adding notebook listing, deletion, or rename flows

## Implementation Changes

### 1. Server Boundary

Add [app/api/notebooks/route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/notebooks/route.ts):

- Accept `POST` requests with `{ title }`
- Validate that `title` is present after trimming
- Proxy the request to the notebook backend
- Normalize the success payload before returning it to the browser
- Preserve upstream status codes when the backend responds with an error
- Return `502` for classified backend-unavailable failures

### 2. Notebook Transport Helpers

Add notebook backend helpers under [lib/notebooks/server.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/notebooks/server.ts) and [lib/notebooks/shared.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/notebooks/shared.ts):

- Own the default notebook endpoint URL
- Normalize `0.0.0.0` loopback hosts to `127.0.0.1`
- Wrap transport failures in a notebook-specific unavailable error
- Normalize the backend success payload from snake_case to the app contract

### 3. Extraction Handoff

Update [components/pipeline/PipelinePageClient.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelinePageClient.tsx):

- Replace the timeout-based `handleGenerateNotebook()` implementation with a real `fetchJson("/api/notebooks")` call
- Continue defaulting blank names to `Untitled Workspace`
- Store the returned notebook ID in `generatedNotebookId`
- Clear `generatedSlides` after a successful notebook creation so stale decks are not reused
- Preserve the current step transition into Presentation on success
- Track a dedicated Extraction-side notebook-creation error state

### 4. Extraction Feedback

Update [components/pipeline/PipelineSteps.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineSteps.tsx):

- Accept the new notebook-creation error prop
- Render failure feedback in the notebook footer area
- Update the loading copy so the handoff accurately reflects notebook creation before slide generation

### 5. Verification

Add focused tests:

- [tests/notebooks/server.test.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/tests/notebooks/server.test.ts)
- [tests/notebooks/shared.test.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/tests/notebooks/shared.test.ts)

## Suggested Delivery Order

1. Add notebook transport and response-normalization helpers.
2. Add the `/api/notebooks` proxy route.
3. Update the Extraction client handoff and footer feedback.
4. Add regression tests.
5. Run lint, test, and build verification.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Save a notebook entry in Extraction and click `Generate Slides`.
2. Confirm the request creates a backend notebook and advances to Presentation.
3. Repeat with a blank notebook title and confirm the default title is used.
4. Break backend reachability and confirm Extraction shows an error without advancing.
5. Recreate a notebook after previously generated slides and confirm stale deck content is cleared.

## Risks

- If the route returns raw backend payloads instead of a normalized contract, the client will inherit provider-specific shape and naming drift.
- If notebook creation errors are not surfaced in Extraction, the user will see a dead-end button with no explanation.
- If old generated slide output is not cleared after notebook recreation, Presentation can display stale content that no longer matches the newly created notebook.
