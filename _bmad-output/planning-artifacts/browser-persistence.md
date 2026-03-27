# Browser Persistence Contract

This document now distinguishes the shipped implementation from the approved
target architecture for browser persistence. The current implementation remains
documented for migration and backward compatibility, while the target
architecture records the persistence split that should guide follow-on
implementation.

## 1. Current Implementation Snapshot

The current frontend writes these keys to `localStorage`:

| Key | Type | Written By | Restored On Mount | Purpose |
|-----|------|------------|-------------------|---------|
| `slide_image_cache` | `string` data URL | `components/pipeline/PipelinePageClient.tsx` persistence effect | Yes | Persist uploaded reference slide |
| `slide_style_cache` | `string` | `components/pipeline/PipelinePageClient.tsx` persistence effect | Yes | Persist extracted or edited style prompt |
| `lecture_duration_cache` | `string` number | `components/pipeline/PipelinePageClient.tsx` persistence effect | Yes | Persist lecture duration |
| `tattvam_sessions` | `Session[]` JSON | `components/pipeline/PipelinePageClient.tsx` session autosave effect | Yes | Persist browser-local history and workflow state |

This implementation truth matters because migration code must continue to read it
defensively until the new architecture is shipped.

## 2. Approved Target Architecture

The approved persistence split is:

- `localStorage` keeps only tiny bootstrap values and lightweight session
  metadata.
- IndexedDB stores all full session bodies and visual payloads.

### 2.1 Approved `localStorage` Keys

| Key | Type | Purpose |
|-----|------|---------|
| `lecture_duration_cache` | `string` number | Restore the selected lecture duration quickly on boot |
| `tattvam_active_session_id` | `string` | Reopen the most recently active session |
| `tattvam_session_index` | `SessionIndexEntry[]` JSON | Render history quickly with only `id`, `title`, and `updatedAt` |

### 2.2 Session Index Shape

```json
[
  {
    "id": "1742971112345",
    "title": "Bhagavad-gita 1.1",
    "updatedAt": 1742971112345
  }
]
```

`localStorage` must not contain any full session body beyond this lightweight
index.

`localStorage` is advisory bootstrap metadata only. The source of truth for a full
session is the IndexedDB `sessions` store.

### 2.3 Approved IndexedDB Stores

Database name: `tattvam-pipeline`

| Store | Key | Value | Purpose |
|-------|-----|-------|---------|
| `sessions` | `id` | full session record | Persist the complete workflow state for a session |
| `settings` | string key | value record | Persist visual settings that are larger than a tiny primitive |

### 2.4 Full Session Body in IndexedDB

Each session record stored in IndexedDB may contain the full workflow payload:

```json
{
  "id": "1742971112345",
  "title": "Bhagavad-gita 1.1",
  "updatedAt": 1742971112345,
  "stateVersion": 2,
  "state": {
    "activeStep": 1,
    "talkType": "verse",
    "verseDetails": {
      "book": "bg",
      "verse": "1.1"
    },
    "generalTopic": "",
    "festivalName": "",
    "yatraLocation": "",
    "extractedVerseData": {
      "title": "Bhagavad-gita 1.1",
      "verseText": "dharma-ksetre...",
      "translation": "Dhritarashtra said...",
      "purport": "Purport text...",
      "url": "https://prabhupadabooks.com/bg/1/1"
    },
    "messages": [],
    "savedSnippets": [],
    "notebookName": "",
    "generatedNotebookId": null,
    "generatedSlides": ""
  }
}
```

The `settings` store should carry the remaining browser-persisted values that are
not intentionally kept in `localStorage`, including:

- extracted style prompt
- optional reference slide payload
- future visual settings larger than a tiny primitive

### 2.5 Save Rules

The pipeline client should not save a session until there is meaningful activity.
Autosave remains skipped when all of the following are true:

- `talkType` is empty
- `messages.length <= 1`
- `savedSnippets.length === 0`

Once meaningful state exists:

