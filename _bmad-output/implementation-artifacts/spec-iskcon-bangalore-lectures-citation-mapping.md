---
title: 'ISKCON Bangalore Lectures Citation Mapping and Modal Presentation'
type: 'feature'
created: '2026-04-10'
status: 'proposed'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/implementation-artifacts/spec-chat-api-contract-normalization.md'
  - '_bmad-output/implementation-artifacts/spec-server-owned-multi-notebook-chat-fanout-streaming.md'
  - '_bmad-output/implementation-artifacts/1-7-multi-notebook-chat-stream-route.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** For the approved extraction target key `ISKCON Bangalore Lectures`, the backend notebook wrapper returns citations in a different shape from the appendix-oriented contract used elsewhere. Each `references[*].cited_text` string mixes `Themes`, `URL`, `Content-type`, `Audience`, and `Content` into one blob. The current generic normalizer therefore surfaces noisy metadata in the modal instead of the clean lecture source URL and excerpt content the user actually needs. The response can also be large because the backend may return far more references than the answer actually cites. The transcript already expands range citations into per-number anchors, but the lecture-target mapping and pruning rules are not yet explicit.

**Approach:** Keep range-citation expansion in the browser, and add a target-aware server normalization rule for `ISKCON Bangalore Lectures`. For that target only, first resolve all cited citation numbers from the answer body, then prune the backend `references` array to only those cited numbers, normalize each kept citation by `references[*].citation_number`, parse only `URL:` and `Content:` from the reference payload, reuse the existing `Citation` shape with `url` plus content-only `text`, and update the citation modal to display `URL:` first and `Content:` second while preserving the current click, open, embed, and save behavior.

## Boundaries & Constraints

**Always:** Apply the special parser only when the target key is exactly `ISKCON Bangalore Lectures`; continue resolving inline ranges like `[2, 7-10]` into individual clickable citation numbers; derive a cited-number set from the answer before processing references; prune uncited lecture references at the server boundary; map each resolved number to one normalized reference by `citation_number`; retain only `URL:` and `Content:` from lecture references; keep normalization server-owned; keep non-lecture targets on the current generic path unless separately specified.

**Ask First:** Changing the backend wrapper payload; exposing `Themes`, `Audience`, or `Content-type` in the UI; widening the browser citation model with extra fields unless the current shape proves insufficient during implementation; changing citation transcript layout beyond what is needed for per-number interaction and modal ordering.

**Never:** Parse the raw lecture citation blob in JSX; depend on `references` array order instead of `citation_number`; pass the full raw lecture `references` array to the browser or persistence once cited-number pruning is available; show the full `cited_text` metadata block in the modal; regress the current citation modal interaction for non-lecture targets.

## Existing Sample Contract

The supplied lecture-target sample is structurally consistent:

```json
{
  "citation_number": 7,
  "cited_text": "Themes: ... URL: https://youtu.be/yp6RiH3xOYA?t=1128 Content-type: analogy Audience: ... Content: And the fifth quality of the pencil is ..."
}
```

Observed invariants from the provided sample response:

- Every reference includes a numeric `citation_number`
- Every reference includes `URL:` inside `cited_text`
- Every reference includes `Content:` inside `cited_text`
- The answer body uses inline single and range citations such as `[1-3]` and `[2, 7-10]`

## Proposed Normalized Citation Contract

Do not widen the app-facing `Citation` type for this change. Normalize lecture citations into the existing shape:

```json
{
  "number": 7,
  "url": "https://youtu.be/yp6RiH3xOYA?t=1128",
  "text": "And the fifth quality of the pencil is, it is conscious that everything will leave a mark. ..."
}
```

Rules for `ISKCON Bangalore Lectures`:

- `number` comes from `references[*].citation_number`
- `url` is parsed from the first `URL:` segment in `cited_text`, with existing explicit URL fields (`url`, `source_url`, `timestamped_url`, `link`) still allowed to win if present later
- `text` is the trimmed substring after `Content:`
- `Themes:`, `Content-type:`, and `Audience:` are discarded
- One normalized citation exists per citation number; if duplicates appear, keep the first structurally valid reference for deterministic UI behavior

