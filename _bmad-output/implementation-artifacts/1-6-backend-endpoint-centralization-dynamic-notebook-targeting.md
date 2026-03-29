# Story 1.6: Backend Endpoint Centralization with Preconfigured Notebook Targets

Status: review

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/implementation-artifacts/plan-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/project-context.md`

## Story

As a frontend integrating with the notebook backend,
I want backend endpoint construction centralized and Extraction chat notebook targeting configured separately from backend origin,
so that chat and notebook flows share one source of truth and future notebook-target changes do not require transport-level URL edits.

## Acceptance Criteria

1. Given server code needs notebook collection, source-text, or chat URLs, when it resolves a backend endpoint, then it uses one shared module under `lib/` instead of feature-local string literals in `lib/chat/server.ts` and `lib/notebooks/server.ts`.
2. Given the backend origin is unset or uses `0.0.0.0`, when the shared endpoint module resolves URLs, then it normalizes the origin to a client-usable loopback host and derives `/v1/notebooks`, `/v1/notebooks/{id}/sources/text`, and `/v1/notebooks/{id}/chat/ask` from that same normalized origin.
3. Given the backend origin is malformed, a per-call `notebookId` input is blank, or `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` is blank or missing, when an endpoint builder resolves a URL, then it throws a dedicated configuration error before any fetch is attempted.
4. Given `/api/chat` receives `{ question }`, when the route forwards the request, then the browser contract stays notebook-id-free and the server targets `POST /v1/notebooks/{configured_notebook_id}/chat/ask` using `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`.
5. Given a configuration error occurs while resolving backend URLs, when `/api/chat` or `/api/notebooks` handles the request, then the route returns a clear misconfiguration response while preserving current backend-unavailable handling for actual fetch failures.
6. Given local setup docs are updated, when a developer configures the app, then the documented variables are `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` and `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` with no remaining guidance that requires full chat or notebook URL env vars.

## Tasks / Subtasks

- [x] Introduce a centralized backend endpoint and configuration module (AC: 1, 2, 3, 4)
  - [x] Create `lib/backend/endpoints.ts`.
  - [x] Add a dedicated configuration error type such as `NotebookBackendConfigurationError`.
  - [x] Implement helpers aligned to the spec contract:
    - [x] `getNotebookBackendOrigin()`
    - [x] `getNotebooksUrl()`
    - [x] `getNotebookSetSourceUrl(notebookId: string)`
    - [x] `getDefaultExtractionChatNotebookId()`
    - [x] `getDefaultExtractionChatUrl()`
  - [x] Normalize `0.0.0.0` to `127.0.0.1` at the origin level, not separately in each feature adapter.
  - [x] Fail fast on malformed origin values and blank notebook ids after trimming.
  - [x] Keep notebook path ownership in this module so chat and notebook flows cannot drift.

- [x] Migrate notebook transport helpers to the shared endpoint builders (AC: 1, 2, 3, 5)
  - [x] Update `lib/notebooks/server.ts` to remove feature-local URL constants and call the shared endpoint builders.
  - [x] Preserve `NotebookBackendUnavailableError` for network and fetch failures only.
  - [x] Update the backend-unavailable message to reference `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` instead of legacy full-URL guidance.
  - [x] Keep request payloads and transport ownership in `lib/notebooks/server.ts`.
  - [x] Do not wrap configuration errors as backend-unavailable errors.

- [x] Keep chat transport preconfigured and server-owned (AC: 1, 3, 4, 5)
  - [x] Update `lib/chat/server.ts` so `forwardChatQuestion(question)` resolves its target via `getDefaultExtractionChatUrl()`.
  - [x] Remove the hardcoded full notebook chat URL and legacy `TATTVAM_CHAT_API_URL` dependency.
  - [x] Preserve `ChatBackendUnavailableError` for real fetch failures only.
  - [x] Update the chat backend-unavailable message so it points to the new backend-origin configuration guidance.
  - [x] Keep `lib/chat/client.ts` notebook-id-free so the browser never selects the chat target.

- [x] Surface configuration failures clearly at the route boundary while keeping routes thin (AC: 4, 5)
  - [x] In `app/api/chat/route.ts`, keep `{ question }` validation and existing downstream response normalization unchanged.
  - [x] Add dedicated handling for endpoint-configuration errors and return a clear misconfiguration response.
  - [x] Preserve `502` behavior for backend-unavailable fetch failures and malformed backend payloads.
  - [x] In `app/api/notebooks/route.ts`, catch the same configuration error type and return a clear misconfiguration response without attempting backend fetches.
  - [x] Do not move endpoint construction into the route files; routes should only validate, call server helpers, and translate errors.

- [x] Keep client and persistence impact intentionally small in this first pass (AC: 4)
  - [x] Leave `components/pipeline/PipelinePageClient.tsx` unchanged with respect to chat notebook targeting.
  - [x] Do not replace `generatedNotebookId` with a broader notebook-target map.
  - [x] Do not add notebook-target selection UI or client-passed notebook ids.
  - [x] Document any future notebook-target switching as follow-on work, not part of this story.

- [x] Update docs and configuration guidance to the split model (AC: 6)
  - [x] Update `.env.example` to document `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` and `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`.
  - [x] Update `README.md` to remove `TATTVAM_CHAT_API_URL` guidance and explain the split origin-plus-target-id contract.
  - [x] Remove or replace any remaining references to legacy full-URL notebook env vars in user-facing docs.

- [x] Add focused automated coverage for endpoint building and misconfiguration handling (AC: 2, 3, 4, 5, 6)
  - [x] Add a new `tests/backend/endpoints.test.ts` covering origin normalization, URL building, malformed origin rejection, blank builder input rejection, and default Extraction chat URL resolution.
  - [x] Update `tests/notebooks/server.test.ts` to assert notebook transport uses shared builders and still classifies fetch failures as `NotebookBackendUnavailableError`.
  - [x] Update `tests/chat/server.test.ts` to assert chat transport resolves the configured notebook target through the shared endpoint module and still classifies fetch failures as `ChatBackendUnavailableError`.
  - [x] Add `tests/chat/route.test.ts` because route-level misconfiguration behavior is currently untested.
  - [x] Extend `tests/notebooks/route.test.ts` with a configuration-error case that confirms the route fails before fetch when builder resolution is invalid.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story builds on the notebook create-and-seed flow already introduced in Story 1.4.
- Implement the shared endpoint module first. Migrate notebook and chat adapters only after the builder API is stable.
- This story should land before any work that introduces notebook-target switching behavior.

### Current Branch Intelligence

- `lib/chat/server.ts` currently embeds a full default chat URL that already includes one notebook id and still advertises `TATTVAM_CHAT_API_URL`.
- `lib/notebooks/server.ts` currently owns `DEFAULT_NOTEBOOKS_API_URL`, still advertises `TATTVAM_NOTEBOOKS_API_URL`, and locally derives the `sources/text` path with string concatenation.
- `app/api/chat/route.ts` already accepts only `{ question }` and already owns downstream response normalization. Preserve that browser contract.
- `app/api/notebooks/route.ts` already performs create-then-seed orchestration. Preserve that browser-facing contract and only change how backend URLs are resolved.
- `README.md` and `.env.example` still document the legacy full chat URL env contract and must be updated as part of this story.
- `tests/notebooks/route.test.ts` exists, but there is currently no `tests/chat/route.test.ts`, so route-level misconfiguration coverage for chat must be added rather than assumed.
- Recent commit `815d0a3` introduced notebook creation and source-text seeding. Extend that server-boundary pattern rather than re-architecting the flow.

### Architecture Compliance

- Keep route files thin. Endpoint construction belongs in `lib/backend/endpoints.ts`, not in route handlers or client code.
- Keep raw backend path knowledge and snake_case handling at server boundaries.
- Separate configuration failures from transport failures. Invalid env or notebook-target configuration is not the same as backend unavailability.
- Preserve same-origin browser contracts. The client must continue calling local Next.js routes only.
- Do not widen persistence or UI scope in this story. Centralizing endpoint logic is the goal; notebook-role UX is out of scope.

### Implementation Guardrails

- Use the shared endpoint module as the only source of truth for notebook path assembly.
- Continue encoding notebook ids when interpolating them into path segments.
- Validate trimmed env values and trimmed `notebookId` inputs before building URLs.
- Build URLs from normalized origin plus explicit paths; do not duplicate slash-normalization logic in feature adapters.
- Do not add backward-compatibility fallbacks for `TATTVAM_CHAT_API_URL` or `TATTVAM_NOTEBOOKS_API_URL` unless product intent changes. The spec explicitly rejects legacy compatibility handling.
- For this story, treat configuration failures as server misconfiguration responses and keep backend fetch failures mapped to the existing unavailable behavior.

### File Structure Requirements

- `lib/backend/endpoints.ts`: new shared origin resolution, endpoint builders, and configuration error type
- `lib/chat/server.ts`: chat transport only, using the shared chat-target builder
- `app/api/chat/route.ts`: request validation, config-error translation, and existing chat normalization
- `lib/chat/client.ts`: unchanged request payload shape
- `lib/notebooks/server.ts`: notebook transport only, using shared collection and source-upload builders
- `app/api/notebooks/route.ts`: existing create-then-seed orchestration with config-error translation
- `.env.example`: new split env contract
- `README.md`: updated local setup instructions
- `tests/backend/endpoints.test.ts`: new endpoint-builder regression coverage
- `tests/chat/server.test.ts`: shared-builder chat transport coverage
- `tests/chat/route.test.ts`: new route-level chat misconfiguration coverage
- `tests/notebooks/server.test.ts`: shared-builder notebook transport coverage
- `tests/notebooks/route.test.ts`: route-level notebook misconfiguration coverage

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Configure `TATTVAM_NOTEBOOK_BACKEND_ORIGIN=http://0.0.0.0:8000` and a valid `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`, then confirm Extraction chat still reaches the backend through `127.0.0.1`.
  - Create and seed a notebook after the refactor and confirm the server still hits `/v1/notebooks` followed by `/v1/notebooks/{id}/sources/text`.
  - Set `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` to an invalid absolute URL and confirm `/api/chat` and `/api/notebooks` return a clear misconfiguration response before any backend fetch occurs.
  - Remove `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` and confirm `/api/chat` fails with a clear configuration message instead of silently targeting another notebook.
  - Confirm the browser request to `/api/chat` still contains only `{ question }`.

