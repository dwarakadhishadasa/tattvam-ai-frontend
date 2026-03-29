---
title: 'Server-Owned Multi-Notebook Chat Fan-Out with Streaming Responses'
type: 'feature'
created: '2026-03-29'
status: 'proposed'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md'
  - '_bmad-output/implementation-artifacts/1-6-backend-endpoint-centralization-dynamic-notebook-targeting.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Extraction chat currently targets one notebook per request and returns one assistant response only after the full backend round-trip finishes. That limits how much material the user can gather from a single query and makes it harder to study the same question from multiple notebook perspectives, compare different angles, and save the most useful material for notebook compilation and later presentation steps.

**Approach:** Add a same-origin streaming chat route that accepts one `{ question }`, resolves a fixed server-owned registry of four approved extraction chat targets, fans out concurrent `POST /v1/notebooks/{id}/chat/ask` calls, and streams per-target lifecycle events back to the client. The client keeps one user prompt in the transcript and renders one labeled assistant message per notebook target as each result arrives. This story does **not** add a combined summary or synthesis layer.

## Boundaries & Constraints

**Always:** Keep the browser notebook-id-free; keep target selection server-owned; use the approved four-notebook target registry for this phase; preserve same-origin browser calls; build notebook chat URLs through the shared endpoint module under `lib/`; keep each target response visibly attributable to its notebook target; stream partial completion so faster targets render before slower ones; allow partial success when some targets fail; preserve citation parsing and save-response behavior per successful assistant message.

**Ask First:** Changing the fixed target count beyond these four notebooks; making extraction chat targets user-configurable at runtime; using browser persistence as the source of truth for target selection; relaying token-level backend streaming if the upstream notebook service does not already expose a stable streaming contract.

**Never:** Let the browser choose raw notebook ids; replace the existing JSON `/api/chat` route as part of this story; collapse multiple notebook answers into one unlabeled assistant message; wait for the slowest target before rendering any answer; fail the whole prompt because one target fails; require client code to concatenate backend notebook URLs; hide which target produced which answer; add synthesized-summary logic in this story.

## Proposed Target Registry Contract

### Phase 1 Environment Variable

Use a fixed four-target server-owned registry:

```env
TATTVAM_EXTRACTION_CHAT_TARGETS_JSON=[
  {"key":"ISKCON Bangalore Lectures","label":"From Senior devotees lectures","notebookId":"da406743-a373-47f9-9275-6c2e1e86c2b6"},
  {"key":"Bhaktivedanta NotebookLM","label":"From Srila Prabhupad's books","notebookId":"09d526e1-8762-4a1b-897c-d4cafccafa53"},
  {"key":"Srila Prabhupada Letters & Correspondence","label":"From Srila Prabhupad's letters and correspondence","notebookId":"c93d81ab-2e8a-49ed-b6c2-99248603d8b5"},
  {"key":"Srila Prabhupada Audio Transcripts","label":"From Srila Prabhupad's audio transcripts","notebookId":"9234d4c1-c121-47ae-938f-721aa4c5b907"}
]
```

Rules:

- For this phase, extraction chat uses exactly these four approved notebook targets.
- The value must parse to a four-item JSON array.
- Each target must provide trimmed non-blank `key`, `label`, and `notebookId`.
- `key` values must be unique and stable so the client can reconcile streamed updates.
- `label` is user-facing transcript text.
- `notebookId` stays server-owned and never travels from the browser.
- The four approved targets for this phase are:
  - `ISKCON Bangalore Lectures` -> `From Senior devotees lectures`
  - `Bhaktivedanta NotebookLM` -> `From Srila Prabhupad's books`
  - `Srila Prabhupada Letters & Correspondence` -> `From Srila Prabhupad's letters and correspondence`
  - `Srila Prabhupada Audio Transcripts` -> `From Srila Prabhupad's audio transcripts`

## Endpoint Builder Contract

The centralized endpoint module should expose a generic notebook chat URL builder in addition to the current default-target helper:

```ts
getNotebookChatUrl(notebookId: string)
```

Behavior rules:

