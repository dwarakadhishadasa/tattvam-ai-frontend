---
title: 'Extraction Notebook Source Text Seeding'
type: 'feature'
created: '2026-03-27'
status: 'proposed'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/implementation-artifacts/1-3-extraction-notebook-workspace.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The notebook-creation handoff can now produce a real notebook ID, but the notebook is still empty. That leaves the next slide-generation stages with an addressable notebook that does not yet contain the Extraction content the user curated.

**Approach:** Immediately after `POST /v1/notebooks` succeeds, the local server boundary should seed that notebook with one text source using `POST /v1/notebooks/{notebook_id}/sources/text`. The browser should continue making a single local request, while the Next.js route owns the two-step backend choreography and uses the Extraction-phase compiled content as the source text payload.

## Boundaries & Constraints

**Always:** Keep the browser talking only to a local Next.js route; call `sources/text` only after notebook creation succeeds; map the source `content` from the saved Extraction notebook material already compiled for slide generation; use the edited working copy of saved entries, not immutable original source text.

**Ask First:** Splitting the handoff into two browser-visible requests; uploading every saved snippet as a separate backend source; introducing a second content-compilation rule that diverges from the current `buildNotebookCompileSource(savedSnippets)` helper; auto-advancing to Presentation when notebook creation succeeds but source seeding fails.

**Never:** Advance to Presentation with an empty backend notebook when the intended source upload failed; make the client own backend sequencing or snake_case response handling; derive source text from stale generated slides instead of current Extraction notebook content.

## Proposed Contract

### Upstream Create-Then-Seed Flow

1. `POST /v1/notebooks`
2. On success, `POST /v1/notebooks/{notebook_id}/sources/text`

Swagger confirms the text-source request schema is:

```http
POST /v1/notebooks/{notebook_id}/sources/text
Content-Type: application/json
```

Request body:

```json
{
  "title": "Extraction Notes",
  "content": "Saved response 1\n\nSaved response 2"
}
```

The `SourceAddTextReq` schema requires:

- `title: string`
- `content: string`

The swagger response schema for `sources/text` is intentionally opaque, so the local route should treat a successful upstream `2xx` response as completion and should not couple the client contract to the backend's raw source payload shape.

### Local App Contract

The browser-facing route should expand from notebook-title-only input to an orchestration payload:

```json
{
  "title": "Untitled Workspace",
  "sourceTitle": "Extraction Notes",
  "sourceText": "Saved response 1\n\nSaved response 2"
}
```

Recommended defaults:

- `title`: existing notebook-title behavior, defaulting to `Untitled Workspace`
- `sourceTitle`: default to `Extraction Notes` when not explicitly supplied

Recommended response:

```json
{
  "ok": true,
  "notebook": {
    "id": "87e2c32e-6ca4-4ed7-8268-4905b50469c0",
    "title": "Untitled Workspace",
    "createdAt": null,
    "sourcesCount": 0,
    "isOwner": true
  }
}
```

The client still only needs the normalized notebook summary. Source-upload details remain server-owned unless a later UX explicitly needs them.

## Source Text Mapping

The source text should reuse the existing Extraction compile helper so notebook seeding and slide generation stay aligned:

```ts
buildNotebookCompileSource(savedSnippets)
```

Mapping rules:

- Concatenate the saved Extraction notebook entries in their current order.
- Use the editable `content` field from each saved snippet, not the immutable `sourceContent`.
- Separate entries with `\n\n`.
- Reject a create-and-seed request if the final `sourceText.trim()` is empty.

## User Flow

1. The user saves or edits content in the Extraction notebook workspace.
2. The user clicks `Generate Slides`.
3. The client derives `sourceText` by concatenating the saved Extraction content.
4. The client posts `{ title, sourceTitle, sourceText }` to `/api/notebooks`.
5. The local route creates the notebook through `POST /v1/notebooks`.
6. The local route seeds the newly created notebook through `POST /v1/notebooks/{notebook_id}/sources/text`.
7. Only after both steps succeed does the route return success and allow the client to advance to Presentation.

