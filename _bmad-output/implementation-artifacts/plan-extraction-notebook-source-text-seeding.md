---
title: 'Implementation Plan: Extraction Notebook Source Text Seeding'
type: 'implementation-plan'
created: '2026-03-27'
status: 'done'
context:
  - '_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/project-context.md'
---

## Goal

Extend the existing notebook-creation handoff so the newly created backend notebook is immediately seeded with one text source derived from the saved Extraction content.

## Target Workflow

1. The user saves and edits notebook entries in Extraction.
2. The user clicks `Generate Slides`.
3. The client derives `sourceText` from `buildNotebookCompileSource(savedSnippets)`.
4. The client posts `{ title, sourceTitle, sourceText }` to `/api/notebooks`.
5. The local route creates the notebook.
6. The local route posts the compiled text source to `/v1/notebooks/{notebook_id}/sources/text`.
7. The route returns success only if both calls succeed.
8. The client stores the notebook ID and advances to Presentation.

## Scope

### In Scope

- Expand the local notebook handoff request body with source-text fields
- Add a backend helper for `sources/text`
- Orchestrate notebook creation plus source-text seeding inside the local route
- Reuse the existing Extraction compile helper for source text mapping
- Add focused tests for transport and orchestration failures

### Out of Scope

- Creating multiple backend sources from individual snippets
- Source deletion or source-list UI
- Switching extraction chat to the newly created notebook
- Cleanup or reconciliation UX for partially created backend notebooks

## Implementation Changes

### 1. Local Route Contract Expansion

Update [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/notebooks/route.ts):

- Accept `title`, `sourceText`, and optional `sourceTitle`
- Validate `title.trim()` and `sourceText.trim()`
- Keep the existing normalized notebook summary response
- Treat notebook creation plus source upload as one server-owned handoff

### 2. Notebook Backend Helpers

Update [server.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/notebooks/server.ts):

- Add a helper for `POST /v1/notebooks/{notebook_id}/sources/text`
- Reuse the existing backend URL normalization and failure-classification pattern
- Preserve JSON transport ownership in one backend adapter module

### 3. Extraction Mapping

Update [PipelinePageClient.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelinePageClient.tsx):

- Build `sourceText` from `buildNotebookCompileSource(savedSnippets)`
- Send the expanded payload to `/api/notebooks`
- Continue preserving the existing notebook title fallback and Presentation step transition

Keep [utils.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/utils.ts) as the source of truth for the compiled Extraction text. Do not introduce a second string-assembly path in the client.

### 4. Failure Handling

- Preserve the current Extraction-side error feedback pattern
- If `sources/text` fails, surface the error and keep the user in Extraction
- Do not advance on partial success

### 5. Verification

Add or extend tests for:

- `requestNotebookTextSourceCreation(...)` success and failure wrapping
- Expanded `/api/notebooks` validation
- The create-then-seed orchestration path
- Reuse of `buildNotebookCompileSource(savedSnippets)` for `sourceText`

## Suggested Delivery Order

1. Add the `sources/text` backend helper.
2. Expand the local `/api/notebooks` route contract and orchestration.
3. Update the Extraction client payload.
4. Add tests for transport and orchestration errors.
5. Run lint, test, and build verification.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Save multiple Extraction notebook entries and confirm the created backend notebook receives one concatenated text source.
2. Edit a saved entry and confirm the uploaded source text uses the edited content.
3. Confirm `sourceTitle` defaults to `Extraction Notes`.
4. Simulate a `sources/text` failure and confirm Extraction does not advance.

## Risks

- If the client and backend use different content-compilation rules, the seeded notebook can drift from the slide-generation input.
- If create and seed remain separate browser actions, retry and failure handling become much harder to reason about.
- If source-text seeding fails after notebook creation, the backend can accumulate partially useful notebooks unless a later cleanup strategy is introduced.