- Reuse the normalized backend origin from `lib/backend/endpoints.ts`.
- Validate trimmed notebook ids before building target-specific chat URLs.
- Keep URL ownership in the shared endpoint module so fan-out orchestration cannot drift from other notebook flows.

## Local Route Contract

### `POST /api/chat/stream`

Input stays minimal:

```json
{ "question": "What are the main teachings on envy?" }
```

Rules:

- `question` remains required and trimmed server-side.
- The browser still does not send notebook ids.
- The server resolves the approved four extraction chat targets before any downstream fetch.
- The route exists alongside the current JSON `POST /api/chat` route and does not replace it.
- The route streams target-specific events as each target succeeds or fails.
- The route returns a clear configuration error before streaming begins if the target registry or backend configuration is invalid.

### Streaming Event Shape

Use a fetch-consumable event stream with named events. The first implementation may use `text/event-stream` over a normal `fetch` POST so the browser can send a request body and still receive incremental results.

Event examples:

```text
event: target.completed
data: {
  "target":{"key":"Bhaktivedanta NotebookLM","label":"From Srila Prabhupad's books"},
  "result":{
    "answerBody":"Markdown-capable answer",
    "citations":[{"number":1,"text":"Excerpt text","url":"https://youtu.be/example?t=49"}],
    "conversationId":"abc",
    "turnNumber":1,
    "isFollowUp":false
  }
}

event: target.failed
data: {"target":{"key":"Srila Prabhupada Audio Transcripts","label":"From Srila Prabhupad's audio transcripts"},"error":"Notebook target unavailable"}

event: chat.completed
data: {"totalTargets":4,"completedTargets":3,"failedTargets":1}
```

Notes:

- This story streams target-level completion, not token-level answer chunks.
- Event ordering between targets is intentionally non-deterministic.
- `chat.completed` is emitted once all targets have settled.

## Transcript Rendering Strategy

For one user prompt:

1. Append one user message immediately.
2. Show the current three-dot assistant waiting UI immediately.
3. When a target completes, append one labeled assistant message for that target only.
4. If a target fails, append one labeled assistant error message for that target.
5. Keep the three-dot waiting UI visible while any target is still pending.
6. Remove the three-dot waiting UI only after all targets have settled.
7. Do not produce a combined answer message in this story.

## Message Metadata Strategy

The client message model should grow minimally so transcript entries can carry per-target state without breaking older persisted sessions.

Suggested additional assistant-only metadata:

```ts
targetKey?: string
targetLabel?: string
status?: "complete" | "error"
```

Rules:

- Existing persisted messages without this metadata must still load cleanly.
- Pending state is represented by the existing three-dot chat loader, not by placeholder assistant messages.
- Only successful assistant messages should expose citation review and save-response actions.
- Error messages should remain visibly distinct from completed assistant messages.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Four valid targets with mixed latencies | Browser sends `{ question }`; the four notebook targets settle at different times | One user message appears immediately; assistant messages append as each notebook completes; final completion event closes loading state | None needed |
| One target fails, three succeed | One downstream fetch fails or returns unusable payload | Successful targets still render their answers; failed target renders a labeled error bubble; overall prompt completes | Partial failure is surfaced per target and does not erase successful results |
| All four targets fail | Every target errors or returns malformed data | User sees one error bubble per target and the stream completes | Route should still emit `chat.completed`; client exits loading state cleanly |
| Blank question | Browser submits empty or whitespace-only question | Route rejects before streaming begins | `400` with clear validation error |
| Invalid registry config | JSON malformed, not exactly four targets, duplicate keys, or blank notebook ids | Route returns a clear configuration error before any downstream fetch | `500` misconfiguration response, no partial stream |
| Out-of-order target completion | Slower/faster targets settle unpredictably | Transcript ordering stays stable per target message id while completion order remains natural | Client reconciles by `targetKey` rather than array order |

</frozen-after-approval>

## Code Map