## Failure Semantics

- If notebook creation fails, return the existing creation error and keep Extraction active.
- If notebook creation succeeds but text-source seeding fails, return an error for the overall handoff and keep Extraction active.
- Do not fabricate a successful Presentation transition from a notebook that was created but never seeded with Extraction content.

## Code Map

- `app/api/notebooks/route.ts` -- expand the request contract and orchestrate notebook creation plus source-text seeding as one server-owned handoff
- `lib/notebooks/server.ts` -- add a backend helper for `POST /v1/notebooks/{notebook_id}/sources/text`
- `lib/notebooks/shared.ts` -- add request/validation helpers for the expanded local route payload if needed
- `components/pipeline/PipelinePageClient.tsx` -- send `sourceText` and optional `sourceTitle` with the existing `Generate Slides` action
- `components/pipeline/utils.ts` -- remain the source of truth for compiled Extraction notebook text via `buildNotebookCompileSource`
- `tests/notebooks/server.test.ts` -- cover the new text-source transport helper and failure classification
- `tests/notebooks/shared.test.ts` -- cover the expanded local-route request validation helpers if introduced

## Tasks & Acceptance

**Execution:**
- [ ] Expand the local `/api/notebooks` request body to accept `sourceText` and optional `sourceTitle`.
- [ ] Add a notebook backend helper for `POST /v1/notebooks/{notebook_id}/sources/text`.
- [ ] Update the `/api/notebooks` route so it creates the notebook first and seeds text only after creation succeeds.
- [ ] Reuse `buildNotebookCompileSource(savedSnippets)` when deriving the source text from the Extraction phase.
- [ ] Default `sourceTitle` to `Extraction Notes` when the client does not provide one.
- [ ] Fail the handoff if source-text seeding fails, even if notebook creation succeeded.
- [ ] Add focused tests for the new backend helper and orchestration error paths.

**Acceptance Criteria:**
- Given the user clicks `Generate Slides` with saved Extraction content, when notebook creation succeeds, then the app immediately sends one concatenated text source to `POST /v1/notebooks/{notebook_id}/sources/text`.
- Given the saved Extraction content contains edited notebook entries, when source text is built, then the uploaded `content` uses the edited working copy and not the immutable original source text.
- Given the user leaves the source title unspecified, when the route seeds the notebook, then it uses the default title `Extraction Notes`.
- Given notebook creation succeeds but source-text seeding fails, when the handoff completes, then the client remains in Extraction and does not treat the notebook as presentation-ready.
- Given the current saved Extraction content compiles to blank or whitespace-only text, when the user clicks `Generate Slides`, then the route rejects the request instead of creating a notebook with an empty text source.

</frozen-after-approval>

## Design Notes

The important architectural choice here is where the sequence lives. Keeping create-then-seed inside the local route preserves one browser action for one user intent and prevents the client from becoming a small orchestration engine for backend workflow. That is the right boundary for a flow that now depends on multiple backend calls but still represents one product action: "prepare this notebook for slide generation."

Reusing `buildNotebookCompileSource(savedSnippets)` is equally important. It keeps notebook seeding aligned with the same Extraction content that slide generation already consumes, which avoids drift between "what we uploaded to the notebook backend" and "what we used for deck generation."

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Save multiple notebook entries in Extraction, click `Generate Slides`, and confirm the created notebook receives one text source composed from the concatenated saved content.
- Edit a saved Extraction entry, click `Generate Slides`, and confirm the uploaded source text reflects the edited version.
- Omit `sourceTitle`, click `Generate Slides`, and confirm the backend receives `Extraction Notes`.
- Simulate a `sources/text` backend failure after notebook creation and confirm the UI stays in Extraction rather than advancing.
