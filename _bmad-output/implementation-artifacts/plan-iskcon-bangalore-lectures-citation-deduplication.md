---
title: 'Implementation Plan: ISKCON Bangalore Lectures Citation Deduplication by Cited Text'
type: 'implementation-plan'
created: '2026-04-20'
status: 'proposed'
context:
  - '_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md'
  - '_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-mapping.md'
  - '_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md'
  - '_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md'
  - '_bmad-output/project-context.md'
---

## Goal

Deduplicate `ISKCON Bangalore Lectures` citations that repeat the same `cited_text` under different `citation_number` values, and rewrite the answer so duplicate citation numbers are replaced with the first occurrence before the browser renders the response.

## Problem Summary

The current lecture-specific normalizer in `lib/chat/normalize.ts` already:

- prunes uncited lecture references
- parses `URL:` and `Content:` out of lecture `cited_text`
- keeps one citation per `citation_number`

It does not yet deduplicate identical lecture references that appear under multiple citation numbers. In the supplied sample, the same `cited_text` appears repeatedly under citation numbers such as `1`, `5`, `10`, and `15`.

That creates one core architectural requirement:

1. The canonical citation numbers must be decided before the browser formats answer text, so the rendered answer and the deduplicated `citations` array stay aligned without any client-side alias resolution.

## Boundary Decisions

### 1. Keep Deduplication at the Server Normalization Boundary

Perform lecture citation deduplication inside `lib/chat/normalize.ts`, after answer-body citation extraction and lecture reference parsing. Do not push raw lecture deduplication into `PipelinePageClient`, `MessageMarkdown`, or modal JSX.

Rationale:

- The duplicate data originates in raw backend payloads.
- Project context explicitly requires unstable backend payload shaping to happen at the smallest server-owned boundary.
- Browser components should continue consuming normalized citation data, not raw reference blobs.

### 2. Scope the Change to the Lecture Target Only

Apply cited-text deduplication only when `targetKey` is the approved lecture extraction target. Keep the existing generic citation normalizer unchanged for all other targets.

Rationale:

- The duplicate-heavy payload shape is currently a known lecture-target behavior.
- Avoid broadening citation semantics for non-lecture targets without evidence and dedicated regression coverage.

### 3. Use Maps Keyed by `citation_number` and `cited_text`, Not an Index Array

Do not model the runtime contract as an array whose length equals `references.length`.

Use:

- an internal `Map<string, number>` from normalized `cited_text` to canonical citation number
- an internal `Map<number, number>` or record from original citation number to canonical citation number

Rationale:

- The answer cites citation numbers, not reference-array indexes.
- Citation numbers can be sparse, unsorted, pruned, and deduplicated.
- A references-length array becomes brittle once uncited references are removed or duplicates collapse.

### 4. Choose the Canonical Citation by First Encountered Reference Order

For duplicates that share the same normalized `cited_text`, the canonical citation should be the first structurally valid cited lecture reference encountered during normalization, matching the user’s requested “first occurrence” rule.

Rationale:

- This matches the intended map-based algorithm: store the first occurrence of each `cited_text` and map later duplicates back to it.
- It keeps the implementation simple and deterministic inside one pass over the filtered lecture references.
- It avoids introducing a second canonicalization rule that differs from the requested “first occurrence” behavior.

### 5. Rewrite the Answer Text at the Server Boundary

Rewrite `answerBody` from duplicate citation numbers to their first-occurrence canonical numbers before the browser receives the normalized result.

Rationale:

- This is the behavior you explicitly requested.
- Once the answer and the deduplicated `citations` array agree on the same canonical numbers, the browser click path stays simple.
- This avoids carrying duplicate-number resolution logic into `formatAssistantAnswer(...)` or `MessageMarkdown`.

### 6. Do Not Add Alias Metadata to the Browser Contract

Do not add alias metadata to `NormalizedChatResult`, `Message`, or persistence for this change.

