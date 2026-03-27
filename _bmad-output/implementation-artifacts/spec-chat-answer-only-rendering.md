---
title: 'Chat Answer-Only Rendering'
type: 'feature'
created: '2026-03-27'
status: 'done'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/spec.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/planning-artifacts/data-model.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Assistant responses currently render the answer body and then append a visible `References` block built from `message.citations`. That makes the transcript visually heavy, duplicates source material already available through inline citation links, and exposes citation metadata that the user wants hidden from the main chat flow.

**Approach:** Keep the existing parser and citation mapping contract intact: `parseBackendChatResponse` continues to produce `cleanAnswer` plus structured `citations`, inline citation numbers in the answer remain clickable, and the citation modal continues to show excerpt text plus embedded YouTube video when available. Only the chat transcript rendering changes so users see the answer section alone.

## Boundaries & Constraints

**Always:** Render only the assistant answer body inside the chat timeline; preserve `Message.content` as the answer-only markdown; preserve `Message.citations` for modal interactions and persistence; keep inline citation-number clicks opening the existing citation modal; keep YouTube embed behavior inside the citation modal; keep "Save Full Response" operating on the answer-only content already shown in chat.

**Ask First:** Changing the backend response shape; removing `citations` from the parsed message model; adding a new fallback citation list when the answer body does not contain inline reference markers; changing notebook save provenance for citation excerpts.

**Never:** Reintroduce the visible `References` panel under assistant messages; render the raw citations section or raw YouTube URL section in the chat body; break the citation modal, citation save flow, or citation-to-video mapping.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Standard cited answer | Backend answer contains prose with inline citation markers plus trailing citation and YouTube URL sections | Chat shows only the prose answer with clickable inline citation numbers; no trailing citations block appears | None needed; citation modal remains the detail surface |
| Citation click | User clicks an inline citation number in the rendered answer | Existing citation modal opens with cited excerpt text and embedded YouTube player when a mapped URL exists | If no citation match is found, no modal opens and the chat remains stable |
| Citation without video | Parsed citation has text but no usable YouTube URL | Chat still shows only the answer body; modal shows the citation text without embedded media | Modal keeps the no-video state instead of failing |
| Answer without inline markers | Parsed message has `citations`, but the answer body does not contain clickable reference markers | Chat still renders answer-only content and does not add a fallback references list | Accepted narrow-scope limitation unless product requests a new affordance later |
| Uncited answer | Parsed message has no citations | Chat shows the answer body only, with no empty citation chrome below it | None needed |

</frozen-after-approval>

## Code Map

- `components/pipeline/PipelineSteps.tsx` -- remove the visible assistant `References` section and keep the answer body plus save action layout intact
- `components/pipeline/MessageMarkdown.tsx` -- preserve inline citation-link handling as the only in-transcript citation affordance
- `components/pipeline/PipelineModals.tsx` -- keep citation modal behavior unchanged as the detail view for citation text and embedded YouTube video
- `lib/chat/shared.ts` -- preserve `cleanAnswer` and `citations` parsing contract; only touch if heading stripping needs hardening for additional backend section labels
- `tests/chat/shared.test.ts` -- add parser coverage for answer-only extraction if a lightweight harness is introduced in scope
- `tests/pipeline/message-rendering.test.tsx` -- add render coverage proving assistant messages no longer show a references list if a UI test harness is introduced in scope

## Tasks & Acceptance

**Execution:**
- [ ] `components/pipeline/PipelineSteps.tsx` -- remove the assistant-only `References` block and any associated decorative chrome so the transcript shows the answer body only
- [ ] `components/pipeline/PipelineSteps.tsx` -- keep the existing `Save Full Response` action reachable after the cleanup without reintroducing citation noise
- [ ] `components/pipeline/MessageMarkdown.tsx` -- verify inline `#citation-*` links still resolve to `onCitationSelect` with no behavior regression
- [ ] `lib/chat/shared.ts` -- verify the current section-stripping logic still removes citation and YouTube URL sections from `cleanAnswer`; harden only if real backend variants require it
- [ ] `tests/chat/shared.test.ts` -- cover answer-only parsing and preserved citation extraction if a test harness is added in scope
- [ ] `tests/pipeline/message-rendering.test.tsx` -- cover answer-only assistant rendering and absence of the old references panel if a UI harness is added in scope

**Acceptance Criteria:**
- Given the backend returns an answer followed by citations and timestamped YouTube URLs, when the assistant message renders in chat, then only the answer section is visible in the transcript.
- Given the rendered answer contains inline citation numbers, when the user clicks one, then the existing citation modal opens with the cited excerpt and embedded YouTube video when a mapped URL exists.
- Given an assistant message has structured citations, when the transcript renders, then no standalone `References` heading or citation list appears below the message.
- Given a citation has no usable YouTube URL, when the user opens it from the answer, then the modal still shows the citation text without breaking the interaction.
- Given the user saves a full assistant response after this change, when the save action completes, then the notebook stores the answer-only content shown in chat rather than hidden citation/url appendix text.

## Spec Change Log

- Constrain extraction-chat transcript rendering to answer-only content while preserving citation review through the existing modal flow.

## Design Notes

The parser already separates `cleanAnswer` from citation metadata, so this change should stay render-focused. The cleanest implementation is to treat `message.content` as the only transcript payload and `message.citations` as hidden supporting data used by inline citation clicks and modal rendering.

This scope intentionally does not invent a new citation fallback UI for answers that arrive without inline citation markers. If product later wants citations discoverable in those cases, that should be a separate UX decision rather than sneaking the old references block back in.

## Verification

**Commands:**
- `npm run lint` -- expected: transcript cleanup and any parser assertions pass ESLint with no new issues
- `npm run build` -- expected: the app compiles successfully with unchanged chat data contracts

**Manual checks:**
- Ask a question that returns inline citation markers plus trailing citation and YouTube URL sections, then confirm the chat bubble shows only the answer prose
- Click multiple inline citation numbers in the same answer and confirm each opens the existing citation modal with the correct excerpt
- Open a citation with a mapped YouTube URL and confirm the modal still embeds the video and offers the external YouTube link
- Save a full assistant response after the cleanup and confirm the saved notebook entry does not include the hidden citation appendix
- Ask a question that returns no citations and confirm the assistant message still renders cleanly without empty reference chrome
