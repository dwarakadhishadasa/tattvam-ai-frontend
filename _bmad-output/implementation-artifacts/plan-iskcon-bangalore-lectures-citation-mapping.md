---
title: 'Implementation Plan: ISKCON Bangalore Lectures Citation Mapping and Modal Presentation'
type: 'implementation-plan'
created: '2026-04-10'
status: 'proposed'
context:
  - '_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md'
  - '_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md'
  - '_bmad-output/implementation-artifacts/1-7-multi-notebook-chat-stream-route.md'
---

## Goal

Normalize `ISKCON Bangalore Lectures` citations into a reduced cited-only URL/content set keyed by citation number and present them in the citation modal as `URL:` followed by `Content:`, without changing non-lecture citation contracts.

## Target Workflow

1. The browser submits one extraction prompt and receives target-specific streamed results as it does today.
2. The server knows which target completed and passes that target key into chat normalization.
3. For `ISKCON Bangalore Lectures`, normalization extracts the concrete cited-number set from the answer body.
4. The server drops uncited `references` entries before lecture citation normalization.
5. The kept lecture references are parsed into `citation_number` plus clean `url` and `text`.
6. The browser keeps using the existing answer-formatting helper to expand inline range citations into per-number anchors.
7. Clicking a lecture citation opens the modal, which renders `URL:` first, `Content:` second, and preserves current open/embed/save affordances.

## Scope

### In Scope

- Target-aware server normalization for `ISKCON Bangalore Lectures`
- Cited-number extraction from the answer body
- Server-side pruning of uncited lecture references
- Parsing `URL:` and `Content:` out of lecture `cited_text`
- Deterministic citation-number mapping and duplicate handling
- Citation modal ordering update
- Regression coverage for lecture-target parsing and non-lecture non-regression

### Out of Scope

- Backend wrapper payload changes
- A new browser citation model or persistence schema
- JSX-side parsing of lecture citation blobs
- Changes to target registry composition beyond exporting the approved lecture key safely
- Combined answer synthesis or transcript restructuring

## Implementation Changes

### 1. Centralize the Target Key

Update [targets.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/targets.ts):

- Export a stable constant or helper for `ISKCON Bangalore Lectures`
- Reuse that constant in normalization so the parser does not depend on duplicated string literals

This reduces drift risk between registry validation and target-specific normalization.

### 2. Extend the Server Normalization Boundary

Update [normalize.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/normalize.ts):

- Add optional normalization context such as `{ targetKey }`
- Reuse or expose the existing answer-range expansion logic to derive the concrete cited-number set from `answerBody`
- Filter lecture `references` to only entries whose `citation_number` appears in that cited-number set
- Introduce a dedicated lecture-reference parser that extracts:
  - `url` from `URL:`
  - `text` from `Content:`
- Keep explicit URL fields (`url`, `source_url`, `timestamped_url`, `link`) as the highest-priority URL source when available
- Build one deterministic citation entry per `citation_number`
- Fall back to the current generic extraction path if the lecture markers are partially missing
- Keep the generic normalization logic unchanged for all other targets

This keeps raw backend payload shaping in the approved server-owned layer instead of pushing target quirks into the UI.

It also makes response-size reduction explicit: the normalized result should contain only the citations the user can actually click from the answer.

### 3. Pass Target Context Through the Streamed Chat Path

Update [server.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/server.ts) and [stream.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/stream.ts):

- Change the target-aware request path so normalization receives the target key
- Preserve current per-target streaming behavior and error handling
- Keep the route thin by leaving parsing decisions in `lib/chat/normalize.ts`

The current single-target JSON route can remain behaviorally unchanged unless a small shared-signature refactor is needed.

### 4. Keep the Browser Citation Contract Stable

Retain the current `Citation` shape in [shared.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/shared.ts):

- `number`
- `url`
- `text`

Implementation rule:

- For lecture citations, `text` now means content-only text rather than the raw backend blob

This avoids persistence churn and keeps `MessageMarkdown`, message storage, and citation selection unchanged.

Persistence rule:

- Only the reduced normalized cited citation set should survive into browser state and persisted session data for lecture answers

### 5. Update Modal Presentation Order

Update [PipelineModals.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineModals.tsx):

- Render a labeled `URL:` section before the body content
- Render a labeled `Content:` section using `citation.text`
- Preserve the existing YouTube preview/open-link affordances derived from `citation.url`
- Keep the save action using normalized content so notebook snippets stay clean

No new UI primitive is needed for this change.

### 6. Verify Range-Citation Resolution, Not Just Parsing

Update [shared.test.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/tests/chat/shared.test.ts):

- Add explicit coverage for a range such as `[2, 7-10]`
- Confirm the helper still produces individually clickable citation anchors per number

This documents the user-facing resolution contract even if the helper implementation itself does not need to change.

### 7. Add Focused Regression Tests

Update [normalize.test.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/tests/chat/normalize.test.ts) and related entry-point tests:

- Positive lecture-target case using sample-like `cited_text`
- Large-response case proving uncited references are removed before the normalized result is returned
- Fallback behavior when `Content:` is missing
- Fallback behavior when `URL:` is missing
- Non-lecture regression case proving the parser does not run for other targets
- Any server or stream test updates required by the new normalization context signature

## Suggested Delivery Order

1. Export the approved lecture target key from `lib/chat/targets.ts`.
2. Extend `lib/chat/normalize.ts` with optional target context, cited-number extraction, and lecture-reference pruning.
3. Add the lecture parser on top of the pruned reference set.
4. Thread target context through the streamed request path in `lib/chat/server.ts` and `lib/chat/stream.ts`.
5. Update `components/pipeline/PipelineModals.tsx` to render `URL:` before `Content:`.
6. Add or update tests for lecture parsing, cited-only pruning, range resolution, and non-lecture regression.
7. Run lint, tests, and build verification.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Use a prompt that returns lecture-target citations with range references such as `[2, 7-10]` and confirm each resolved citation opens independently.
2. Use a prompt whose backend lecture response contains many more references than cited numbers and confirm uncited references do not reach the normalized client contract or persisted transcript state.
3. Click a lecture citation and confirm the modal shows `URL:` first, `Content:` second, and still offers the current link/embed affordances.
4. Confirm lecture citations no longer display `Themes`, `Audience`, or `Content-type`.
5. Confirm at least one non-lecture target still opens citations without a regression.
6. Save a lecture citation and confirm the stored snippet contains the cleaned content, not the raw metadata blob.

## Risks

- If the target key string is duplicated instead of centralized, the lecture parser can silently fail to activate.
- If cited-number extraction misses a valid answer citation pattern, the pruning step could remove a reference that should have remained available.
- If normalization falls back too aggressively, malformed lecture references may reintroduce noisy metadata into the modal.
- If modal changes are implemented too generically, non-lecture citation presentation could regress unintentionally.
- If range-citation coverage is skipped, a correct server parser could still leave a broken click path for `[2, 7-10]`-style answers.