Rationale:

- Once `answerBody` itself is rewritten to canonical numbers, the browser only needs the canonical `citations` array it already understands.
- This keeps the stream contract stable and avoids a schema migration for transient mapping metadata.
- Persistence remains simple because rendered content already reflects the rewritten canonical answer.

## Target Workflow

1. The browser receives a lecture-target result as it does today.
2. The server normalizer strips the appendix and derives the concrete cited-number set from the original `answerBody`.
3. The lecture normalizer filters to cited lecture references only.
4. Candidate lecture references are processed in first-encountered reference order.
5. Each candidate computes a dedupe key from normalized exact `cited_text`:
   - normalize line endings
   - trim leading and trailing whitespace
   - do not attempt fuzzy or semantic deduplication
6. If the dedupe key has not been seen, that candidate becomes the canonical citation for its number.
7. If the dedupe key has already been seen, the current citation number is mapped to the first-occurrence citation number.
8. After canonicalization is known, the server rewrites every bracketed citation group in `answerBody`:
   - expand mixed lists and ranges into concrete numbers
   - replace each number with its canonical first-occurrence number when a mapping exists
   - remove duplicates created by canonicalization
   - serialize the result back as a bracketed citation list
9. The normalized result returns:
   - the rewritten canonical `answerBody`
   - the deduplicated canonical `citations` array
10. `formatAssistantAnswer(...)` continues linkifying the rewritten canonical answer without any lecture-specific alias logic.
11. Persisted message `content` already reflects canonical citation numbers, so no additional mapping metadata is required for restore.

## Scope

### In Scope

- Lecture-target deduplication by exact normalized `cited_text`
- Canonical citation-number selection by first occurrence
- Server-owned answer rewriting so `[5]` becomes `[1]`
- Regression coverage for duplicate cited-text resolution and non-lecture non-regression

### Out of Scope

- Fuzzy or semantic citation deduplication
- Deduplication for non-lecture targets
- Widening the stored `Message` persistence model if rendered content remains the persisted source of truth
- JSX-side parsing of raw lecture references

## Implementation Changes

### 1. Keep the Normalized Result Contract Stable

Do not add new browser-facing fields for citation aliasing. Keep the existing `NormalizedChatResult` and `Citation` shapes unchanged.

### 2. Deduplicate Lecture Citations in `lib/chat/normalize.ts`

Extend the lecture-target path in `normalizeLectureCitations(...)`:

- Reuse the existing cited-number extraction from `answerBody`
- Continue discarding uncited lecture references before any browser-facing result is built
- Normalize lecture candidates as today using `citation_number`, parsed `url`, and parsed `content`
- Introduce an internal dedupe helper that:
  - derives a normalized exact-text key from `reference.cited_text`
  - processes candidates in first-encountered reference order
  - keeps the first structurally valid candidate for each dedupe key
  - records mappings from duplicate citation numbers to their first-occurrence citation numbers

Important implementation rule:

- Deduplication must happen after lecture parsing has confirmed the candidate is structurally usable
- Existing duplicate-number handling should remain deterministic and continue favoring the first valid candidate for that numeric citation id

### 3. Rewrite Citation Numbers in `answerBody`

Add a server-owned helper that rewrites bracketed citation groups after deduplication mapping is known.

Recommended behavior:

- expand each bracket token with the existing citation-range parser
- map each expanded number to its first-occurrence canonical number when applicable
- drop duplicates introduced by canonicalization
- serialize the rewritten token back into plain bracket syntax such as `[1]` or `[1, 2, 4]`

Range re-compression is not required for this change. A normalized comma-separated list is sufficient because the browser formatter already understands list syntax.

### 4. Keep Browser Formatting and Click Handling Unchanged

Because `answerBody` is rewritten server-side:

- `formatAssistantAnswer(...)` can stay lecture-agnostic
- `MessageMarkdown` can continue resolving clicks by `#citation-{number}`
- `PipelinePageClient` only needs to render the rewritten canonical answer body

