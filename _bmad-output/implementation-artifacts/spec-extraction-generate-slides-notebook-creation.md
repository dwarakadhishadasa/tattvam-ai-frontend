---
title: 'Extraction Generate Slides Notebook Creation'
type: 'feature'
created: '2026-03-27'
status: 'done'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/spec.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/implementation-artifacts/1-3-extraction-notebook-workspace.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The Extraction-phase `Generate Slides` action still simulates notebook creation locally by waiting on a timeout and storing a synthetic `nb_*` identifier. That makes the presentation handoff look complete in the UI, but it does not create a real backend notebook and leaves no durable notebook ID for later artifact-generation calls.

**Approach:** Replace the simulated handoff with a thin Next.js server boundary that proxies `POST /v1/notebooks`, normalizes the backend response, and returns a real notebook identifier to the browser. The Extraction client should keep the existing button position and overall workflow, but it must create the notebook first, persist the returned ID in session state, and only then advance to Presentation.

## Boundaries & Constraints

**Always:** Keep the browser calling a local Next.js route rather than the backend directly; create the notebook only when the Extraction `Generate Slides` action is pressed; preserve the current default-name fallback when the workspace name is blank; persist the returned notebook ID in `generatedNotebookId` so later slide-deck steps can reuse it.

**Ask First:** Changing the visible step structure again; moving notebook creation earlier than the explicit Extraction handoff; coupling the browser to raw backend snake_case payloads; requiring the Presentation step to generate slides immediately as part of notebook creation.

**Never:** Reintroduce simulated notebook IDs once the backend endpoint is available; send raw backend notebook payloads straight into client state without shaping them at the server boundary; block future use of the real notebook ID by discarding it after the step transition.

## Proposed Contract

### Upstream Endpoint

The backend notebook service exposes:

```http
POST /v1/notebooks
Content-Type: application/json
```

Request body:

```json
{
  "title": "Teeessst"
}
```

Sample successful response:

```json
{
  "ok": true,
  "notebook": {
    "id": "87e2c32e-6ca4-4ed7-8268-4905b50469c0",
    "title": "Teeessst",
    "created_at": null,
    "sources_count": 0,
    "is_owner": true
  }
}
```

### Local App Contract

The browser should call a local route such as `/api/notebooks`, and that route should return a normalized app contract:

```json
{
  "ok": true,
  "notebook": {
    "id": "87e2c32e-6ca4-4ed7-8268-4905b50469c0",
    "title": "Teeessst",
    "createdAt": null,
    "sourcesCount": 0,
    "isOwner": true
  }
}
```

Normalization rules:

- Require `notebook.id` and `notebook.title` as the minimum success contract.
- Map backend `created_at` to `createdAt`.
- Map backend `sources_count` to `sourcesCount`, defaulting to `0` if omitted.
- Map backend `is_owner` to `isOwner`, defaulting to `false` if omitted.
- Treat malformed success payloads as proxy failures instead of leaking partial raw data to the client.

## User Flow

1. The user stays in the Extraction step and saves notebook content as today.
2. The user clicks `Generate Slides`.
3. The client resolves the workspace title, defaulting to `Untitled Workspace` when blank.
4. The client posts `{ title }` to `/api/notebooks`.
5. The Next.js route proxies the request to the notebook backend `POST /v1/notebooks`.
6. On success, the client stores `notebook.id` in `generatedNotebookId`, closes any active notebook editor, clears stale generated slides, and advances to Presentation.
7. On failure, the Extraction step stays in place and shows an explicit error message near the handoff control.

## Code Map

- `app/api/notebooks/route.ts` -- server boundary that validates the request, proxies upstream, normalizes the response, and classifies backend failures
- `lib/notebooks/server.ts` -- notebook backend transport ownership, host normalization, and backend-unavailable classification
- `lib/notebooks/shared.ts` -- notebook response normalization and shared route response types
- `components/pipeline/PipelinePageClient.tsx` -- Extraction handoff wiring, notebook creation request, persistent notebook ID storage, and error-state handling
- `components/pipeline/PipelineSteps.tsx` -- Extraction footer feedback for notebook-creation failures and accurate loading copy
- `tests/notebooks/server.test.ts` -- backend transport and URL normalization coverage
- `tests/notebooks/shared.test.ts` -- notebook response normalization coverage

## Tasks & Acceptance

**Execution:**
- [ ] Add a thin `/api/notebooks` route that proxies notebook creation to the notebook backend.
- [ ] Add a small server adapter that normalizes `0.0.0.0` to `127.0.0.1`, owns the backend URL, and classifies transport failures.
- [ ] Normalize the upstream create-notebook payload into an app-facing contract before returning it from the route.
- [ ] Replace the Extraction timeout-based notebook-generation simulation with a real call to `/api/notebooks`.
- [ ] Persist the returned notebook ID in session state through the existing `generatedNotebookId` field.
- [ ] Keep the default workspace name fallback when the user leaves the notebook title blank.
- [ ] Surface notebook-creation failures inside Extraction instead of silently failing or advancing.
- [ ] Add focused tests for notebook URL normalization, transport failure classification, and success-payload normalization.

**Acceptance Criteria:**
- Given the user clicks `Generate Slides` in Extraction with at least one saved notebook entry, when the request succeeds, then the app creates a real backend notebook and stores the returned notebook ID in `generatedNotebookId`.
- Given the workspace name input is blank, when the user clicks `Generate Slides`, then the request still succeeds using the default title `Untitled Workspace`.
- Given the backend returns the sample success payload shown above, when the local route responds, then the browser receives the normalized notebook contract with `id`, `title`, `createdAt`, `sourcesCount`, and `isOwner`.
- Given the notebook backend is unavailable or the request fails, when the user clicks `Generate Slides`, then Extraction stays active and shows a useful error message without fabricating an ID.
- Given a deck was previously generated, when the user creates a new notebook from Extraction, then stale generated slides are cleared before the next Presentation generation run.

</frozen-after-approval>

## Design Notes

This is deliberately a small, boring handoff. The browser should not know where the notebook service lives, should not normalize snake_case payloads, and should not invent identifiers. The only new client responsibility is to treat notebook creation as the gateway into Presentation and to preserve the resulting ID for the next backend-backed steps.

The existing `generatedNotebookId` field is already the right persistence hook for this change. Reusing it keeps restore logic stable and avoids widening the session model just to represent a concept the app already has: "a notebook was created and Presentation is now unlocked."

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Save one or more Extraction notebook entries, click `Generate Slides`, and confirm Presentation opens only after a real notebook is created.
- Leave the workspace name blank, click `Generate Slides`, and confirm the created notebook title becomes `Untitled Workspace`.
- Stop the notebook backend, click `Generate Slides`, and confirm the Extraction footer shows an error instead of advancing.
- Create a notebook, return to Extraction, change notebook content, create another notebook, and confirm the old generated deck no longer remains visible as current output.
