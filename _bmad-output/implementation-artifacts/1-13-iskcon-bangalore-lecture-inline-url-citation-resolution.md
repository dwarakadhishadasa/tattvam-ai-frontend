# Story 1.13: ISKCON Bangalore Lecture Inline URL Citation Resolution

Status: proposed

## Source Artifacts

- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-inline-url-citation-resolution.md`
- `_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-deduplication.md`
- `_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md`
- `_bmad-output/project-context.md`

## Story

As a presenter reviewing answers from `ISKCON Bangalore Lectures`,
I want inline lecture citation URLs rewritten into the app's existing numeric citation format and hydrated from a SQLite URL-to-content store,
so that the transcript stays clickable and clean even when downstream responses no longer provide usable lecture citation data in `references[*]`.

## Acceptance Criteria

1. Given a result for target key `ISKCON Bangalore Lectures`, when the answer contains bracketed URL citations, then the lecture normalization path derives citation identity from those inline URLs rather than `result.references[*].citation_number`.
2. Given a lecture answer contains repeated occurrences of the same normalized URL, when normalization runs, then the first occurrence determines the canonical numeric citation id and later occurrences reuse it.
3. Given a lecture answer contains inline URL citations, when normalization completes, then the browser receives a rewritten numeric `answerBody` plus the existing `Citation[]` shape of `number`, `url`, and `text`.
4. Given a canonical lecture citation URL exists in the SQLite store, when server hydration runs, then the returned citation includes the resolved `text` for that URL.
5. Given a canonical lecture citation URL does not exist in the SQLite store, when server hydration runs, then the citation still returns with its `url` and a safe empty-text fallback instead of failing the whole response.
6. Given any non-lecture target result, when normalization runs, then the current reference-based and numeric citation behavior remains unchanged.
7. Given the extraction transcript renders the normalized result, when a user clicks a lecture citation, then the existing modal workflow opens without URL-specific parsing logic in JSX.

## Tasks / Subtasks

- [ ] Add lecture-target inline URL citation parsing in `lib/chat/normalize.ts` or a dedicated helper module. (AC: 1, 2, 3)
  - [ ] Detect bracketed citation tokens whose payload is URL-shaped.
  - [ ] Normalize discovered URLs for canonical deduplication.
  - [ ] Assign numeric ids by first answer occurrence.
  - [ ] Rewrite the lecture answer from URL citations to numeric citations.

- [ ] Add a server-only SQLite citation content adapter. (AC: 4, 5)
  - [ ] Create a module such as `lib/chat/citation-content-store.ts`.
  - [ ] Add server-owned configuration for the SQLite database path.
  - [ ] Support batched lookup from canonical URL list to citation content text.
  - [ ] Keep schema details local to the adapter.

- [ ] Hydrate lecture citation text after pure parsing and before browser delivery. (AC: 3, 4, 5, 7)
  - [ ] Keep answer parsing pure and deterministic.
  - [ ] Use `lib/chat/server.ts` as the integration seam for SQLite hydration.
  - [ ] Preserve the exported browser-facing `Citation` shape.
  - [ ] Thread the hydrated lecture result through the stream path.

- [ ] Preserve existing browser rendering and persistence semantics. (AC: 3, 6, 7)
  - [ ] Keep `formatAssistantAnswer(...)` numeric-only.
  - [ ] Keep `MessageMarkdown` citation selection by `#citation-{number}`.
  - [ ] Avoid widening `components/pipeline/types.ts` or persistence schema for this change.
  - [ ] Keep non-lecture targets on the current path.

- [ ] Add focused regression coverage. (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] Extend `tests/chat/normalize.test.ts` with inline URL parsing and numeric answer rewrite cases.
  - [ ] Extend `tests/chat/server.test.ts` with SQLite hydration success and lookup miss cases.
  - [ ] Extend `tests/chat/stream-route.test.ts` only as needed to cover lecture-target hydration through streaming.
  - [ ] Refresh `tests/chat/shared.test.ts` only if shared numeric citation rendering assumptions need explicit reinforcement.
  - [ ] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Architectural Direction

- The source of truth for lecture citations is shifting from `references[*]` to the rendered answer itself.
- The cleanest adaptation is still server-owned normalization rather than any JSX-side URL parsing.
- Keep the browser contract numeric by rewriting lecture URL citations before rendering.
- Keep SQLite access in a small server adapter under `lib/`.

### Current Code Constraints

- `lib/chat/shared.ts` and `MessageMarkdown` currently support only numeric citation anchors.
- `components/pipeline/types.ts` and persistence assume the existing `Citation` shape.
- `lib/chat/normalize.ts` is currently pure and test-friendly; preserve that quality where possible.
- `requestNormalizedChatResult(...)` in `lib/chat/server.ts` is already the right seam for server-owned I/O after downstream fetches complete.

### File Structure Requirements

- `lib/chat/normalize.ts`
- `lib/chat/server.ts`
- `lib/chat/stream.ts`
- `lib/chat/citation-content-store.ts`
- `tests/chat/normalize.test.ts`
- `tests/chat/server.test.ts`
- `tests/chat/stream-route.test.ts`

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Confirm raw bracketed lecture URLs are rewritten into numeric transcript citations.
  - Confirm repeated lecture URLs reuse the first assigned numeric id.
  - Confirm a successful SQLite lookup populates citation text in the modal.
  - Confirm a lookup miss does not break transcript rendering.
  - Confirm a non-lecture target still behaves as it does today.

## References

- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-inline-url-citation-resolution.md`
- `_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-deduplication.md`
- `_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md`
- `_bmad-output/project-context.md`
- `lib/chat/normalize.ts`
- `lib/chat/server.ts`
- `lib/chat/stream.ts`
- `lib/chat/shared.ts`
- `components/pipeline/MessageMarkdown.tsx`
- `components/pipeline/types.ts`
