---
title: 'Chat API Contract Normalization'
type: 'feature'
created: '2026-03-27'
status: 'ready-for-dev'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/spec.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/implementation-artifacts/spec-chat-answer-only-rendering.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** `/api/chat` currently passes the downstream notebook response to the browser with minimal shaping. The downstream payload overloads one `answer` field with both the visible assistant prose and a trailing citation appendix of raw YouTube URLs, while separate `references` entries contain excerpt text and citation numbers. That forces the frontend to infer semantic structure from a provider-shaped blob and makes the UI, persistence layer, and future backend changes more fragile than they need to be.

**Approach:** Move the normalization contract to the Next.js server boundary. The route handler should transform the downstream payload into explicit app-facing fields such as `answerBody`, `citations`, and conversation metadata. The browser should render only `answerBody` and use `citations` for modal interactions, while the server retains responsibility for splitting the appendix, mapping citation numbers to URLs, and insulating the client from dynamic section labels or provider-specific formatting.

## Boundaries & Constraints

**Always:** Normalize downstream chat payloads in a server-owned module before returning them from `/api/chat`; return explicit fields for answer content, structured citations, and useful conversation metadata; keep the client render path and persistence model consuming the normalized contract; preserve the existing citation modal behavior and saved-snippet provenance.

**Ask First:** Returning the full raw downstream answer to the browser by default; adding new persistence fields solely for debug payloads; changing notebook save semantics; coupling the normalized contract to a backend-specific provider name or transport detail.

**Never:** Make the browser parse raw provider-shaped `answer` blobs as the primary contract; rely on dynamic heading text as the authoritative appendix boundary; require JSX or persisted session restore logic to own downstream semantic splitting once the route contract is in place.

## Proposed Contract

### Downstream Response Shape

The downstream service may continue returning a provider-shaped payload similar to:

```json
{
  "ok": true,
  "result": {
    "answer": "Visible prose ...\n\n***\n\n**Citations and Timestamped Sources:**\n\n[29] https://youtu.be/...",
    "conversation_id": "96c1873f-ebc7-4a9e-9391-0779708ff728",
    "turn_number": 1,
    "is_follow_up": false,
    "references": [
      {
        "citation_number": 1,
        "cited_text": "In the Bhagavad Gita, Krishna mentions ..."
      },
      {
        "citation_number": 2,
        "cited_text": "Now, there are two knowers of the field ..."
      }
    ]
  }
}
```

### Normalized `/api/chat` Response

The Next.js route should return an explicit app contract:

```json
{
  "ok": true,
  "result": {
    "answerBody": "Knower of the Field\nIn the *Bhagavad-gita* ...",
    "citations": [
      {
        "number": 1,
        "text": "In the Bhagavad Gita, Krishna mentions ...",
        "url": "https://youtu.be/BWV5fmmOZaQ?t=185"
      },
      {
        "number": 2,
        "text": "Now, there are two knowers of the field ...",
        "url": "https://youtu.be/Wzil0t4mVgo?t=460"
      }
    ],
    "conversationId": "96c1873f-ebc7-4a9e-9391-0779708ff728",
    "turnNumber": 1,
    "isFollowUp": false
  }
}
```

### Server-Side Normalization Rules

- Split the downstream `answer` into `answerBody` and trailing appendix using a structural tail-analysis strategy rather than heading-text equality.
- Build citation URLs by merging `references[*].citation_number` with appendix lines that match citation-list patterns such as `[29] https://...` or `29. [29] https://...`.
- Prefer explicit URL fields on a reference when the downstream service provides them later; use appendix mapping as the fallback for current payloads.
- Ignore appendix lines that do not map to a structured reference instead of exposing them to the UI.
- Preserve downstream conversation metadata when present because it can support follow-up chat later even if the current client does not yet use it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sample payload with prose + appendix + references | Downstream `answer` contains visible markdown prose followed by raw YouTube citation lines, and `references` carries excerpt text | `/api/chat` returns `answerBody`, `citations`, and conversation metadata as explicit fields | Client never receives the raw appendix as renderable content |
| Dynamic or missing appendix heading | Tail of `answer` is citation-shaped but the label text differs or is absent | Server still identifies and strips the appendix using structural trailing-block scoring | If the tail is ambiguous, prefer preserving prose over over-stripping |
| Reference has explicit media URL | A reference includes `url`, `source_url`, `timestamped_url`, or `link` | Server uses the explicit reference URL before appendix-derived mapping | Appendix parsing becomes a secondary fallback |
| Extra appendix URLs without matching structured reference | Appendix has URLs for citation numbers not represented in `references` | Server excludes unmapped items from `citations` returned to the client | No orphan URLs are rendered |
| No references array | Downstream response contains prose only or malformed reference metadata | Server returns `answerBody` with `citations: []` | The route stays successful if the answer body is usable |
| Malformed downstream payload | `ok` is false, `result.answer` is missing, or JSON is invalid | Route returns a clear error response instead of partial normalized data | Preserve current failure semantics and status handling |

