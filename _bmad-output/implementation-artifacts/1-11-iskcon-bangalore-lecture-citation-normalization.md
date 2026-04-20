# Story 1.11: ISKCON Bangalore Lecture Citation Normalization

Status: in-progress

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md`
- `_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/1-2-chat-api-contract-normalization.md`
- `_bmad-output/implementation-artifacts/1-7-multi-notebook-chat-stream-route.md`
- `_bmad-output/project-context.md`

## Story

As a presenter reviewing answers from `ISKCON Bangalore Lectures`,
I want lecture citations normalized at the server boundary into a reduced cited-only deterministic `number` + `url` + `text` set,
so that the browser can open clean citation details without parsing the backend's metadata-heavy lecture blob or carrying uncited lecture references.

## Acceptance Criteria

1. Given a streamed or one-shot chat result for target key `ISKCON Bangalore Lectures`, when normalization runs, then each citation is built from `references[*].citation_number` rather than appendix order or answer order.
2. Given a lecture response whose `references` array is larger than the answer's cited-number set, when normalization runs, then it derives the concrete cited-number set from the answer body and removes uncited references before the normalized result reaches browser state or persistence.
3. Given a lecture reference whose `cited_text` contains both `URL:` and `Content:`, when normalization runs, then `citation.url` contains the parsed lecture URL and `citation.text` contains only the trimmed content excerpt.
4. Given a lecture reference is missing one expected marker, when normalization runs, then it preserves the usable field through explicit URL fields or current generic extraction logic and does not fail the whole response.
5. Given multiple lecture references claim the same positive `citation_number`, when normalization runs, then exactly one deterministic citation survives for that number and later duplicates are ignored.
6. Given any approved non-lecture target result, when normalization runs, then the current appendix stripping, citation extraction, and browser-facing contract remain unchanged.
7. Given target-scoped streaming is active, when a target completes, then the server-owned normalization path receives the completed target key without pushing target-specific parsing into route JSX or browser code.

## Tasks / Subtasks

- [x] Centralize the approved lecture target identity (AC: 1, 6, 7)
  - [x] Update `lib/chat/targets.ts` to export a stable constant or helper for `ISKCON Bangalore Lectures`.
  - [x] Reuse that exported identifier anywhere lecture-target branching is needed.
  - [x] Avoid introducing duplicate string literals for the lecture key in normalization or streaming code.

- [x] Extend server-owned normalization with cited-number pruning and lecture-aware context (AC: 1, 2, 3, 4, 5, 6)
  - [x] Update `lib/chat/normalize.ts` so normalization can accept optional context such as `{ targetKey }` without changing the browser-facing `Citation` shape.
  - [x] Reuse or expose the current answer-range expansion logic so the server can derive the concrete cited-number set from the normalized answer body without drifting from browser linkification rules.
  - [x] Filter lecture `references` to only entries whose `citation_number` appears in that cited-number set before lecture parsing continues.
  - [x] Add a lecture-specific parser that reads `references[*].citation_number`, extracts `URL:` and `Content:` from `cited_text`, and discards `Themes`, `Audience`, and `Content-type`.
  - [x] Keep explicit URL fields (`url`, `source_url`, `timestamped_url`, `link`) as the highest-priority URL source when available.
  - [x] Return only citations with a valid positive citation number and at least one usable display field.
  - [x] Resolve duplicate lecture citation numbers deterministically by keeping the first structurally valid reference.
  - [x] Ensure the normalized lecture result contains only the reduced cited citation set rather than the full raw backend reference payload.
  - [x] Preserve the current generic normalizer path for every non-lecture target.

- [x] Thread target context through the server chat path (AC: 1, 6, 7)
  - [x] Update `lib/chat/server.ts` so `requestNormalizedChatResult(...)` can pass the completed target key into normalization when the target is known.
  - [x] Update `lib/chat/stream.ts` so the fan-out path calls the target-aware normalization entry point while preserving current event names and payload shape.
  - [x] Keep `app/api/chat/stream/route.ts` thin by leaving parsing decisions in `lib/chat/`.
  - [x] Leave the browser notebook-id-free and keep lecture parsing off the client.

- [x] Preserve shared contract and persistence compatibility with the reduced cited-only result (AC: 2, 3, 4, 6)
  - [x] Keep `lib/chat/shared.ts` on the existing `Citation` contract: `number`, `url`, `text`.
  - [x] Do not widen message persistence or transcript models for lecture-only metadata.
  - [x] Ensure lecture `text` now represents content-only text rather than the raw lecture blob.
  - [x] Ensure only the reduced normalized cited citation set survives into browser state and persisted session data for lecture answers.

- [ ] Add focused automated regression coverage for normalization entry points (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] Extend `tests/chat/normalize.test.ts` with a positive lecture-target case using sample-like `cited_text`.
  - [x] Add a large-response case proving uncited lecture references are removed before the normalized result is returned.
  - [x] Add fallback cases for missing `Content:` and missing `URL:`.
  - [x] Add a duplicate-`citation_number` case that proves first-valid-reference wins deterministically.
  - [x] Add a non-lecture regression case proving the lecture parser does not run for other targets.
  - [x] Extend `tests/chat/server.test.ts` and/or `tests/chat/stream-route.test.ts` only as needed for the new target-aware normalization signature.
  - [ ] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story depends on Story 1.2 because the normalized chat contract already lives at the server boundary there.
- This story also depends on Story 1.7 because target-aware streaming already exists and is the correct seam for passing `targetKey`.
- Story 1.12 should follow this story so the modal/UI work consumes already-clean lecture citations instead of compensating for raw blobs.
- Treat cited-number pruning as part of the contract in this story, not as an optional later optimization.

### Current Branch Intelligence

- `lib/chat/normalize.ts` currently normalizes citations generically by reading `citation_number`, keeping raw `cited_text` as `citation.text`, and mapping URLs from explicit fields, appendix URLs, or YouTube URLs found in text.
- `lib/chat/shared.ts` currently linkifies inline ranges for the browser through `formatAssistantAnswer(...)`, but the range-expansion helper is private today and cannot yet be reused directly by server normalization.
- `lib/chat/server.ts` currently calls `normalizeDownstreamChatResponse(...)` without any target context and `requestNormalizedChatResult(...)` accepts only `(question, notebookId)`.
- `lib/chat/stream.ts` currently calls `requestNormalizedChatResult(question, target.notebookId)` and emits `target.completed` using the target metadata it already has in hand.
- `lib/chat/targets.ts` already contains the approved four-target registry, including `ISKCON Bangalore Lectures`, but does not export a dedicated constant for reuse elsewhere.
- Browser state and persistence already depend on normalized `citations`; keeping the lecture result cited-only at this boundary is sufficient to keep uncited lecture blobs out of transcript state without a schema change.

### Architecture Compliance

- Keep raw backend payload shaping at the server boundary in `lib/chat/normalize.ts`; do not parse lecture citation blobs in JSX, persistence helpers, or modal components.
- Keep route files thin. Target resolution stays in `app/api/chat/stream/route.ts`, while normalization rules stay in `lib/chat/`.
- Keep the browser contract stable by reusing the existing `Citation` shape rather than adding lecture-specific fields.
- Depend on `citation_number`, not `references` array order, when building lecture citations.
- Derive the cited-number set from the answer before lecture reference normalization so uncited lecture references never reach the browser contract.
- Preserve current non-lecture behavior unless a future spec explicitly broadens target-aware parsing.

### File Structure Requirements

- `lib/chat/targets.ts`: export the lecture target key/helper
- `lib/chat/normalize.ts`: target-aware lecture parser, cited-number extraction, pruning, and duplicate handling
- `lib/chat/server.ts`: target-aware normalization entry point
- `lib/chat/stream.ts`: pass target context through the stream path
- `lib/chat/shared.ts`: keep the `Citation` contract stable and expose shared range-expansion logic only if needed to prevent parser drift
- `tests/chat/normalize.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/stream-route.test.ts`

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Trigger a response from `ISKCON Bangalore Lectures` and confirm normalized citations map by `citation_number`, not appendix order.
  - Trigger a lecture response with many more returned references than cited numbers and confirm only cited lecture references survive in the normalized result and persisted assistant state.
  - Confirm a lecture reference with both `URL:` and `Content:` surfaces only the clean URL and content excerpt downstream.
  - Confirm a lecture reference missing one marker still yields the usable field instead of failing the whole answer.
  - Confirm duplicate lecture `citation_number` entries resolve deterministically to one modal target.
  - Confirm a non-lecture target still returns its current citation behavior unchanged.

### References

- `_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md`
- `_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/1-2-chat-api-contract-normalization.md`
- `_bmad-output/implementation-artifacts/1-7-multi-notebook-chat-stream-route.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/planning-artifacts/data-model.md`
- `_bmad-output/project-context.md`
- `lib/chat/normalize.ts`
- `lib/chat/server.ts`
- `lib/chat/stream.ts`
- `lib/chat/targets.ts`
- `lib/chat/shared.ts`
- `tests/chat/normalize.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/stream-route.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `2026-04-10 23:15:35 IST` - `npm test -- --run tests/chat/normalize.test.ts tests/chat/server.test.ts tests/chat/stream-route.test.ts tests/chat/shared.test.ts` ✅
- `2026-04-10 23:19:16 IST` - `npm test` ✅
- `2026-04-10 23:28:11 IST` - `npm run lint` ✅
- `2026-04-10 23:28:11 IST` - `npm run build` ❌ `Build failed because of webpack errors` with no emitted module-level diagnostic from Next.js

