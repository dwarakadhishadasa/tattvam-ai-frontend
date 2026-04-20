# Story 1.7: Server-Owned Multi-Notebook Chat Stream Route

Status: done

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/plan-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/1-6-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/project-context.md`

## Story

As a presenter researching a question in Extraction,
I want one same-origin chat request to fan out across the approved server-owned notebook targets,
so that the app can stream target-scoped results without the browser ever choosing notebook ids.

## Acceptance Criteria

1. Given `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` is configured with the approved four extraction targets, when `POST /api/chat/stream` receives `{ question }`, then the server resolves exactly those four targets and the browser still sends no notebook ids.
2. Given the server needs a per-target notebook chat URL, when it resolves that URL, then it uses a shared `getNotebookChatUrl(notebookId)` helper from `lib/backend/endpoints.ts` so origin normalization, path encoding, and blank-id rejection stay centralized.
3. Given the route starts the four downstream notebook chat requests, when targets settle in any order, then it emits target-scoped `target.completed` or `target.failed` events followed by one final `chat.completed` event.
4. Given one target fails, returns malformed payload, or cannot be reached, when the other targets succeed, then successful target events still stream and the route does not collapse the entire prompt into one failure response.
5. Given the question is blank, or the target registry/backend configuration is invalid, when the route is called, then it rejects before streaming begins with a clear validation or misconfiguration response.
6. Given this story is implemented, when the existing JSON `POST /api/chat` route is used, then its request contract and success response shape remain unchanged.

## Tasks / Subtasks

- [x] Add a server-owned extraction target registry module (AC: 1, 5)
  - [x] Create `lib/chat/targets.ts`.
  - [x] Parse `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` into a typed four-item target array.
  - [x] Validate trimmed non-blank `key`, `label`, and `notebookId` fields.
  - [x] Enforce unique keys and the approved fixed four-target contract for this phase.
  - [x] Throw a dedicated configuration error when the registry is malformed.

- [x] Extend centralized backend endpoint building for arbitrary notebook chat targets (AC: 1, 2, 5)
  - [x] Add `getNotebookChatUrl(notebookId: string)` to `lib/backend/endpoints.ts`.
  - [x] Reuse the existing normalized backend origin and per-call notebook-id validation rules.
  - [x] Keep `getDefaultExtractionChatUrl()` intact for the legacy single-target route.

- [x] Add target-aware server chat transport helpers (AC: 2, 3, 4)
  - [x] Refactor `lib/chat/server.ts` so chat forwarding can target any approved notebook id, not only the default extraction notebook.
  - [x] Reuse existing fetch-failure classification and downstream response normalization utilities.
  - [x] Keep route handlers thin by moving fan-out orchestration and event formatting into `lib/chat/`.

- [x] Add the streaming fan-out route and event writer (AC: 1, 3, 4, 5, 6)
  - [x] Create `app/api/chat/stream/route.ts`.
  - [x] Validate `{ question }` before resolving targets or writing stream bytes.
  - [x] Resolve the target registry before any downstream fetch begins.
  - [x] Start all downstream requests concurrently and emit `target.completed`, `target.failed`, and `chat.completed` events as targets settle.
  - [x] Keep `POST /api/chat` unchanged in this story.

- [x] Align configuration and runtime documentation (AC: 1, 5)
  - [x] Update `.env.example` with the fixed four-target registry example.
  - [x] Update `README.md` with the extraction chat target configuration rules for this phase.
  - [x] Update `_bmad-output/planning-artifacts/runtime-interfaces.md` with the `/api/chat/stream` event contract.
  - [x] Update `_bmad-output/planning-artifacts/data-model.md` only as needed for the server-owned target contract.

- [x] Add focused automated coverage for registry validation and stream orchestration (AC: 1, 3, 4, 5, 6)
  - [x] Extend `tests/backend/endpoints.test.ts` for `getNotebookChatUrl(notebookId)`.
  - [x] Extend `tests/chat/server.test.ts` for target-specific forwarding.
  - [x] Add `tests/chat/targets.test.ts` for four-target parsing and misconfiguration failures.
  - [x] Add `tests/chat/stream-route.test.ts` for event sequencing, partial failure handling, and pre-stream validation/configuration failures.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story depends on Story 1.6 because generic notebook chat URL building must extend the centralized endpoint work already established there.
- Story 1.8 should treat the event names and target payload shape defined here as the contract to consume; stabilize the stream protocol before client transcript work starts.
- This story can be implemented in parallel with Story 1.9 because the write scopes are separate.

### Current Branch Intelligence

- `lib/backend/endpoints.ts` currently exposes only the default Extraction chat target helper and notebook create/source-upload builders.
- `lib/chat/server.ts` currently forwards one request to `getDefaultExtractionChatUrl()` and does not support arbitrary notebook targets.
- `app/api/chat/route.ts` currently validates `{ question }`, forwards to one downstream target, and normalizes a single JSON result.
- No streaming route or target-registry module exists yet.
- `lib/chat/client.ts` is still a one-shot JSON client; do not pull UI stream consumption into this server-contract story.

### Architecture Compliance

- Keep the browser notebook-id-free. Notebook ids stay server-owned and come only from validated server configuration.
- Keep route files thin. Registry parsing, per-target forwarding, and event formatting belong in `lib/chat/` helpers.
- Reuse shared endpoint builders under `lib/backend/`; do not concatenate notebook chat URLs inside routes or tests.
- Fail fast on misconfiguration before the stream starts so the client does not have to reconcile a half-open event stream.
- Preserve the existing `/api/chat` route as a stable fallback while the richer streaming client lands in a follow-on story.

### File Structure Requirements

- `lib/backend/endpoints.ts`: add `getNotebookChatUrl(notebookId)`
- `lib/chat/targets.ts`: fixed four-target registry parsing and validation
- `lib/chat/server.ts`: target-aware forwarding helpers
- `lib/chat/stream.ts` or equivalent: event serialization and orchestration helpers
- `app/api/chat/stream/route.ts`: same-origin streaming route
- `.env.example` and `README.md`: target registry documentation
- `_bmad-output/planning-artifacts/runtime-interfaces.md`: stream event contract
- `tests/backend/endpoints.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/targets.test.ts`
- `tests/chat/stream-route.test.ts`

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Configure the approved four extraction targets and confirm one prompt yields per-target events from `/api/chat/stream`.
  - Force one target to fail and confirm the stream still emits successful events for the other targets plus a final `chat.completed`.
  - Submit a blank question and confirm the route fails before streaming.
  - Break the registry JSON and confirm the route returns a clear misconfiguration response before any downstream fetch begins.
  - Confirm the legacy JSON `POST /api/chat` route still works unchanged.

### References

- `_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/plan-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/1-6-backend-endpoint-centralization-dynamic-notebook-targeting.md`
- `_bmad-output/project-context.md`
- `app/api/chat/route.ts`
- `lib/backend/endpoints.ts`
- `lib/chat/server.ts`
- `lib/chat/client.ts`
- `lib/chat/normalize.ts`
- `tests/chat/route.test.ts`
- `tests/chat/server.test.ts`
- `tests/backend/endpoints.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- tests/backend/endpoints.test.ts tests/chat/server.test.ts tests/chat/targets.test.ts tests/chat/stream-route.test.ts tests/chat/route.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`

### Completion Notes List

- Added server-owned extraction target validation in `lib/chat/targets.ts` with exact four-target approval checks and dedicated misconfiguration errors.
- Extended `lib/backend/endpoints.ts` and `lib/chat/server.ts` so per-target chat routing stays centralized and `/api/chat` keeps its existing browser contract.
- Added `lib/chat/stream.ts` plus `app/api/chat/stream/route.ts` to fan out four concurrent notebook requests and emit `target.completed`, `target.failed`, and final `chat.completed` events.
- Updated environment/runtime documentation and added focused registry, endpoint, transport, and stream route coverage.

### File List

- `lib/backend/endpoints.ts`
- `lib/chat/shared.ts`
- `lib/chat/server.ts`
- `lib/chat/targets.ts`
- `lib/chat/stream.ts`
- `app/api/chat/route.ts`
- `app/api/chat/stream/route.ts`
- `tests/backend/endpoints.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/targets.test.ts`
- `tests/chat/stream-route.test.ts`
- `tests/chat/route.test.ts`
- `.env.example`
- `README.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/planning-artifacts/data-model.md`