1. Save the full session body to IndexedDB.
2. Update `tattvam_session_index` in `localStorage` using only `id`, `title`, and
   `updatedAt`.
3. Update `tattvam_active_session_id` in `localStorage`.
4. Persist lecture duration to `lecture_duration_cache`.

This avoids rewriting the full session history blob in `localStorage` on every
change.

### 2.6 Restore Rules

On initial page load:

1. Read `lecture_duration_cache` from `localStorage`.
2. Read `tattvam_active_session_id` and `tattvam_session_index` from
   `localStorage`.
3. Load the corresponding full session body from IndexedDB if the active session
   exists.
4. Load visual settings such as extracted style and reference slide from
   IndexedDB.

If the active session id exists in `localStorage` but the IndexedDB session body is
missing or invalid:

- remove the stale index entry
- clear the active session pointer
- try the most recent remaining valid session from the lightweight index
- if no valid session remains, start a fresh in-memory session without crashing
  the page
- show a visible recovery message instead of silently falling back

If visual settings such as extracted style or reference slide data are missing:

- keep the rest of the workflow usable
- restore only valid settings
- disable style-dependent presentation actions with an explicit explanation rather
  than a vague failure

### 2.7 Clear and Reset Behavior

#### Start New Session

Resets in memory:

- workflow state
- extracted context
- chat messages
- saved snippets
- notebook state
- generated slides

Does not clear:

- `lecture_duration_cache`
- `tattvam_session_index`
- IndexedDB session history
- IndexedDB visual settings

#### Clear Visual Cache

Resets in component state:

- reference slide
- extracted style prompt

Persistence side effect removes:

- the relevant visual-setting records from IndexedDB

Does not remove:

- `lecture_duration_cache`
- `tattvam_session_index`
- full session records in IndexedDB

## 3. Migration and Compatibility Rules

The migration path from the current implementation should be:

1. Read legacy `tattvam_sessions` with defensive parsing.
2. For each valid legacy session, write the full body into IndexedDB.
3. Derive `tattvam_session_index` from the migrated sessions using only `id`,
   `title`, and `updatedAt`.
4. Move `slide_style_cache` and `slide_image_cache` into the IndexedDB `settings`
   store.
5. Keep `lecture_duration_cache` in `localStorage`.
6. Publish the new local index and active-session pointer only after successful
   record writes.
7. Make the migration idempotent so interrupted upgrades can safely retry.
8. Show a one-time local upgrade message if migration succeeds, and avoid silent
   loss if any records could not be migrated.
9. Remove or ignore legacy keys after successful migration.

## 4. Deprecated `localStorage` Keys

After migration, these keys should no longer be authoritative:

- `slide_image_cache`
- `slide_style_cache`
- `tattvam_sessions`

## 5. Data Quality and Failure Handling

The target architecture exists to address the known failure modes in the current
implementation:

- no schema versioning
- no migration path for older cached shapes
- no defensive parsing beyond `JSON.parse`
- large session payloads can accumulate raw markdown and base64 image data in the
  browser
- quota failures in `localStorage` can currently break autosave and startup

Follow-on implementation should therefore include:

- schema versioning for stored session records
- safe parsing and validation for both `localStorage` and IndexedDB reads
- stale entry pruning during restore and migration
- graceful degraded behavior when persistence writes fail
- visible recovery UX for stale session pointers, partial migration, blocked
  IndexedDB, and missing visual settings

## 6. Recommended Implementation Sequence

The safest implementation order is:

1. Define versioned persistence schemas and validators.
2. Implement read-only `localStorage` bootstrap for `lecture_duration_cache`,
   `tattvam_active_session_id`, and `tattvam_session_index`.
3. Implement read-only IndexedDB restore for full session and visual-setting
   records.
4. Add idempotent migration from legacy `tattvam_sessions`,
   `slide_style_cache`, and `slide_image_cache`.
5. Add autosave writes only after restore and migration paths are stable.

This sequencing reduces the chance of shipping a write path that corrupts or
masks legacy data before the new restore path is trustworthy.