### Assumptions

- Route-level configuration failures should be surfaced as internal misconfiguration responses, while network failures should keep the existing `502` unavailable behavior.
- No persistence-schema changes are needed in this story because `generatedNotebookId` remains the generated Presentation notebook handle and is unrelated to Extraction chat targeting.
- Slide-generation backend behavior is unaffected by this refactor.

### References

- `_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/implementation-artifacts/plan-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/implementation-artifacts/spec-chat-proxy-fetch-failure-recovery.md`
- `_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md`
- `_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md`
- `_bmad-output/project-context.md`
- `app/api/chat/route.ts`
- `app/api/notebooks/route.ts`
- `lib/chat/client.ts`
- `lib/chat/server.ts`
- `lib/notebooks/server.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `tests/chat/server.test.ts`
- `tests/notebooks/route.test.ts`
- `tests/notebooks/server.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Source review across current route, server adapter, test, and documentation files on 2026-03-28.
- Focused red/green cycle completed with `npm test -- tests/backend/endpoints.test.ts tests/chat/server.test.ts tests/chat/route.test.ts tests/notebooks/server.test.ts tests/notebooks/route.test.ts` on 2026-03-28.
- Full validation completed with `npm test`, `npm run lint`, and `npm run build` on 2026-03-28.

### Completion Notes List

- Added `lib/backend/endpoints.ts` as the single source of truth for normalized backend origin resolution, notebook path construction, and dedicated configuration-error classification.
- Migrated `lib/chat/server.ts` and `lib/notebooks/server.ts` to shared endpoint builders so configuration errors fail fast while transport failures still map to backend-unavailable errors.
- Added route-level misconfiguration handling in `app/api/chat/route.ts` and `app/api/notebooks/route.ts` without changing browser request contracts or downstream normalization.
- Updated `.env.example` and `README.md` to the split `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` plus `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` contract.
- Added automated coverage for endpoint normalization, shared-builder usage, and route-level misconfiguration behavior; all tests, lint, and build are green.

### File List

- `.env.example`
- `README.md`
- `_bmad-output/implementation-artifacts/1-6-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `app/api/chat/route.ts`
- `app/api/notebooks/route.ts`
- `lib/backend/endpoints.ts`
- `lib/chat/server.ts`
- `lib/notebooks/server.ts`
- `tests/backend/endpoints.test.ts`
- `tests/chat/route.test.ts`
- `tests/chat/server.test.ts`
- `tests/notebooks/route.test.ts`
- `tests/notebooks/server.test.ts`
