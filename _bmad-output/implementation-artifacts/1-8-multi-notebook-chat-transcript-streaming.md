# Story 1.8: Target-Labeled Multi-Notebook Chat Transcript Streaming

Status: done

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/plan-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/1-7-multi-notebook-chat-stream-route.md`
- `_bmad-output/project-context.md`

## Story

As a presenter using Extraction chat,
I want the client to consume streamed target events and render one labeled assistant message per target,
so that I can compare notebook-specific answers as they arrive while preserving the current waiting affordance and session restore behavior.

## Acceptance Criteria

1. Given the user submits one Extraction question, when the client starts `/api/chat/stream`, then it appends one user message immediately and keeps the current three-dot waiting UI visible while any target is still pending.
2. Given a `target.completed` event arrives, when the transcript updates, then the app appends one assistant message with `targetKey`, `targetLabel`, and `status: "complete"` plus the formatted answer body and citations for that target.
3. Given a `target.failed` event arrives, when the transcript updates, then the app appends one assistant error message with the target label and `status: "error"` and does not expose citation review or save-response actions for that failed target.
4. Given target events complete out of order, when the transcript renders, then the message list preserves natural arrival order while using stable target metadata rather than array position for reconciliation.
5. Given older persisted sessions contain messages without target metadata, when those sessions restore, then they still render cleanly and new multi-target assistant messages persist and reload correctly.
6. Given this story is implemented, when Extraction chat completes, then the app does not append a synthesized summary row beyond the target-specific assistant messages.

## Tasks / Subtasks

- [x] Add a typed stream consumer for `/api/chat/stream` (AC: 1, 2, 3, 4)
  - [x] Extend `lib/chat/client.ts` with a helper that posts `{ question }` to `/api/chat/stream`.
  - [x] Read `response.body` incrementally and parse the named event protocol defined by Story 1.7.
  - [x] Expose typed callbacks or an async iterator for `target.completed`, `target.failed`, and `chat.completed`.
  - [x] Keep low-level stream parsing out of `PipelinePageClient.tsx`.

- [x] Extend the transcript message model for per-target assistant metadata (AC: 2, 3, 4, 5)
  - [x] Update `components/pipeline/types.ts` so `Message` can carry optional `targetKey`, `targetLabel`, and `status` fields.
  - [x] Keep the new fields optional so previously persisted messages remain valid.
  - [x] Preserve current message ids, roles, and citation handling for non-streaming messages.

- [x] Replace one-shot Extraction chat handling with stream-driven reconciliation (AC: 1, 2, 3, 4, 6)
  - [x] Update `components/pipeline/PipelinePageClient.tsx` so `handleSendMessage()` appends one user message, starts the stream, and reconciles streamed target events.
  - [x] Keep the three-dot waiting UI separate from transcript messages instead of creating placeholder assistant rows.
  - [x] Preserve the current demo-response fast path only if it can coexist cleanly with the new stream contract; otherwise retire it deliberately in the change.
  - [x] Stop treating a single assistant response as the only successful Extraction outcome.

- [x] Render target labels and assistant error states in Extraction (AC: 2, 3, 4, 6)
  - [x] Update `components/pipeline/PipelineSteps.tsx` to show visible target labels on streamed assistant messages.
  - [x] Keep citation rendering and save-response actions enabled only for `status: "complete"` assistant messages.
  - [x] Render failed assistant messages distinctly from completed ones without introducing a combined summary row.
  - [x] Reuse the current three-dot waiting UI until the stream settles.

- [x] Preserve persistence and restore compatibility (AC: 5)
  - [x] Update `lib/persistence/schema.ts` so messages with optional target metadata validate and restore cleanly.
  - [x] Keep backward compatibility for sessions saved before target metadata existed.
  - [x] Update persistence regression coverage to include both legacy and target-labeled assistant messages.

- [x] Add focused automated coverage for stream consumption and compatibility (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add stream-consumer tests for named event parsing and stream completion handling.
  - [x] Extend `tests/persistence/browser-persistence.test.ts` for messages with optional `targetKey`, `targetLabel`, and `status`.
  - [x] Add or extend pipeline-facing tests only where a lightweight harness is practical; otherwise prefer pure helper coverage around parsing and schema compatibility.
  - [x] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Sequencing

- This story depends on Story 1.7 because the client must consume the stream contract and event names defined there.
- Do not merge this story ahead of Story 1.7 unless the event protocol is already stable and test-backed.
- This story can proceed independently of the PPTX work once the stream route exists.

### Current Branch Intelligence

- `components/pipeline/types.ts` currently defines `Message` as `{ id, role, content, citations? }` only.
- `components/pipeline/PipelinePageClient.tsx` currently calls `askChatQuestion()` and appends exactly one assistant message per user prompt.
- `components/pipeline/PipelineSteps.tsx` currently shows save-response affordances on every assistant message and has no notion of target labels or assistant error states.
- `lib/chat/client.ts` currently expects one JSON response from `/api/chat` and has no stream parser.
- `lib/persistence/schema.ts` currently validates messages without any target metadata and restores them unchanged.

### Architecture Compliance

- Keep stream parsing inside `lib/chat/client.ts`, not in JSX-heavy branches.
- Keep the browser notebook-id-free and same-origin-only; the stream contract is the only client-facing change.
- Use the existing three-dot loading affordance for pending state; do not create placeholder assistant rows for pending targets.
- Successful assistant messages remain the only messages that expose citations and save-response actions.
- Maintain backward-compatible persistence so older saved sessions remain readable without migration-specific UI.

### File Structure Requirements

- `lib/chat/client.ts`: stream consumer helper
- `components/pipeline/types.ts`: optional target metadata on `Message`
- `components/pipeline/PipelinePageClient.tsx`: stream-driven Extraction chat orchestration
- `components/pipeline/PipelineSteps.tsx`: target labels and assistant error/completion rendering
- `lib/persistence/schema.ts`: backward-compatible message validation
- `tests/persistence/browser-persistence.test.ts`
- `tests/chat/client.stream.test.ts` or equivalent stream-parser coverage

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Submit one Extraction question and confirm only one user message appears while target-labeled assistant messages append incrementally.
  - Force one target to fail and confirm its error bubble renders without removing successful target answers.
  - Confirm the three-dot waiting UI remains visible until the final `chat.completed` event.
  - Save and reload a session containing target-labeled assistant messages and confirm labels and statuses restore.
  - Load an older session with pre-stream assistant messages and confirm it still renders without migration errors.
  - Confirm no combined summary message is appended after the target messages complete.

### References

- `_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/plan-server-owned-multi-notebook-chat-fanout-streaming.md`
- `_bmad-output/implementation-artifacts/1-7-multi-notebook-chat-stream-route.md`
- `_bmad-output/project-context.md`
- `components/pipeline/types.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `lib/chat/client.ts`
- `lib/chat/shared.ts`
- `lib/chat/normalize.ts`
- `lib/persistence/schema.ts`
- `tests/persistence/browser-persistence.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test -- tests/chat/client.stream.test.ts tests/persistence/browser-persistence.test.ts tests/chat/stream-route.test.ts tests/chat/targets.test.ts tests/chat/server.test.ts tests/chat/route.test.ts tests/backend/endpoints.test.ts`
- `npm test`
- `npm run lint`
- `npm run build`

### Completion Notes List

- Added typed stream parsing and incremental event dispatch in `lib/chat/client.ts` so the UI consumes `target.completed`, `target.failed`, and `chat.completed` without owning SSE parsing details.
- Extended transcript messages with optional `targetKey`, `targetLabel`, and `status`, then switched `PipelinePageClient.tsx` to append one user prompt and one assistant result per target as events arrive.
- Updated `PipelineSteps.tsx` to render visible target labels, keep the existing three-dot loader as the only pending affordance, and suppress citation/save actions for failed assistant messages.
- Preserved restore compatibility in `lib/persistence/schema.ts` and added stream-parser plus persistence regression coverage.

### File List

- `components/pipeline/types.ts`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `lib/chat/client.ts`
- `lib/persistence/schema.ts`
- `tests/chat/client.stream.test.ts`
- `tests/persistence/browser-persistence.test.ts`
