---
title: 'Implementation Plan: ISKCON Bangalore Lecture Inline URL Citation Resolution'
type: 'implementation-plan'
created: '2026-04-22'
status: 'proposed'
context:
  - '_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md'
  - '_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-mapping.md'
  - '_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-deduplication.md'
  - '_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md'
  - '_bmad-output/project-context.md'
---

## Goal

Replace the lecture-target citation mapping assumption that `references[*].citation_number` is the source of truth. For `ISKCON Bangalore Lectures`, treat inline citation URLs embedded in `answerBody` as the authoritative source identifiers, resolve citation content from a server-owned SQLite URL-to-content store, and keep the browser-facing citation contract numerically stable.

## Problem Summary

The current lecture normalizer and its related plans assume this workflow:

- derive cited numbers from the answer body
- normalize `result.references[*]` by `citation_number`
- parse `URL:` and `Content:` from `references[*].cited_text`
- optionally deduplicate repeated lecture references

That assumption no longer matches the downstream payload shape. The new NotebookLM lecture responses already place citation URLs directly in the answer text, for example:

```text
... material advancement cannot address[https://youtu.be/SqSgsKehYQI?t=650], [https://youtu.be/Sqqw2JDxTfI?t=771].
```

This creates three architectural implications:

1. The answer text itself is now the lecture citation source of truth.
2. The `references` array is no longer required to build the browser-facing lecture citation list.
3. Because the browser still expects numeric citation anchors such as `#citation-1`, the server must translate inline URL citations into deterministic numeric citations before rendering.

## Supersession Note

This plan supersedes the lecture-target assumptions in:

- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-deduplication.md`
- `_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md`

Specifically, those earlier artifacts assume lecture citations should be derived primarily from `references[*].citation_number` and `references[*].cited_text`. The new plan treats inline URLs in `answerBody` as authoritative for lecture-target citation extraction.

## Boundary Decisions

### 1. Treat Inline Lecture Citation URLs as the Source of Truth

For `ISKCON Bangalore Lectures`, parse citations from bracketed URL tokens in `answerBody` instead of building lecture citations from `result.references`.

Rationale:

- The downstream answer already encodes the exact sources the user sees.
- This removes dependence on a second payload section that may be incomplete, noisy, or redundant.
- It keeps lecture normalization aligned with the actual rendered answer instead of an indirect appendix or reference map.

### 2. Keep the Browser Contract Numeric

Do not redesign the browser contract around URL anchors. Continue returning:

- `answerBody` with numeric citation tokens such as `[1]` and `[2]`
- `citations` as the existing `Citation[]` shape with `number`, `url`, and `text`

Rationale:

- `lib/chat/shared.ts`, `MessageMarkdown`, modal selection, and persistence all currently assume numeric citation ids.
- Preserving the numeric contract keeps JSX, persistence, and restore behavior stable.
- Server-side canonicalization is the smallest change surface that fits the current codebase architecture.

### 3. Perform URL-to-Content Lookup at a Server-Owned SQLite Boundary

Introduce a dedicated server adapter that resolves lecture citation content by URL from a SQLite key-value store. Do not access SQLite from JSX, browser utilities, or persistence code.

Rationale:

- Project context requires unstable or provider-specific payload shaping to happen at a server-owned boundary.
- Database access is I/O and should stay separate from pure answer parsing.
- A small adapter allows the actual SQLite schema and driver choice to remain localized.

### 4. Keep Parsing Pure, Keep Lookup I/O Outside the Pure Normalizer

Split the lecture workflow into two concerns:

- pure parsing and answer rewriting from inline URL citations
- server-side hydration of `citation.text` via the SQLite lookup adapter

Rationale:

- The current normalizer is heavily testable because it is pure.
- SQLite lookup is an integration concern and should not force all parsing logic to become opaque or harder to unit test.
- This preserves a clean seam between deterministic rewriting and storage-backed enrichment.

### 5. Canonicalize Lecture Citations by First URL Occurrence in the Answer

When the same normalized lecture URL appears multiple times, reuse the number assigned at first occurrence and rewrite later duplicates to that same number.

Rationale:

- This preserves the prior first-occurrence rule, now with URL as the dedupe key instead of `cited_text`.
- It yields deterministic numbering that matches reading order.
- It avoids duplicate citation modals for the same lecture source.

### 6. Ignore `result.references` for the Lecture Target Unless an Explicit Fallback Is Added Later

For this change, the lecture-target path should not depend on `result.references` when inline URL citations are present in the answer.

Rationale:

- The new source of truth is sufficient for citation extraction.
- Continuing to merge `references` into the primary path would reintroduce ambiguity.
- A later fallback can be added only if real payloads prove mixed-mode support is necessary.

### 7. Keep Non-Lecture Targets on the Existing Numeric and Reference-Based Path

Do not broaden this URL-citation workflow to other targets as part of this change.

Rationale:

- The current behavior already works for non-lecture targets.
- This is a lecture-target downstream contract pivot, not a platform-wide citation redesign.
- Limiting scope reduces regression risk.

## Proposed Target Workflow

1. The server receives a completed result for target key `ISKCON Bangalore Lectures`.
2. The normalizer strips any legacy appendix text as it does today.
3. A lecture-target helper scans `answerBody` for bracketed citation tokens whose contents are URL-shaped instead of numeric.
4. Each discovered URL is normalized into:
   - a `displayUrl` for the browser contract
   - a `lookupKey` for SQLite lookup and deduplication
5. The first occurrence of each normalized URL is assigned the next canonical citation number in answer order: `1`, `2`, `3`, ...
6. The answer is rewritten so inline URL citations become numeric citation tokens, for example:
   - `[https://youtu.be/SqSgsKehYQI?t=650]` -> `[1]`
   - `[https://youtu.be/Sqqw2JDxTfI?t=771]` -> `[2]`
7. Repeated URLs reuse the already assigned number instead of creating a new citation.
8. The server performs one batched SQLite lookup for the canonical lecture citation URLs.
9. The normalized lecture result returns:
   - rewritten numeric `answerBody`
   - `citations[]` with `{ number, url, text }`
10. `formatAssistantAnswer(...)`, `MessageMarkdown`, citation modal selection, and persistence continue consuming the same numeric contract they already understand.

## Example Normalized Outcome

Input answer snippet:

```text
Practicing spiritual life ... cannot address[https://youtu.be/SqSgsKehYQI?t=650], [https://youtu.be/Sqqw2JDxTfI?t=771].
```

Normalized lecture result:

```json
{
  "answerBody": "Practicing spiritual life ... cannot address[1], [2].",
  "citations": [
    {
      "number": 1,
      "url": "https://youtu.be/SqSgsKehYQI?t=650",
      "text": "Resolved from SQLite by URL"
    },
    {
      "number": 2,
      "url": "https://youtu.be/Sqqw2JDxTfI?t=771",
      "text": "Resolved from SQLite by URL"
    }
  ]
}
```

## Scope

### In Scope

- Lecture-target extraction of inline URL citations from `answerBody`
- Lecture-target answer rewriting from URL citations to numeric citations
- Lecture-target deduplication by normalized URL key
- Server-owned SQLite lookup from URL to citation content
- Preservation of the existing browser-facing `Citation` contract
- Focused regression coverage for pure parsing, lookup hydration, and non-lecture non-regression

### Out of Scope

- Reworking non-lecture citation extraction
- Client-side URL citation parsing or URL-based anchor ids
- Dependence on `result.references` for the primary lecture path
- Schema changes to browser persistence
- Fuzzy semantic deduplication across different URLs

## Implementation Changes

### 1. Add a Lecture Inline URL Citation Parser

Update the lecture-target normalization path to detect bracketed inline URL citations in `answerBody`.

Recommended behavior:

- recognize bracket tokens whose payload is URL-shaped rather than numeric
- support the observed notebook sample shape of repeated bracketed URLs
- normalize surrounding whitespace consistently
- ignore non-URL bracket content on the non-lecture path

Recommended location:

- keep generic appendix stripping in `lib/chat/normalize.ts`
- add lecture-target inline URL extraction helpers either in `lib/chat/normalize.ts` or a small adjacent module under `lib/chat/`

### 2. Rewrite Lecture Answers to Canonical Numeric Citations

Add a lecture-target rewrite helper that converts inline URL citations into numeric citation tokens before the browser receives the result.

Important rules:

- first occurrence of a normalized URL becomes the canonical citation number
- later occurrences of the same URL rewrite to that same number
- numeric browser formatting remains unchanged because the answer is numeric by the time it reaches `formatAssistantAnswer(...)`

### 3. Introduce a Server-Only SQLite Citation Content Adapter

Add a new server module such as:

- `lib/chat/citation-content-store.ts`

Responsibilities:

- open or reuse a configured SQLite database
- resolve one or more URLs to content text
- hide table and column naming details from the chat pipeline
- return a batched URL-to-content mapping

Recommended contract:

```ts
type CitationContentStore = {
  getContentByUrls(urls: string[]): Promise<Map<string, string>>
}
```

Schema assumption for planning purposes:

- a read-only key-value shape equivalent to `url -> content`

The adapter should own any concrete schema mapping so the rest of the chat pipeline only speaks in URLs.

### 4. Keep `normalize.ts` Pure and Hydrate Citation Text in `lib/chat/server.ts`

Recommended separation:

- `normalize.ts` returns the rewritten lecture answer plus canonical URL-number assignments
- `lib/chat/server.ts` performs the SQLite lookup and builds the final `Citation[]`

Rationale:

- parsing and rewriting remain deterministic and fast to unit test
- database access stays in a clearly server-only integration layer
- stream and one-shot chat paths can share the same hydration boundary

### 5. Preserve Shared and Browser Components

Keep these surfaces stable unless implementation proves otherwise:

- `lib/chat/shared.ts` `Citation` type
- `formatAssistantAnswer(...)`
- `components/pipeline/MessageMarkdown.tsx`
- `components/pipeline/PipelineModals.tsx`
- `components/pipeline/types.ts`
- `lib/persistence/schema.ts`

This is a key architecture goal of the change.

### 6. Add a Configured Server Boundary for SQLite Access

Add a server-owned configuration source for the SQLite database path, for example:

- `TATTVAM_LECTURE_CITATION_SQLITE_PATH`

Configuration rules:

- validate presence at server startup or first use
- fail fast with a clear server-side error if misconfigured
- keep the browser unaware of database location and schema

### 7. Update Automated Coverage Around the New Source of Truth

Required test focus:

- inline lecture URL parsing from `answerBody`
- answer rewriting from URLs to numeric citations
- duplicate URL reuse of first-occurrence numbers
- successful SQLite hydration
- graceful lookup miss behavior
- non-lecture target non-regression
- stream path and one-shot path coverage where server hydration occurs

## Suggested File Touches

- `lib/chat/normalize.ts`
- `lib/chat/server.ts`
- `lib/chat/stream.ts`
- `lib/chat/shared.ts` only if a small parsing helper extraction is needed
- `lib/chat/citation-content-store.ts` as a new server-only adapter
- `tests/chat/normalize.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/stream-route.test.ts`
- `tests/chat/shared.test.ts` only if numeric rendering assumptions need refreshed coverage

## Acceptance Sketch

- Given a lecture-target answer containing bracketed URL citations, when normalization runs, then the server derives citations from those inline URLs rather than `result.references[*].citation_number`.
- Given repeated appearances of the same lecture URL, when normalization runs, then the first occurrence defines the canonical citation number and later occurrences reuse it.
- Given a lecture-target URL that exists in the SQLite store, when normalization completes, then the returned citation includes the resolved `text` for that URL.
- Given a lecture-target URL missing from the SQLite store, when normalization completes, then the returned citation still includes the URL and a safe empty-text fallback instead of failing the whole answer.
- Given the browser receives the normalized result, when the transcript renders, then the existing numeric citation click flow continues working without URL-specific JSX logic.
- Given a non-lecture target result, when normalization runs, then the current numeric and reference-based behavior remains unchanged.

## Suggested Delivery Order

1. Add a pure lecture URL citation parser and answer rewrite helper.
2. Add the SQLite content adapter behind a small server-only interface.
3. Hydrate lecture citation text in `lib/chat/server.ts`.
4. Thread the hydrated result through the existing stream path.
5. Add regression coverage for parsing, hydration, and non-lecture behavior.
6. Run verification commands and manual lecture-target checks.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Ask a lecture-target prompt that returns inline URL citations and confirm the rendered transcript shows numeric clickable citations rather than raw bracketed URLs.
2. Click two different lecture citations and confirm the modal shows the resolved content from the SQLite store.
3. Ask or replay a lecture answer where the same URL appears more than once and confirm repeated citations open the same canonical entry.
4. Force or simulate a lookup miss for one lecture URL and confirm the transcript still renders and the modal still opens with the URL present.
5. Confirm a non-lecture target still uses its current citation behavior unchanged.

## Risks

- If URL normalization differs from the keys stored in SQLite, content lookup misses will rise even when the source exists.
- If server-side answer rewriting drifts from citation numbering, the browser could render anchors that do not match the returned citation list.
- If SQLite lookup is performed one URL at a time instead of batched, lecture responses could regress in latency.
- If lecture URL parsing is broadened too aggressively, unrelated bracketed prose could be mistaken for citations.
- If the browser contract is widened unnecessarily, persistence and restore complexity will increase without user benefit.

## Recommended Architecture Decision

Treat inline lecture citation URLs as the authoritative lecture citation identifiers, then canonicalize them to numeric citations at the server boundary and hydrate their text from a server-owned SQLite URL-to-content store.

That approach keeps the UI contract boring, isolates the new storage dependency in `lib/`, and aligns the lecture citation model with the actual downstream answer format rather than an increasingly unreliable `references` side channel.