Rules for other targets:

- Preserve the current generic normalizer behavior
- Preserve current appendix-derived URL mapping and current text extraction rules

## Citation Resolution Rules

### Answer Rendering

Inline range citations remain a browser concern through the existing answer-formatting helper. The required behavior is:

- `[2, 7-10]` resolves into individually clickable citation links for `2`, `7`, `8`, `9`, and `10`
- Each resolved link targets `#citation-{number}`
- Each click maps to the normalized citation whose `number` equals that resolved citation number

This story does not require a new link-expansion algorithm if the current helper already satisfies that contract.

### Reference Mapping

For the lecture target:

1. Normalize the backend response at the server boundary with knowledge of the target key.
2. Parse the answer body and expand all cited ranges into a set of concrete citation numbers.
3. Filter `references[*]` to only entries whose `citation_number` is present in that cited-number set.
4. Build a per-number citation map from the filtered references.
5. Parse the URL and content payload for each kept reference.
6. Return only lecture citations that have a valid positive citation number and at least one usable display field (`url` or `text`).
7. Let the existing browser citation selection continue finding citations by `number`.

### Retrieval and Storage Optimization

Optimization rules for the lecture target:

- Uncited references must be discarded during server normalization
- The browser-facing response must include only the reduced normalized `citations` array, not the raw backend `references`
- Persisted assistant messages should keep only the normalized cited citation set already used by the transcript
- The system should not retain unused lecture citation blobs in browser state once normalization is complete

This keeps large backend payloads from expanding transcript state, persistence size, and modal lookup cost when the answer only cites a small subset of returned references.

## Modal Presentation Contract

When a lecture citation is clicked, the modal should render fields in this order:

1. `URL:` followed by the normalized citation URL
2. `Content:` followed by the normalized citation text
3. Existing source actions and media affordances derived from `citation.url`

Presentation rules:

- Keep the current citation click interaction and modal entry point
- Keep the current external-link behavior
- Continue to support YouTube preview behavior when `citation.url` is a YouTube URL
- Do not render `Themes`, `Audience`, or `Content-type`

A generic modal ordering update is acceptable if it does not regress other targets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lecture reference with `URL:` and `Content:` | `target.key` is `ISKCON Bangalore Lectures`; `cited_text` contains both segments | `citations[number].url` contains the parsed URL and `citations[number].text` contains only the parsed content | None |
| Lecture answer contains range citations | Answer includes `[2, 7-10]` | Browser renders five individually clickable citation anchors that map by `number` | None |
| Large lecture response with many uncited references | Answer cites a small subset of the returned `references` array | Server keeps only references whose `citation_number` appears in the answer and drops the rest before returning normalized data | None |
| Lecture reference lacks `Content:` | `citation_number` exists but `cited_text` omits `Content:` unexpectedly | Fallback to the generic text extraction path or empty string while preserving the usable URL | Do not fail the whole response |
| Lecture reference lacks `URL:` | `citation_number` exists but `cited_text` omits `URL:` unexpectedly | Fallback to explicit reference URL fields or generic URL extraction if available | Do not fail the whole response |
| Non-lecture target response | `target.key` is any approved target other than `ISKCON Bangalore Lectures` | Current normalization and modal data continue unchanged | No new target-specific parser runs |
| Duplicate lecture citation numbers | Multiple references claim the same `citation_number` | One deterministic citation survives for that number | Ignore later duplicates instead of surfacing multiple modal matches |

</frozen-after-approval>

## Code Map