### Completion Notes List

- Added shared lecture-target identity in `lib/chat/target-keys.ts` and reused it from the target registry and lecture-aware normalizer.
- Added target-aware normalization context, cited-number pruning, lecture `URL:` / `Content:` extraction, duplicate first-wins behavior, and non-lecture fallback preservation in `lib/chat/normalize.ts`.
- Threaded `targetKey` through `lib/chat/server.ts` and `lib/chat/stream.ts` so streamed targets normalize with server-owned target context.
- Exposed shared citation-range expansion through `lib/chat/shared.ts` and `lib/chat/citation-ranges.ts` so server cited-number extraction stays aligned with browser linkification.
- Added regression coverage in `tests/chat/normalize.test.ts`, `tests/chat/server.test.ts`, and `tests/chat/stream-route.test.ts`.
- `npm test` and `npm run lint` passed. `npm run build` remains unresolved because Next.js only reports a generic webpack failure on this branch.

### File List

- `lib/chat/target-keys.ts`
- `lib/chat/targets.ts`
- `lib/chat/citation-ranges.ts`
- `lib/chat/shared.ts`
- `lib/chat/normalize.ts`
- `lib/chat/server.ts`
- `lib/chat/stream.ts`
- `tests/chat/normalize.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/stream-route.test.ts`
