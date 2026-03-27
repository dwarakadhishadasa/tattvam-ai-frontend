# Data Model: Tattvam AI Lecture Synthesis Workflow

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-03-26

## Workflow State Model

The current implementation is a single-route state machine owned by `app/page.tsx`.

| Field | Type | Purpose |
|-------|------|---------|
| `activeStep` | `0 | 1 | 2 | 3` | Current workflow stage: context, extraction, synthesis, presentation |
| `currentSessionId` | `string` | Browser-local identifier for the active session snapshot |
| `isSettingsOpen` | `boolean` | Controls the visual settings modal |
| `isContextModalOpen` | `boolean` | Controls the reference/context modal |
| `isHistoryOpen` | `boolean` | Controls the session-history modal |
| `isFullscreen` | `boolean` | Tracks fullscreen presentation mode |
| `currentSlideIndex` | `number` | Active slide during fullscreen presentation |

## Entities

### 1. Talk Context Selection

Represents the pre-extraction setup that determines what kind of lecture the user is
working on.

| Field | Type | Notes |
|-------|------|-------|
| `talkType` | `'verse' | 'general' | 'festival' | 'yatra' | null` | Determines which input surface and API path are used |
| `verseDetails.book` | `string` | Current options are `bg` and `sb` |
| `verseDetails.verse` | `string` | Dot-delimited verse address such as `1.1` or `1.1.1` |
| `generalTopic` | `string` | User-entered topic for general lectures |
| `festivalName` | `string` | User-entered festival name |
| `yatraLocation` | `string` | User-entered location |
| `extractedVerseData` | `VerseData | null` | Normalized context object used downstream regardless of talk type |

### 2. VerseData

Normalized context payload used by extraction regardless of how context was created.

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string` | Heading displayed in extraction and history |
| `verseText` | `string` | Sanskrit/transliteration text when present |
| `translation` | `string` | Translation or overview |
| `purport` | `string` | Purport or generated key points |
| `url` | `string` | Source URL for verse contexts; empty for generated lecture contexts |

### 3. Conversation Message

Represents one entry in the extraction conversation.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Timestamp-derived identifier |
| `role` | `'user' | 'assistant'` | Message author |
| `content` | `string` | Markdown-capable text rendered in chat |
| `citations` | `Citation[] | undefined` | Optional structured citations attached to assistant messages |

### 4. Citation

Represents a reviewable source excerpt linked to an assistant answer.

| Field | Type | Notes |
|-------|------|-------|
| `number` | `number` | Display/reference number |
| `text` | `string` | Saved or displayed cited excerpt |
| `url` | `string` | Optional YouTube URL with timestamp |

### 5. Saved Snippet

Represents notebook content curated by the user for synthesis.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Timestamp-derived identifier |
| `content` | `string` | Full assistant response, cited excerpt, or saved context block |

**Validation rules**:
- Snippets are deduplicated by exact `content` equality.
- Users can remove snippets individually from extraction or synthesis views.

### 6. Notebook Workspace

Represents the compiled synthesis result used to unlock presentation mode.

| Field | Type | Notes |
|-------|------|-------|
| `notebookName` | `string` | User-entered or defaulted display name |
| `generatedNotebookId` | `string | null` | Synthetic `nb_<timestamp>` identifier created after compilation |
| `isGeneratingNotebook` | `boolean` | Loading state during simulated compile |

**Business rules**:
- If `notebookName` is blank during compile, it is replaced with `Untitled Workspace`.
- Synthesis cannot start unless at least one snippet is saved.

### 7. Visual Style Profile

Represents the browser-persisted settings that drive slide generation.

| Field | Type | Notes |
|-------|------|-------|
| `lectureDuration` | `number` | Used for content sufficiency estimation |
| `slideImage` | `string | null` | Uploaded reference slide stored as a data URL |
| `extractedStyle` | `string` | Editable prompt derived from uploaded image or manual entry |
| `isGeneratingSlides` | `boolean` | Loading state for slide generation |

**Validation rules**:
- Only one reference image is accepted in the settings modal.
- Slide generation requires both `generatedNotebookId` and non-empty `extractedStyle`.

### 8. Generated Slide Deck

Represents the presentation output currently rendered inside the app.

| Field | Type | Notes |
|-------|------|-------|
| `generatedSlides` | `string` | Raw markdown deck returned from Gemini |
| `slides[]` | `string[]` (derived) | Split from `generatedSlides` on `---` separators |
| `currentSlideIndex` | `number` | Active fullscreen slide |

**Rendering rules**:
- Each non-empty segment separated by `---` becomes one slide card.
- Fullscreen presentation resets `currentSlideIndex` to `0` when fullscreen exits.
- Keyboard controls while fullscreen is active: `ArrowRight` or `Space` advances,
  `ArrowLeft` goes back.

### 9. Session Snapshot

Represents a browser-local saved session for history and resume.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Session identifier |
| `title` | `string` | Derived title based on context or first meaningful content |
| `updatedAt` | `number` | Epoch timestamp |
| `state.activeStep` | `0 | 1 | 2 | 3` | Last saved stage |
| `state.talkType` | `TalkType` | Last selected talk type |
| `state.verseDetails` | `{ book: string; verse: string }` | Last verse inputs |
| `state.generalTopic` | `string` | Saved general topic |
| `state.festivalName` | `string` | Saved festival name |
| `state.yatraLocation` | `string` | Saved yatra location |
| `state.extractedVerseData` | `VerseData | null` | Saved normalized context |
| `state.messages` | `Message[]` | Saved conversation |
| `state.savedSnippets` | `SavedSnippet[]` | Saved notebook content |
| `state.notebookName` | `string` | Saved notebook label |
| `state.generatedNotebookId` | `string | null` | Saved compile result |
| `state.generatedSlides` | `string` | Saved slide deck markdown |

## Derived Rules and Thresholds

| Rule | Current Implementation |
|------|------------------------|
| Step 1 accessibility | Requires `extractedVerseData` |
| Step 2 accessibility | Requires `savedSnippets.length > 0` |
| Step 3 accessibility | Requires `generatedNotebookId` |
| Content sufficiency threshold | `saved word count >= lectureDuration * 140` |
| Welcome state | Messages initialize with one assistant welcome message |
| Citation shortcut | Prompts containing `"envy"` return a canned citation-rich response |
| Slide deck regeneration | Clearing `generatedSlides` returns the UI to pre-generation state |

## State Transitions

### Core workflow

1. `activeStep = 0` and context is empty.
2. User selects a talk type and fetches context.
3. Successful context fetch sets `extractedVerseData` and moves to `activeStep = 1`.
4. User chats, reviews citations, and saves snippets.
5. When snippets exist, synthesis becomes available and `activeStep` can move to `2`.
6. Compilation fabricates `generatedNotebookId` and advances to `activeStep = 3`.
7. Slide generation produces `generatedSlides`, enabling preview and fullscreen presentation.

### Adjacent transitions

1. Saving or changing meaningful state updates the current session snapshot in
   `tattvam_sessions`.
2. Loading a past session restores all saved state fields.
3. Starting a new session resets workflow state but preserves cached slide settings
   unless the user clears visual cache.

## Out-of-Spec but Implemented Entities

The following are present in the implementation even though the current business
spec focuses mostly on extraction, synthesis, and presentation:

- context selection before extraction
- browser-local session history and resume
- session title derivation rules
- unused async slide-task route artifacts

Future planning should treat these as real implementation dependencies even when
they are not yet first-class product requirements.
