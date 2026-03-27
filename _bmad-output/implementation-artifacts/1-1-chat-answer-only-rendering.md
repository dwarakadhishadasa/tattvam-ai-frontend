# Story 1.1: Chat Answer-Only Rendering

Status: ready-for-dev

## Source Artifact

- `_bmad-output/implementation-artifacts/spec-chat-answer-only-rendering.md`

## Story

As a presenter using extraction chat,
I want assistant messages to render only the answer body,
so that the conversation stays readable while citations remain available on demand.

## Acceptance Criteria

1. Given the backend returns an answer followed by citations and timestamped YouTube URLs, when the assistant message renders in chat, then only the answer section is visible in the transcript.
2. Given the rendered answer contains inline citation numbers, when the user clicks one, then the existing citation modal opens with the cited excerpt and embedded YouTube video when a mapped URL exists.
3. Given an assistant message has structured citations, when the transcript renders, then no standalone `References` heading or citation list appears below the message.
4. Given a citation has no usable YouTube URL, when the user opens it from the answer, then the modal still shows the citation text without breaking the interaction.
5. Given the user saves a full assistant response after this change, when the save action completes, then the notebook stores the answer-only content shown in chat rather than hidden citation or URL appendix text.

## Tasks / Subtasks

- [ ] Remove transcript-level references chrome from assistant messages while keeping the save action reachable (AC: 1, 3, 5)
  - [ ] Keep assistant rendering in `components/pipeline/PipelineSteps.tsx` limited to `MessageMarkdown` plus the existing `Save Full Response` action.
  - [ ] Do not render any fallback references list below assistant messages, even when `message.citations` exists.
  - [ ] Reconcile with the current dirty-worktree change in `components/pipeline/PipelineSteps.tsx` instead of overwriting it.

- [ ] Preserve the existing citation review interaction path (AC: 2, 4)
  - [ ] Keep `components/pipeline/MessageMarkdown.tsx` as the only in-transcript citation affordance via `#citation-*` links.
  - [ ] Leave `components/pipeline/PipelineModals.tsx` citation modal behavior intact, including the no-video case.
  - [ ] Do not change citation save behavior beyond ensuring it continues to save only the visible excerpt text.

- [ ] Keep answer-body parsing and save semantics aligned (AC: 1, 5)
  - [ ] Reuse `lib/chat/shared.ts` appendix-stripping behavior so `Message.content` remains answer-only markdown.
  - [ ] Confirm `handleSaveSnippet(message.content)` in `components/pipeline/PipelinePageClient.tsx` still saves only the displayed assistant content.
  - [ ] Harden parsing only if a real backend variant requires it; do not move parsing logic into JSX.

- [ ] Add focused verification for appendix stripping and preserved citation mapping (AC: 1, 2, 4, 5)
  - [ ] Extend `tests/chat/shared.test.ts` for answer-only parsing and appendix stripping.
  - [ ] If a lightweight render harness is practical without expanding scope, add one focused assistant-rendering assertion; otherwise rely on manual UI verification.
  - [ ] Run `npm test`, `npm run lint`, and `npm run build`.

## Dev Notes

### Current Branch Intelligence

- The current worktree already includes uncommitted changes that remove the visible assistant `References` block in `components/pipeline/PipelineSteps.tsx`.
- The current worktree already adds `stripCitationAppendix()` in `lib/chat/shared.ts` and uses it in parsing and restore paths.
- Treat those diffs as in-flight implementation context. Extend them or validate them; do not recreate the old references block.

### Architecture Compliance

- Keep rendering concerns inside `components/pipeline/*` and appendix parsing inside `lib/chat/*`.
- This story is render-focused. Do not move raw backend payload shaping into the client; server-owned normalization is covered by Story 1.2.
- Preserve the current `/api/chat` request body shape `{ question }` and existing modal interaction contracts.

### File Structure Requirements

- `components/pipeline/PipelineSteps.tsx`: assistant transcript markup and save-action placement
- `components/pipeline/MessageMarkdown.tsx`: inline citation-link behavior
- `components/pipeline/PipelineModals.tsx`: citation modal and save-excerpt behavior
- `lib/chat/shared.ts`: appendix stripping and citation extraction
- `tests/chat/shared.test.ts`: parsing regression coverage

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Ask a question that returns inline citations plus a trailing citations appendix and confirm the chat bubble shows answer prose only.
  - Click multiple inline citations and confirm the existing modal still opens with the correct excerpt.
  - Open a citation without a usable video URL and confirm the modal remains stable.
  - Save a full assistant response and confirm the saved content does not include hidden citation appendix text.

### References

- `_bmad-output/implementation-artifacts/spec-chat-answer-only-rendering.md`
- `_bmad-output/planning-artifacts/spec.md`
- `_bmad-output/project-context.md`
- `components/pipeline/PipelinePageClient.tsx`
- `components/pipeline/PipelineSteps.tsx`
- `components/pipeline/MessageMarkdown.tsx`
- `components/pipeline/PipelineModals.tsx`
- `lib/chat/shared.ts`

## Dev Agent Record

### Agent Model Used

_TBD by dev agent_

### Debug Log References

- Source artifact: `spec-chat-answer-only-rendering.md`

### Completion Notes List

- Preserve answer-only transcript rendering without changing citation modal semantics.
- Treat current dirty-worktree changes on `PipelineSteps.tsx` and `lib/chat/shared.ts` as the starting point.

### File List

- `components/pipeline/PipelineSteps.tsx`
- `components/pipeline/MessageMarkdown.tsx`
- `components/pipeline/PipelineModals.tsx`
- `components/pipeline/PipelinePageClient.tsx`
- `lib/chat/shared.ts`
- `tests/chat/shared.test.ts`
