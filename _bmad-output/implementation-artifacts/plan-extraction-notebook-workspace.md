---
title: 'Implementation Plan: Extraction Notebook Workspace'
type: 'implementation-plan'
created: '2026-03-27'
status: 'done'
context:
  - '_bmad-output/planning-artifacts/spec.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

## Goal

Replace the visible `Synthesis` step with a notebook workspace inside `Extraction`, while keeping notebook compilation and readiness feedback intact. Support simple editing of saved responses without adding compare views, tags, pinning, reorder flows, or migration-specific behavior.

## Target Workflow

1. User enters context and reaches extraction.
2. User chats, reviews citations, and saves full responses or excerpts.
3. Saved items appear in the notebook workspace within extraction.
4. User can open a saved item, edit its working content, and return to chat.
5. Extraction shows:
   - `canCompile`: whether at least one notebook entry exists
   - `notebookReadiness`: whether current saved content appears sufficient for the selected lecture duration
6. User optionally names the workspace and compiles directly from extraction.
7. Successful compile advances to presentation.

## Scope

### In Scope

- Remove the standalone synthesis stage from the UI flow
- Add notebook review and simple edit behavior to extraction
- Preserve original saved source content while allowing edited working content
- Keep readiness feedback in extraction
- Keep compile action in extraction
- Update persistence and session restore for notebook edits

### Out of Scope

- Compare-original versus edited split views
- Tags, pinning, reorder, advanced organization
- Migration-specific UX or dedicated migration logic for old synthesis sessions
- Server-side notebook persistence

## Implementation Changes

### 1. Types and Derived State

Update [components/pipeline/types.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/types.ts):

- Change `PipelineStep` from `0 | 1 | 2 | 3` to `0 | 1 | 2`
- Expand `SavedSnippet` into a notebook-entry shape with:
  - `id`
  - `sourceMessageId`
  - `sourceType`
  - `sourceContent`
  - `content`
  - `isEdited`
  - `updatedAt`
- Add derived concepts for:
  - `canCompile`
  - `notebookReadiness`

### 2. Pipeline State and Persistence

Update [components/pipeline/PipelinePageClient.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelinePageClient.tsx):

- Remove `SynthesisStep` rendering and navigation
- Keep extraction as the main working screen
- Add notebook-focused state:
  - `activeNotebookEntryId`
- Update save behavior so new entries store both `sourceContent` and editable `content`
- Add edit handlers:
  - open notebook entry
  - update notebook entry content
  - close editor / clear active entry
- Compute:
  - `canCompile = savedSnippets.length > 0`
  - `notebookReadiness = wordCount >= requiredWordCount ? "ready" : "insufficient"`
- Keep compile logic, but trigger it from extraction instead of synthesis
- Keep persistence wired through the existing session shape, storing notebook edits

### 3. Extraction UI Restructure

Update [components/pipeline/PipelineSteps.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineSteps.tsx):

- Extend `ExtractionStep` to include:
  - chat column
  - notebook list/sidebar
  - simple notebook editor/detail surface
- Replace the current “Proceed to Synthesis” footer action with extraction-local compile controls
- Show:
  - saved response count
  - readiness indicator
  - workspace name input
  - compile button
- Notebook item behavior:
  - click to open
  - edit text in place or in a simple editor panel
  - remove entry
- Keep the UI simple:
  - no compare mode
  - no tags/pins/reorder

### 4. Presentation Gate Adjustments

Update [components/pipeline/PipelineSidebar.tsx](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/PipelineSidebar.tsx):

- Reflect the new three-stage flow:
  - Context
  - Extraction
  - Presentation
- Update step gating so presentation unlock depends on `generatedNotebookId`

### 5. Utilities and Session Helpers

Update [components/pipeline/utils.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/utils.ts):

- Update empty-state creators for the new step model
- Update snapshot creation and restore helpers for the notebook-entry shape
- Ensure meaningful-session checks include notebook edits
- Keep word-count estimation based on edited notebook `content`

### 6. Optional Persistence Type Alignment

If the repo’s newer persistence modules are the active source of truth, align:

- [components/pipeline/types.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/components/pipeline/types.ts)
- [lib/persistence/schema.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/persistence/schema.ts)

So persisted session validation accepts the notebook-entry structure and the reduced step count.

## Suggested Delivery Order

1. Update shared types and helpers.
2. Update `PipelinePageClient` state, save/edit handlers, and compile flow.
3. Refactor `ExtractionStep` UI to absorb notebook review/editing and compile controls.
4. Remove `SynthesisStep` usage and update sidebar navigation.
5. Align persistence/session restore behavior.
6. Run lint/build and manual workflow checks.

## Verification Plan

### Commands

- `npm run lint`
- `npm run build`

### Manual Checks

1. Start from a fresh session, fetch context, and confirm extraction still loads normally.
2. Save a full assistant response and confirm it appears in the notebook workspace.
3. Save a citation excerpt and confirm duplicate save prevention still works.
4. Open a notebook entry, edit its content, and confirm the edited version persists in session history.
5. Confirm compile remains disabled when no notebook entries exist.
6. Confirm readiness messaging changes as content grows versus lecture duration.
7. Compile directly from extraction and confirm presentation opens successfully.
8. Reload the session and confirm notebook edits are restored.

## Risks

- Extraction could become visually crowded if the notebook editor is not carefully sized.
- Persistence may regress if old assumptions about `savedSnippets.content` remain in helpers.
- Compile behavior may accidentally use raw source content unless all generation inputs are switched to edited notebook content.

## Open Implementation Decisions

- Whether the notebook editor should be inline inside the list card or shown in a dedicated side panel
- Whether workspace naming should live above the notebook list or inside a compile footer
- Whether closing the notebook editor should preserve selection or clear `activeNotebookEntryId`