This preserves the current separation:

- server owns citation canonicalization and answer rewriting
- shared formatter owns generic markdown link generation
- JSX owns only interaction wiring

### 5. Leave Persistence Stable

Do not widen:

- `components/pipeline/types.ts` `Message`
- `lib/persistence/schema.ts`

Current assumption:

- `PipelinePageClient` formats rewritten `answerBody` into markdown before storing the assistant message
- persisted `content` therefore already contains canonical citation targets

### 6. Update Stream and Client Contract Handling Only as Needed

Because no alias field is added:

- `lib/chat/server.ts` and `lib/chat/stream.ts` should only pass through the rewritten canonical result
- `lib/chat/client.ts` should not need new validation rules beyond any tests that explicitly assert rewritten output

### 7. Add Focused Regression Coverage

Update automated coverage in:

- `tests/chat/normalize.test.ts`
- `tests/chat/shared.test.ts`
- `tests/chat/server.test.ts` and/or `tests/chat/stream-route.test.ts`
- `tests/chat/client.stream.test.ts` if streamed result behavior needs explicit rewritten-answer coverage

Required test cases:

- lecture duplicate cited-text sample where `1`, `5`, `10`, and `15` canonicalize to `1` and the answer rewrites those citations to `1`
- lecture duplicate cited-text sample where `4`, `8`, `13`, and `18` canonicalize to `4`
- `[5]` in the original answer becomes `[1]` in normalized `answerBody`
- duplicate numbers inside one citation token collapse to one canonical number
- non-duplicate citation numbers continue linking to themselves
- non-lecture target results do not rewrite citation numbers
- sparse citation numbers such as `20` continue working without any index-array assumptions

## Suggested Delivery Order

1. Implement lecture deduplication and first-occurrence mapping in `lib/chat/normalize.ts`.
2. Add answer-body rewriting using the computed canonical-number mapping.
3. Keep `formatAssistantAnswer(...)` unchanged unless a small helper extraction is needed for test reuse.
4. Add regression tests for lecture deduplication, answer rewriting, and sparse-number non-regression.
5. Run the standard verification commands and manual duplicate-click checks.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Use a lecture-target response containing duplicate cited text under numbers `1`, `5`, `10`, and `15`, then confirm the rendered answer shows `[1]` in those positions instead of `[5]`, `[10]`, or `[15]`.
2. Confirm canonical citations open correctly for rewritten duplicates and for non-duplicate numbers such as `[4]` and `[20]`.
3. Confirm the modal continues to show the clean lecture `URL:` and `Content:` fields, not the raw metadata blob.
4. Confirm a non-lecture target still behaves exactly as it does today.
5. Restore a persisted session containing lecture answers and confirm citation clicks still work without storing extra alias state in the session model.

## Risks

- If first-occurrence reference order is unstable upstream, canonical rewritten numbers could shift between otherwise similar backend responses.
- If answer rewriting and citation deduplication drift apart, the rendered answer could point to numbers missing from the deduplicated `citations` array.
- If we widen persistence prematurely, we introduce schema churn for metadata that is unnecessary once the answer is rewritten canonically.
- If we broaden dedupe beyond exact normalized `cited_text`, we risk incorrectly merging distinct excerpts that only appear semantically similar.
- If lecture dedupe logic leaks into generic citation paths, non-lecture target behavior could regress.

## Recommended Architecture Decision

Treat cited-text deduplication and answer-number rewriting as one lecture-target server normalization concern. Canonical citations should be selected by first occurrence during normalization, the answer body should be rewritten to those canonical numbers before it reaches the browser, and the browser should continue rendering and clicking citations with its existing generic logic.

That keeps the raw-backend shaping where this codebase wants it, keeps JSX simple, avoids brittle index-based resolution, and makes the rendered answer itself match the deduplicated citation set.