- `lib/chat/normalize.ts` -- add a target-aware lecture citation extractor and keep the generic normalizer as the default path
- `lib/chat/server.ts` -- pass target context into normalization where the target key is known
- `lib/chat/stream.ts` -- preserve per-target streaming while using the target-aware normalized result
- `lib/chat/targets.ts` -- export or centralize the approved `ISKCON Bangalore Lectures` key so parsing logic does not rely on duplicated string literals
- `lib/chat/shared.ts` -- keep the current `Citation` contract and answer-range linkification helper unless a spacing adjustment is explicitly accepted
- `components/pipeline/PipelineModals.tsx` -- reorder citation modal presentation to show `URL` before `Content`
- `components/pipeline/MessageMarkdown.tsx` -- keep citation click mapping by `number`; no lecture-specific parsing here
- `tests/chat/normalize.test.ts` -- cover lecture-target parsing, cited-number pruning, fallback behavior, and citation-number mapping
- `tests/chat/shared.test.ts` -- keep or expand range-citation expansion coverage for `[2, 7-10]`
- `tests/chat/stream-route.test.ts` or `tests/chat/server.test.ts` -- cover target-aware normalization entry points if function signatures change

## Tasks & Acceptance

**Execution:**
- [ ] Add a target-aware citation normalization branch for `ISKCON Bangalore Lectures`
- [ ] Extract the cited-number set from `answerBody` before lecture reference normalization
- [ ] Prune uncited lecture references at the server boundary so only cited references remain in the normalized result
- [ ] Parse `URL:` and `Content:` from lecture `references[*].cited_text`
- [ ] Map lecture citations by `citation_number`, not by array position or answer order
- [ ] Preserve the existing `Citation` shape by storing lecture content in `text` and lecture URL in `url`
- [ ] Keep current range-citation expansion and verify it supports individually clickable citation numbers for lecture answers
- [ ] Update the citation modal to display `URL:` first and `Content:` second
- [ ] Add regression coverage for lecture-target parsing and non-lecture non-regression

**Acceptance Criteria:**
- Given a streamed result for target key `ISKCON Bangalore Lectures`, when normalization runs, then each citation is built from `references[*].citation_number` and not from appendix ordering.
- Given a lecture response whose `references` array is much larger than the answer’s cited-number set, when normalization runs, then uncited references are removed before the normalized result reaches the browser or persistence.
- Given a lecture reference with `URL:` and `Content:` in `cited_text`, when the citation modal opens, then it shows the normalized URL first and the normalized content second.
- Given an answer containing `[2, 7-10]`, when the browser renders the assistant answer, then each resolved citation number can be clicked independently and opens the matching citation entry.
- Given a non-lecture target result, when normalization runs, then the current citation behavior remains unchanged.
- Given an unexpectedly malformed lecture reference missing one of the expected markers, when normalization runs, then the usable part of the citation still appears without failing the full answer.

## Spec Change Log

- Add a target-aware citation parser for the approved `ISKCON Bangalore Lectures` extraction target.
- Keep the existing browser citation model unchanged while improving lecture-target citation cleanliness.
- Update modal presentation order to show source URL before content.

## Design Notes

The cleanest architectural seam is still the server normalization boundary introduced in the earlier chat contract work. The lecture payload is not really a new UI model; it is a different backend encoding of the same citation intent. That means we should adapt it before the browser sees it, rather than teaching the transcript and modal components to parse target-specific blobs.

Keeping the `Citation` shape stable is an important constraint. The frontend already knows how to open a citation by number, render a URL-derived affordance, and save the text content. If we normalize the lecture payload into `url` plus content-only `text`, we can satisfy the new behavior without widening persistence or rewriting message handling.

Because lecture responses can be large, the cited-number pruning step is part of the architecture, not a later optimization. The answer already tells us which citations matter. Using that set to discard uncited references keeps the browser contract small, the persisted transcript lean, and the modal lookup path proportional to what the user can actually click.

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Ask a prompt that returns `ISKCON Bangalore Lectures` results with range citations such as `[2, 7-10]` and confirm each resolved citation opens independently
- Ask a prompt whose lecture response contains many more returned references than cited numbers and confirm only cited references are present in the normalized payload and persisted message state
- Click multiple lecture citations and confirm the modal shows `URL:` first and `Content:` second
- Confirm the lecture modal does not display `Themes`, `Audience`, or `Content-type`
- Confirm a non-lecture target still opens citations with its current behavior
- Confirm the save-citation action still stores the normalized lecture content