</frozen-after-approval>

## Code Map

- `app/api/chat/route.ts` -- stop returning the raw downstream payload and return the normalized app contract
- `lib/chat/server.ts` -- continue transport ownership for the downstream call and host any transport-specific metadata handling if needed
- `lib/chat/normalize.ts` -- own structural appendix splitting, citation URL mapping, and contract normalization
- `lib/chat/shared.ts` -- host app-facing chat response types only; move downstream raw types out or clearly separate them from normalized route types
- `lib/chat/client.ts` -- fetch the normalized `/api/chat` response shape instead of the raw downstream contract
- `components/pipeline/PipelinePageClient.tsx` -- consume `answerBody` and `citations` directly and remove dependence on raw response parsing in the browser
- `hooks/useSessionPersistence.ts` -- keep restore-time sanitation temporarily as a backward-compatibility guard for already persisted assistant messages
- `tests/chat/shared.test.ts` and `tests/chat/normalize.test.ts` -- cover normalization helpers, structural appendix detection, and URL mapping from sample payloads

## Tasks & Acceptance

**Execution:**
- [ ] `lib/chat/normalize.ts` -- introduce a server-owned normalizer that converts the downstream response into `answerBody`, `citations`, and conversation metadata
- [ ] `lib/chat/normalize.ts` -- implement structural trailing-appendix detection based on citation-list and URL density rather than heading-label equality
- [ ] `lib/chat/normalize.ts` -- map `references[*].citation_number` to appendix URLs, preferring explicit reference URLs when present
- [ ] `app/api/chat/route.ts` -- return the normalized chat contract instead of the raw downstream payload
- [ ] `lib/chat/shared.ts` and `lib/chat/client.ts` -- separate downstream raw types from the browser-facing route contract and update fetch typing accordingly
- [ ] `components/pipeline/PipelinePageClient.tsx` -- remove client-side normalization of live responses and consume explicit `answerBody` plus `citations`
- [ ] `hooks/useSessionPersistence.ts` and restore helpers -- retain restore-time sanitation only as a compatibility layer for already persisted sessions created before the contract change
- [ ] `tests/chat/normalize.test.ts` -- add sample-payload coverage for appendix stripping, URL mapping, and ambiguous-tail safety
- [ ] `tests/chat/shared.test.ts` -- update existing assertions to verify the browser consumes normalized route data rather than raw downstream payloads

**Acceptance Criteria:**
- Given the sample downstream payload above, when `/api/chat` returns successfully, then the browser receives `answerBody` without the raw YouTube appendix and a `citations` array with the correct excerpt-to-URL mapping.
- Given the downstream appendix heading changes wording or is omitted, when the tail is still structurally citation-shaped, then the server normalizer still strips it from `answerBody`.
- Given a reference already includes an explicit media URL, when normalization runs, then that explicit URL wins over appendix-derived mapping.
- Given extra appendix URLs exist without matching structured references, when normalization runs, then those orphan URLs do not appear in the client-visible contract.
- Given an already persisted assistant message contains the old raw appendix, when that session is restored after the new server contract ships, then the compatibility layer still prevents raw URLs from reappearing in chat.

## Spec Change Log

- Move extraction-chat response normalization from the browser to the Next.js server boundary and define an explicit `/api/chat` app contract.

## Design Notes

The sample payload demonstrates why a BFF-style normalization layer is the durable fix. The downstream response mixes three concerns in one `answer` blob: visible prose, citation URL appendix, and provider formatting. The frontend only needs the visible prose and structured citations, so the server boundary should absorb the ambiguity once and publish a stable contract.

This plan intentionally keeps restore-time sanitation in place for older persisted sessions. That is a compatibility shim, not the new source of truth. Once older sessions age out or are migrated, the server-normalized contract should be the only live-response path the browser relies on.

If future backend work adds first-class fields such as `answer_body` and `citation_sources`, the normalizer should simplify to field remapping instead of heuristic appendix parsing. The client contract can remain stable through that backend evolution.

## Verification

**Commands:**
- `npm test` -- expected: normalization helpers, client typing, and compatibility shims pass regression coverage
- `npm run lint` -- expected: route, normalizer, and client updates pass lint with no new issues
- `npm run build` -- expected: the app compiles successfully with the new normalized `/api/chat` contract once unrelated route issues are resolved

**Manual checks:**
- Submit a prompt that returns the sample payload shape and confirm the browser receives and renders only `answerBody`
- Click inline citation numbers and confirm the citation modal still opens with the matching excerpt and embedded video
- Restore an older saved session created before the normalization change and confirm raw appendix URLs do not reappear in chat
- Temporarily alter or remove the appendix label in a sample fixture and confirm structural tail detection still strips the citation appendix
