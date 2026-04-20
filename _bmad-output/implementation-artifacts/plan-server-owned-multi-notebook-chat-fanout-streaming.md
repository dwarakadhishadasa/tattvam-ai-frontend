---
title: 'Implementation Plan: Server-Owned Multi-Notebook Chat Fan-Out with Streaming Responses'
type: 'implementation-plan'
created: '2026-03-29'
status: 'done'
context:
  - '_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md'
---

## Goal

Let one extraction prompt trigger four fixed server-owned notebook chat requests concurrently and render one labeled assistant response per target as each target completes, without adding a combined summary layer.

## Target Workflow

1. The browser submits `POST /api/chat/stream` with `{ question }`.
2. The route validates the question and resolves the approved four extraction chat targets from server-side configuration.
3. Shared endpoint builders derive one `/v1/notebooks/{id}/chat/ask` URL per target.
4. The server starts all four downstream notebook chat requests concurrently.
5. The route streams `target.completed`, `target.failed`, and final `chat.completed` events.
6. The client shows one user message, keeps the current three-dot loader visible while any target is still pending, and appends labeled assistant messages as results arrive.

## Scope

### In Scope

- Server-owned fixed four-target chat registry parsing and validation
- Generic notebook chat URL building for arbitrary notebook ids
- A new streaming extraction chat route
- Per-target pending, success, and error transcript states
- Partial-success handling across notebook targets
- Minimal message-model expansion for target metadata and status
- Backward-compatible browser-persistence handling for new message fields

### Out of Scope

- Combined or synthesized summary answers
- Client-passed raw notebook ids
- Browser-owned target registry logic
- Variable target counts beyond the approved four-notebook set for this phase
- Dynamic target selection driven directly from browser persistence
- Token-level downstream streaming relay
- Replacing the existing JSON `/api/chat` route in the same change

## Implementation Changes

### 1. Shared Target Resolution

Add a target-registry module such as [targets.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/targets.ts):

Approved phase-1 target set:

```json
[
  {
    "key": "ISKCON Bangalore Lectures",
    "label": "From Senior devotees lectures",
    "notebookId": "da406743-a373-47f9-9275-6c2e1e86c2b6"
  },
  {
    "key": "Bhaktivedanta NotebookLM",
    "label": "From Srila Prabhupad's books",
    "notebookId": "09d526e1-8762-4a1b-897c-d4cafccafa53"
  },
  {
    "key": "Srila Prabhupada Letters & Correspondence",
    "label": "From Srila Prabhupad's letters and correspondence",
    "notebookId": "c93d81ab-2e8a-49ed-b6c2-99248603d8b5"
  },
  {
    "key": "Srila Prabhupada Audio Transcripts",
    "label": "From Srila Prabhupad's audio transcripts",
    "notebookId": "9234d4c1-c121-47ae-938f-721aa4c5b907"
  }
]
```

- Parse `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON`
- Validate exactly four entries, unique keys, and non-blank labels/notebook ids
- Treat this fixed four-target set as the only supported extraction target registry for this phase
- Throw a dedicated configuration error when the registry is malformed

This keeps the browser free of notebook ids and keeps target policy in one server-owned place.

### 2. Generic Chat Endpoint Building

Update [endpoints.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/backend/endpoints.ts):

- Add `getNotebookChatUrl(notebookId: string)`
- Reuse existing origin normalization and path encoding rules
- Continue failing fast on blank notebook ids and malformed origins

This is the architectural hinge point that makes multi-target fan-out possible without copying path logic into chat orchestration code.

### 3. Streaming Route Orchestration

Add [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/chat/stream/route.ts) plus supporting helpers under `lib/chat/`:

- Validate `{ question }` at the route boundary
- Resolve target registry before writing any stream bytes
- Start downstream fetches concurrently, ideally with `Promise.allSettled` plus per-target event emission
- Normalize each backend response independently using existing chat normalization utilities
- Emit target-scoped success or error events instead of collapsing the result set into one payload
- Emit a final completion event so the client can exit the global loading state cleanly

The route should stay thin. Fan-out orchestration and event formatting belong in `lib/chat/`, not in the route file itself.

### 4. Client Stream Consumption

Update [client.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/client.ts):

- Add a helper to `fetch("/api/chat/stream")`
- Read `response.body` incrementally
- Parse named streaming events
- Surface typed callbacks or an async iterator for `target.completed`, `target.failed`, and `chat.completed`

This allows the UI to move from one-shot JSON handling to a controlled stream contract without teaching UI components about low-level parser details.

### 5. Transcript Model and UI Reconciliation

Update [types.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/types.ts), [PipelinePageClient.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelinePageClient.tsx), and [PipelineSteps.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineSteps.tsx):

- Keep one user message append per prompt
- Keep the existing three-dot waiting UI active while the stream remains unresolved
- Append target-labeled assistant messages only when `target.completed` or `target.failed` arrives
- Render a visible target label for each assistant message
- Keep citations and save-response actions enabled only for successful assistant messages
- Distinguish completed and error assistant states visually without inventing a summary row

### 6. Persistence Compatibility

Update [schema.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/persistence/schema.ts) and related persistence tests:

- Accept optional `targetKey`, `targetLabel`, and `status` fields on messages
- Preserve backward compatibility with already-saved messages that do not carry those fields
- Ensure restored target-labeled success and error assistant messages remain renderable after refresh

### 7. Runtime Documentation Alignment

Update planning/runtime documents during implementation:

- [runtime-interfaces.md](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/_bmad-output/planning-artifacts/runtime-interfaces.md) to document the new streaming route and event contract
- [data-model.md](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/_bmad-output/planning-artifacts/data-model.md) to describe per-target assistant metadata
- [.env.example](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/.env.example) and [README.md](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/README.md) to document the fixed four-target registry for this phase

### UI Reuse Impact

No new `components/ui` primitives should be necessary. This can be delivered through targeted changes to the existing transcript and message-state rendering in the extraction workflow.

## Suggested Delivery Order

1. Add generic notebook chat URL building in `lib/backend/endpoints.ts`.
2. Add target-registry parsing and validation in `lib/chat/targets.ts` for the approved four-target set.
3. Define the stream event protocol and build a reusable server-side event writer helper.
4. Implement `app/api/chat/stream/route.ts` with target fan-out and final completion signaling.
5. Add the client stream-consumption helper.
6. Extend message types and transcript reconciliation in the extraction UI while reusing the current three-dot waiting UI.
7. Update browser-persistence schema and restore logic for optional target metadata.
8. Add automated tests for target parsing, stream sequencing, partial failures, and persistence compatibility.
9. Update docs and env examples.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Configure the approved four notebook targets and confirm one user prompt can yield up to four separately labeled assistant messages.
2. Artificially slow one or more notebook targets and confirm earlier results render while slower notebooks remain pending.
3. Confirm the current three-dot waiting UI remains visible while at least one target is still pending.
4. Make one notebook target unreachable and confirm successful targets still render while the failed target shows a labeled error message.
5. Refresh after a four-target exchange and confirm restored messages keep their target labels and statuses.
6. Confirm the UI never appends a combined summary message after the stream finishes.

## Risks

- If the route and client disagree on the event protocol, the transcript can stall in a pending state even when backend requests finish correctly.
- If target registry validation is weak, the stream may partially start and then fail too late with ambiguous errors.
- If message reconciliation uses array position instead of stable target keys, out-of-order completion will corrupt the transcript.
- If persistence changes are not backward compatible, existing saved sessions may fail to restore or silently drop assistant metadata.
- If the team tries to add summary generation in the same story, the event model and transcript UI will become harder to reason about.
