---
title: 'Implementation Plan: Context Title Propagation Across Pipeline'
type: 'implementation-plan'
created: '2026-03-27'
status: 'proposed'
context:
  - '_bmad-output/implementation-artifacts/spec-context-title-propagation.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/project-context.md'
---

## Goal

Make the Context phase the single source of truth for lecture/workspace titles so the same title follows the user through Extraction, history, notebook creation, and Presentation.

## Target Workflow

1. The user completes the Context inputs.
2. The app derives one canonical title from those inputs.
3. Extraction immediately displays that title.
4. The same title becomes the default notebook title.
5. Notebook creation sends that same title to the backend.
6. Session history and Presentation reuse the same title.

## Scope

### In Scope

- Canonical title derivation from Context inputs
- Verse title mapping from book label plus verse number
- Raw topic/festival-name titles without prefixes
- Title propagation across extraction, history, notebook naming, and presentation copy

### Out of Scope

- A new manual title-editing control
- Source-title changes for notebook source-text seeding
- Renaming already created backend notebooks retroactively
- Product copy changes unrelated to lecture/workspace naming

## Implementation Changes

### 1. Shared Helper

Update [utils.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/utils.ts):

- Add a helper such as `deriveContextTitle(...)`
- Centralize the book-code-to-book-label mapping there
- Keep `getSessionTitle(...)` delegating to the same helper instead of reimplementing its own prefixes

### 2. Client State Hydration

Update [PipelinePageClient.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelinePageClient.tsx):

- Hydrate `notebookName` from the canonical context title when no user override exists
- Reuse that same value when calling `/api/notebooks`
- Preserve `Untitled Workspace` only as a defensive fallback when a valid context title is unavailable

### 3. UI Surface Alignment

Update [PipelineSteps.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineSteps.tsx):

- Replace `Lecture Context` fallback behavior with the canonical context title whenever it can be derived
- Reuse the canonical title in Presentation copy rather than depending on independently derived strings

### 4. Persistence and History

- Keep session persistence schema unchanged if the title remains derived from existing state
- Ensure session snapshots and history labels use the shared helper so restored sessions remain aligned with active sessions

### 5. Verification

Add or update focused tests for:

- Verse book-label mapping
- General/festival no-prefix title derivation
- Session title derivation delegation
- Notebook-title default selection from Context

## Suggested Delivery Order

1. Add the shared context-title helper.
2. Switch session title derivation to that helper.
3. Propagate the helper into Extraction and notebook naming.
4. Update Presentation copy to consume the same title.
5. Run lint, test, and build verification.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Verse flow: confirm `Bhagavad Gita <verse>` or `Srimad Bhagavatam <verse>` appears consistently across the pipeline.
2. General flow: confirm the raw topic text appears consistently with no `General:` prefix.
3. Festival flow: confirm the raw festival name appears consistently with no `Festival:` prefix.
4. Notebook creation: confirm the backend notebook title uses the Context-derived title instead of `Untitled Workspace`.

## Risks

- If a second surface keeps its own local title logic, the inconsistency will reappear quickly.
- If implementation stores a separate `contextTitle` field without a manual-override need, persistence complexity grows without much value.
- If verse titles continue depending on fetched reference data, Extraction can still render different titles before and after the fetch completes.
