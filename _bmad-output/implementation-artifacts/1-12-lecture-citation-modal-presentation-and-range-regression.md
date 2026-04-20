# Story 1.12: Lecture Citation Modal Presentation and Range Regression

Status: in-progress

## Source Artifacts

- `_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md`
- `_bmad-output/implementation-artifacts/1-8-multi-notebook-chat-transcript-streaming.md`
- `_bmad-output/project-context.md`

## Story

As a presenter opening a lecture citation from the Extraction transcript,
I want the citation modal to show `URL:` first and `Content:` second while range citations still open by number,
so that lecture-source review feels clean and predictable against the reduced cited-only lecture citation set without regressing the current click, preview, and save flows.

## Acceptance Criteria

1. Given a normalized lecture citation with both `url` and `text`, when the citation modal opens, then it renders a labeled `URL:` section before a labeled `Content:` section.
2. Given a lecture citation has a YouTube URL, when the modal opens, then the current embed preview and external-open affordance still work from `citation.url`.
3. Given a lecture citation is saved from the modal, when the save action runs, then it stores the normalized content-only `citation.text` rather than the raw lecture metadata blob.
4. Given an answer contains `[2, 7-10]`, when the browser formats the answer, then each resolved citation number is linkified individually and still maps to the citation whose `number` matches that resolved value.
5. Given Story 1.11 reduces lecture citations to only the cited set, when the transcript and modal render, then they continue working from that reduced citation array without any client-side recovery path for uncited lecture references.
6. Given a non-lecture target citation opens in the modal, when the updated presentation renders, then the existing citation review flow remains usable and no lecture-specific parsing occurs in JSX.

## Tasks / Subtasks

- [x] Update citation modal presentation for the cleaned lecture contract (AC: 1, 2, 3, 5, 6)
  - [x] Update `components/pipeline/PipelineModals.tsx` so the citation modal renders labeled `URL:` and `Content:` sections in that order.
  - [x] Preserve current modal framing, close behavior, and scroll behavior.
  - [x] Keep the existing YouTube preview logic driven by `citation.url`.
  - [x] Keep the external-link affordance working when a citation URL exists.
  - [x] Keep the save action storing `citation.text` so notebook snippets remain content-only for lecture citations.

- [x] Protect the browser citation interaction contract (AC: 4, 5, 6)
  - [x] Leave `components/pipeline/MessageMarkdown.tsx` free of lecture-specific parsing logic.
  - [x] Keep citation selection keyed by `citation.number`.
  - [x] Consume the reduced cited-only lecture citations from Story 1.11 as the final UI contract; do not add a client-side fallback that expects uncited lecture references to still exist.
  - [x] Touch `MessageMarkdown.tsx` only if a small guard or clarity improvement is required for number-based matching.

- [x] Add focused regression coverage for range expansion and browser-side expectations (AC: 4, 5, 6)
  - [x] Extend `tests/chat/shared.test.ts` with an explicit `[2, 7-10]` case that proves per-number link expansion.
  - [x] Add any small pure-helper coverage needed to document the browser-facing contract after Story 1.11 lands.
  - [x] Do not invent a heavy component-test harness for this story; the current repo does not include one.

- [ ] Complete verification with manual UI checks (AC: 1, 2, 3, 4, 5, 6)
  - [ ] Run `npm test`, `npm run lint`, and `npm run build`.
  - [ ] Manually verify lecture citations open with `URL:` first and `Content:` second.
  - [ ] Manually verify lecture citations do not show `Themes`, `Audience`, or `Content-type`.
  - [ ] Manually verify a lecture response with many uncited backend references still behaves correctly in the UI using only the reduced cited citation set returned by Story 1.11.
  - [ ] Manually verify at least one non-lecture citation still opens correctly after the modal update.

## Dev Notes

### Sequencing

- This story depends on Story 1.11 because the modal should consume normalized lecture citations, not implement a second parsing path.
- Story 1.8 already established target-labeled transcript behavior; this story should reuse that interaction model without changing message ordering or streamed message states.
- Treat the cited-only lecture citation array produced by Story 1.11 as the final UI contract for this story.

