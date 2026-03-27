# Story 1.2: Chat API Contract Normalization

Status: ready-for-dev

## Source Artifact

- `_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md`

## Story

As a frontend consuming notebook chat answers,
I want `/api/chat` to return a normalized app-facing contract,
so that the browser can render and persist stable fields without parsing provider-shaped payload blobs.

## Acceptance Criteria

1. Given the sample downstream payload with prose, appendix, and structured references, when `/api/chat` returns successfully, then the browser receives `answerBody` without the raw appendix and a `citations` array with the correct excerpt-to-URL mapping.
2. Given the downstream appendix heading changes wording or is omitted, when the tail is still structurally citation-shaped, then the server normalizer still strips it from `answerBody`.
3. Given a reference already includes an explicit media URL, when normalization runs, then that explicit URL wins over appendix-derived mapping.
4. Given extra appendix URLs exist without matching structured references, when normalization runs, then those orphan URLs do not appear in the client-visible contract.
5. Given an already persisted assistant message contains the old raw appendix, when that session is restored after the new server contract ships, then the compatibility layer still prevents raw appendix URLs from reappearing in chat.

## Tasks / Subtasks

- [ ] Introduce a server-owned chat normalizer and keep raw downstream types off the client boundary (AC: 1, 2, 3, 4)
  - [ ] Create `lib/chat/normalize.ts` to own structural appendix detection, URL extraction, and normalized contract assembly.
  - [ ] Prefer explicit reference URLs (`url`, `source_url`, `timestamped_url`, `link`) over appendix-derived mapping.
  - [ ] Use structural tail analysis rather than heading-label equality so dynamic labels do not break normalization.

- [ ] Return the normalized contract from `/api/chat` without breaking existing transport/error handling (AC: 1, 2, 3, 4)
  - [ ] Update `app/api/chat/route.ts` to return the app-facing shape with `answerBody`, `citations`, `conversationId`, `turnNumber`, and `isFollowUp`.
  - [ ] Preserve `POST /api/chat` as the frontend entry point and preserve request body shape `{ question }`.
  - [ ] Keep the current backend-unavailable handling from `ChatBackendUnavailableError` and preserve non-OK status passthrough.

- [ ] Move live-response consumption to the normalized contract while preserving restore compatibility (AC: 1, 5)
  - [ ] Update `lib/chat/shared.ts` to hold app-facing chat types only, or clearly separate normalized client types from raw downstream types.
  - [ ] Update `lib/chat/client.ts` to fetch the normalized route contract.
  - [ ] Update `components/pipeline/PipelinePageClient.tsx` to append assistant messages from explicit `answerBody` and `citations` instead of calling client-side normalization on fresh responses.
  - [ ] Keep `stripCitationAppendix()` or an equivalent restore-time compatibility helper for already persisted legacy assistant messages.

- [ ] Add focused regression coverage for server normalization and legacy restore safety (AC: 1, 2, 3, 4, 5)
  - [ ] Add `tests/chat/normalize.test.ts` for appendix stripping, explicit URL preference, orphan URL exclusion, and ambiguous-tail safety.
  - [ ] Update `tests/chat/shared.test.ts` to assert the browser-facing contract expectation and restore-time sanitation behavior.
  - [ ] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story should be implemented after Story 1.1 so the transcript is already answer-only and citation interactions are stable.

### Current Branch Intelligence

- The current worktree already includes the fetch-failure recovery fix in `lib/chat/server.ts` and `app/api/chat/route.ts`.
- Preserve the loopback URL normalization and `ChatBackendUnavailableError` flow while changing only the success payload shape.
- The current client still parses live responses in `components/pipeline/PipelinePageClient.tsx`; that responsibility should move to the server in this story.

### Architecture Compliance

- Project context explicitly requires raw backend payload shaping at server boundaries. Keep provider-shaped response handling in `app/api/chat/route.ts` and `lib/chat/normalize.ts`, not in JSX or browser persistence helpers.
- Do not expose raw provider `answer` blobs to the browser as the primary contract after this story.
- Keep saved citation provenance and modal behavior intact by preserving the `Citation` shape used by `MessageMarkdown` and `PipelineModals`.

### File Structure Requirements

- `app/api/chat/route.ts`: success response normalization and status handling
- `lib/chat/server.ts`: downstream transport only; do not reintroduce response shaping here unless it is transport-specific
- `lib/chat/normalize.ts`: structural appendix parsing and normalized contract assembly
- `lib/chat/shared.ts`: browser-facing chat types and restore-time compatibility helpers
- `lib/chat/client.ts`: normalized fetch typing
- `components/pipeline/PipelinePageClient.tsx`: live-response consumption
- `hooks/useSessionPersistence.ts`: legacy restore compatibility if helper placement changes
- `tests/chat/normalize.test.ts` and `tests/chat/shared.test.ts`: regression coverage

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Submit a prompt that returns prose plus a citation appendix and confirm the browser renders only `answerBody`.
  - Click inline citations and confirm modal content and embedded video still match the normalized citations array.
  - Restore an older saved session and confirm raw appendix URLs do not reappear in chat.
  - Force a backend transport failure and confirm the current clear backend-unavailable message still returns from `/api/chat`.

### References

- `_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md`
- `_bmad-output/implementation-artifacts/spec-chat-answer-only-rendering.md`
- `_bmad-output/planning-artifacts/spec.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/planning-artifacts/data-model.md`
- `_bmad-output/project-context.md`
- `app/api/chat/route.ts`
- `lib/chat/server.ts`
- `lib/chat/shared.ts`
- `components/pipeline/PipelinePageClient.tsx`

## Dev Agent Record

### Agent Model Used

_TBD by dev agent_

### Debug Log References

- Source artifact: `spec-chat-api-contract-normalization.md`

### Completion Notes List

- Normalize raw notebook backend responses at the Next.js server boundary.
- Preserve existing transport failure handling and legacy restore sanitation.

### File List

- `app/api/chat/route.ts`
- `lib/chat/server.ts`
- `lib/chat/normalize.ts`
- `lib/chat/shared.ts`
- `lib/chat/client.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `hooks/useSessionPersistence.ts`
- `tests/chat/normalize.test.ts`
- `tests/chat/shared.test.ts`