- `lib/backend/endpoints.ts` -- add generic notebook chat URL building for arbitrary server-owned target notebook ids
- `lib/chat/targets.ts` -- parse, validate, and expose the fixed four-notebook extraction chat target registry
- `lib/chat/server.ts` -- support target-specific forwarding instead of one hardcoded default target only
- `app/api/chat/stream/route.ts` -- validate `{ question }`, resolve targets, orchestrate fan-out, and stream target events
- `lib/chat/client.ts` -- add a stream consumer helper that parses target events from the route response
- `components/pipeline/PipelinePageClient.tsx` -- create one user message, keep the existing three-dot loader visible while any target is pending, and append target-labeled assistant messages as streamed events arrive
- `components/pipeline/PipelineSteps.tsx` -- render target labels and distinct completed/error assistant states while reusing the current three-dot waiting UI
- `components/pipeline/types.ts` -- extend the message type with optional target metadata and status
- `lib/persistence/schema.ts` -- accept optional message metadata so restored sessions remain backward compatible
- `tests/chat/route.test.ts` and new stream-route tests -- cover multi-target event sequencing and config failures
- `tests/chat/server.test.ts` and new target-registry tests -- cover generic forwarding and target parsing rules
- `tests/persistence/browser-persistence.test.ts` -- verify old and new message shapes both restore cleanly

## Tasks & Acceptance

**Execution:**
- [ ] Add a server-owned chat-target registry module that validates `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` as the fixed four-notebook target set for this phase.
- [ ] Extend the centralized endpoint module with a generic notebook chat URL builder for arbitrary notebook ids.
- [ ] Add a new streaming route for extraction chat fan-out without changing the browser request body shape.
- [ ] Stream target completion and failure events so the client can append labeled assistant results incrementally.
- [ ] Extend the transcript message model with optional target metadata and per-target completion/error status fields.
- [ ] Preserve citation parsing, save-response behavior, and same-origin browser calls for each successful assistant response.
- [ ] Reuse the current three-dot waiting UI while any notebook target is still pending.
- [ ] Keep combined summary generation explicitly out of scope.
- [ ] Add automated coverage for target parsing, streaming orchestration, partial failures, and persistence compatibility.

**Acceptance Criteria:**
- Given the approved four configured extraction chat targets, when the browser submits one `{ question }`, then the server fans out to all four target notebook chat endpoints concurrently without the browser sending notebook ids.
- Given targets complete at different times, when the stream is consumed by the client, then assistant messages render incrementally per target instead of waiting for the slowest target.
- Given one target fails while another succeeds, when the transcript updates, then the successful answer remains visible and the failed target shows a labeled error state without collapsing the whole prompt.
- Given at least one notebook target is still pending, when the user watches the transcript, then the current three-dot chat waiting UI remains visible until all target requests settle.
- Given the target registry configuration is malformed, incomplete, or does not match the approved four-target set, when `/api/chat/stream` is called, then the route returns a clear configuration error before any downstream fetch begins.
- Given persisted sessions contain older assistant messages without target metadata, when the session is restored, then the transcript remains readable and new multi-target messages still render correctly.
- Given this story is implemented, when the user chats, then no combined synthesized summary message is appended in the transcript.

## Spec Change Log

- Introduce a server-owned fixed four-notebook target registry for extraction chat.
- Add a streaming fan-out route so one prompt can yield multiple labeled assistant messages.
- Explicitly defer combined summary generation.

## Design Notes

The highest-leverage architectural move here is to keep the browser unaware of notebook ids while still allowing one user action to activate four distinct notebook conversations. That gives us a better UX without loosening the current server-boundary discipline.

A separate streaming route is the safer first step than changing `/api/chat` outright. It lets the UI adopt the richer experience incrementally while preserving the current JSON route unchanged.

Target-level streaming is intentionally modest: we are not promising token streaming from the notebook backend. We are promising that the app will surface each notebook's completed answer as soon as that notebook finishes. That is the best UX available without assuming more from the upstream backend contract than we know today.

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Configure the approved four notebook targets and confirm one user prompt can yield up to four labeled assistant messages
- Force one notebook target to fail and confirm the remaining targets still render successfully under the same user prompt
- Confirm the current three-dot waiting UI remains visible while at least one notebook target is still pending and disappears only after all targets finish
- Reload a session containing multi-target assistant messages and confirm target labels and statuses restore without breaking older sessions
- Confirm no combined summary message is rendered after all targets complete