### Current Branch Intelligence

- `components/pipeline/PipelineModals.tsx` currently renders citation content as one italicized quote block and then, if `citation.url` exists, renders the YouTube embed beneath it.
- The modal footer currently shows an "Open in YouTube" link when `citation.url` exists and the save action stores `citation.text`.
- `components/pipeline/MessageMarkdown.tsx` already resolves `#citation-{number}` links by finding the matching citation via `citation.number.toString() === citationId`.
- `lib/chat/shared.ts` already expands ranges like `[2-3]` into individually linkified anchors, but current coverage does not explicitly document the mixed list-and-range case `[2, 7-10]`.
- This story should assume Story 1.11 has already removed uncited lecture references at the server boundary; the UI should not attempt to reconstruct or retain them.
- The repo currently uses Vitest only and does not include a dedicated React component-testing stack, so this story should lean on pure-helper coverage plus manual UI validation.

### Architecture Compliance

- Keep lecture-specific parsing out of JSX. The modal should only present already-normalized `Citation` data.
- Preserve the existing `Citation` contract and number-based selection flow rather than introducing modal-only data shapes.
- Keep UI changes contained to product-specific pipeline components; no new generic primitive is required.
- Treat the reduced cited-only lecture citations array as authoritative; do not add client-side repair logic for pruned lecture references.
- Maintain visible focus, link, and save affordances already established in the modal.

### File Structure Requirements

- `components/pipeline/PipelineModals.tsx`: presentation order and labels
- `components/pipeline/MessageMarkdown.tsx`: no lecture parser; keep number-based mapping
- `lib/chat/shared.ts`: existing range-linkification contract
- `tests/chat/shared.test.ts`

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Ask a prompt that returns `ISKCON Bangalore Lectures` citations and confirm the modal shows `URL:` before `Content:`.
  - Ask a prompt whose lecture response contains many uncited backend references and confirm the UI still works cleanly with only the cited lecture citations returned to it.
  - Confirm the modal still embeds and opens YouTube links from `citation.url`.
  - Save a lecture citation and confirm the saved notebook snippet contains only the normalized content text.
  - Confirm the transcript renders `[2, 7-10]` as individually clickable citation numbers.
  - Confirm a non-lecture citation still opens cleanly with no broken modal behavior.

### References

- `_bmad-output/implementation-artifacts/spec-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/plan-iskcon-bangalore-lectures-citation-mapping.md`
- `_bmad-output/implementation-artifacts/1-11-iskcon-bangalore-lecture-citation-normalization.md`
- `_bmad-output/implementation-artifacts/1-8-multi-notebook-chat-transcript-streaming.md`
- `_bmad-output/project-context.md`
- `components/pipeline/PipelineModals.tsx`
- `components/pipeline/MessageMarkdown.tsx`
- `lib/chat/shared.ts`
- `tests/chat/shared.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `2026-04-10 23:17:11 IST` - `npm test -- --run tests/chat/normalize.test.ts tests/chat/server.test.ts tests/chat/stream-route.test.ts tests/chat/shared.test.ts` ✅
- `2026-04-10 23:19:16 IST` - `npm test` ✅
- `2026-04-10 23:28:11 IST` - `npm run lint` ✅
- `2026-04-10 23:28:11 IST` - `npm run build` ❌ `Build failed because of webpack errors` with no emitted module-level diagnostic from Next.js
- Manual UI verification not run in this terminal-only pass

### Completion Notes List

- Updated `components/pipeline/PipelineModals.tsx` so citation review renders labeled `URL:` before labeled `Content:` while preserving modal structure, save behavior, scroll behavior, and preview wiring from `citation.url`.
- Kept `components/pipeline/MessageMarkdown.tsx` unchanged so browser citation selection remains number-based and lecture-parser-free.
- Added mixed list-and-range regression coverage in `tests/chat/shared.test.ts` for `[2, 7-10]`.
- `npm test` and `npm run lint` passed. `npm run build` remains unresolved because Next.js only reports a generic webpack failure on this branch.

### File List

- `components/pipeline/PipelineModals.tsx`
- `tests/chat/shared.test.ts`
