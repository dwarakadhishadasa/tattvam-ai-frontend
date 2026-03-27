# Browser Persistence Contract

This document records the browser-local data the current frontend writes and restores.

## 1. Local Storage Keys

| Key | Type | Written By | Restored On Mount | Purpose |
|-----|------|------------|-------------------|---------|
| `slide_image_cache` | `string` data URL | `components/pipeline/PipelinePageClient.tsx` persistence effect | Yes | Persist uploaded reference slide |
| `slide_style_cache` | `string` | `components/pipeline/PipelinePageClient.tsx` persistence effect | Yes | Persist extracted or edited style prompt |
| `lecture_duration_cache` | `string` number | `components/pipeline/PipelinePageClient.tsx` persistence effect | Yes | Persist lecture duration |
| `tattvam_sessions` | `Session[]` JSON | `components/pipeline/PipelinePageClient.tsx` session autosave effect | Yes | Persist browser-local history and workflow state |

## 2. Session JSON Shape

```json
{
  "id": "1742971112345",
  "title": "Bhagavad-gita 1.1",
  "updatedAt": 1742971112345,
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

## 3. Session Save Rules

The pipeline client does not save a session until there is meaningful activity. Autosave is
skipped when all of the following are true:

- `talkType` is empty
- `messages.length <= 1`
- `savedSnippets.length === 0`

Once meaningful state exists, every tracked change rewrites `tattvam_sessions`.

## 4. Session Title Derivation

When autosaving, the session title is derived in this order:

1. `extractedVerseData.title`
2. `General: ${generalTopic}`
3. `Festival: ${festivalName}`
4. `Yatra: ${yatraLocation}`
5. First user message preview (`messages[1].content.substring(0, 30) + "..."`)
6. Fallback: `New Session`

## 5. Restore Rules

On initial page load:

1. `slide_image_cache`, `slide_style_cache`, and `lecture_duration_cache` are read.
2. `tattvam_sessions` is read and parsed if present.
3. `currentSessionId` is initialized to a fresh timestamp string.

When a user loads a historical session:

- the pipeline client restores `activeStep`
- context inputs and normalized context
- messages and saved snippets
- notebook name and generated notebook ID
- generated slide markdown

The visual settings cache is separate from session history and is not reset by
starting a new session.

## 6. Clear and Reset Behavior

### Start New Session

Resets:
- workflow state
- extracted context
- chat messages
- saved snippets
- notebook state
- generated slides

Does not clear:
- `slide_image_cache`
- `slide_style_cache`
- `lecture_duration_cache`
- prior `tattvam_sessions`

### Clear Visual Cache

Resets in component state:
- reference slide
- extracted style prompt

Persistence side effect removes:
- `slide_image_cache`
- `slide_style_cache`

Does not remove:
- `lecture_duration_cache`
- `tattvam_sessions`

## 7. Data Quality and Migration Limits

Current limitations of the persistence contract:

- no schema versioning
- no migration path for older cached shapes
- no TTL or expiry policy
- no defensive parsing beyond `JSON.parse`
- large session payloads can accumulate raw markdown and base64 image data in the
  browser

Future implementation work should preserve backward compatibility deliberately or
introduce a versioned migration layer before changing any of these shapes.
