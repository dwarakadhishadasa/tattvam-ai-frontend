# Runtime Interfaces Contract

This document records the runtime interfaces the current frontend depends on.

## 1. Verse Context API

### Request

`GET /api/verse?book={book}&verse={verse}`

### Query Parameters

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `book` | `string` | Yes | Current UI values are `bg` and `sb` |
| `verse` | `string` | Yes | Dot-delimited verse path such as `1.1` or `1.1.1` |

### Success Response

```json
{
  "title": "Bhagavad-gita 1.1",
  "verseText": "dharma-ksetre...",
  "translation": "Dhritarashtra said...",
  "purport": "Full purport text...",
  "url": "https://prabhupadabooks.com/bg/1/1"
}
```

### Error Responses

| Status | Shape | Meaning |
|--------|-------|---------|
| `400` | `{ "error": "Missing book or verse" }` | Required query param missing |
| `404` | `{ "error": "Verse not found" }` | Remote page not found |
| `500` | `{ "error": "<message>" }` | Scrape or fetch failure |

### Notes

- This route scrapes `prabhupadabooks.com`.
- The downstream UI normalizes the response into `extractedVerseData`.
- The active UI enters extraction immediately and allows this reference to resolve in the background.

## 2. General Lecture Context API (Dormant in Active UI)

### Request

`POST /api/lecture/general`

```json
{
  "topic": "The Importance of Sadhu Sanga"
}
```

### Success Response

```json
{
  "overview": "Short overview text",
  "keyPoints": [
    "Key point 1",
    "Key point 2"
  ]
}
```

### Notes

- The route currently performs no explicit request validation beyond JSON parsing.
- The current UI no longer calls this route during context setup.
- General lectures now enter extraction immediately using only local `generalTopic` state and do not require a fetched reference object.

## 3. Festival Lecture Context API (Dormant in Active UI)

### Request

`POST /api/lecture/festival`

```json
{
  "festivalName": "Janmashtami"
}
```

### Success Response

```json
{
  "overview": "Short overview text",
  "keyPoints": [
    "Key point 1",
    "Key point 2"
  ]
}
```

### Notes

- The current UI no longer calls this route during context setup.
- Festival lectures now enter extraction immediately using only local `festivalName` state and do not require a fetched reference object.

## 4. Yatra Lecture Context API

### Request

`POST /api/lecture/yatra`

```json
{
  "location": "Vrindavan"
}
```

### Success Response

```json
{
  "overview": "Short overview text",
  "keyPoints": [
    "Key point 1",
    "Key point 2"
  ]
}
```

### Notes

- Yatra still uses a route-backed helper to assemble an optional reference/context object.
- The active UI enters extraction immediately and allows this reference to resolve in the background.

## 5. Extraction Chat Contract

The frontend extraction chat now depends on a same-origin route handler:

`POST /api/chat`

That route forwards to the backend-owned notebook chat endpoint:

`POST http://0.0.0.0:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask`

### Input

```json
{
  "question": "What are the main teachings on envy?"
}
```

### Request Notes

- The frontend MUST reject empty messages client-side before issuing the request.
- The frontend MAY still preserve local deterministic test helpers, but the live
  extraction path is the backend endpoint above.
- The `question` field is the user's trimmed raw extraction input.
- Context chosen in step 0 remains local UI state for display, history, session
  titles, and any available reference actions; it is not serialized into the chat
  request payload.
- General and festival modes do not perform any pre-chat reference fetch in the
  active UI.

### Success Response

The backend returns a pass-through serialized result payload:

```json
{
  "ok": true,
  "result": {
    "answer": "Markdown-capable assistant answer",
    "references": [
      {
        "citation_number": 1,
        "cited_text": "Excerpt text"
      }
    ]
  }
}
```

### Parsed Assistant Shape

```json
{
  "id": "timestamp-string",
  "role": "assistant",
  "content": "Markdown text with linkified citations",
  "citations": [
    {
      "number": 1,
      "text": "Excerpt text",
      "url": "https://youtu.be/example?t=49"
    }
  ]
}
```

### Error Fallback

On backend chat failure, the page appends:

```json
{
  "id": "timestamp-string",
  "role": "assistant",
  "content": "Error connecting to the AI."
}
```

## 6. Notebook Compilation Contract

There is no backend notebook API in the active flow.

### Preconditions

- `savedSnippets.length > 0`

### Behavior

1. If `notebookName` is blank, replace it with `Untitled Workspace`.
2. Set `isGeneratingNotebook = true`.
3. After 2.5 seconds, set:

```json
{
  "generatedNotebookId": "nb_<timestamp>"
}
```

4. Advance the UI to presentation mode.

## 7. Slide Generation Contract

The active presentation flow also calls `GoogleGenAI` directly from the browser.

### Preconditions

- `generatedNotebookId` must exist
- `extractedStyle` must be non-empty

### Input Assembly

- `savedSnippets.map(s => s.content).join('\n\n')`
- `extractedStyle`

### Expected Output

A markdown string using `---` on its own line to separate slides, for example:

```md
# Slide 1
Intro content
---
# Slide 2
Supporting content
```

### Error Fallback

If generation fails:

```json
{
  "generatedSlides": "Error generating slides."
}
```

## 8. Dormant Async Slide Task API

### Request

`POST /api/slides/generate`

### Response

```json
{
  "ok": true,
  "status": {
    "task_id": "uuid",
    "status": "processing",
    "url": null,
    "error": null,
    "error_code": null,
    "metadata": null
  }
}
```

### Notes

- `app/api/slides/store.ts` marks the task complete after 5 seconds in memory.
- There is no polling route in this repo.
- The active UI does not call this contract.

## 9. Environment Contract

The current runtime expects:

```text
NEXT_PUBLIC_GEMINI_API_KEY
TATTVAM_CHAT_API_URL (recommended for configurability; default may point at the current notebook chat endpoint)
```

This is used by:
- `components/SettingsModal.tsx`
- `app/api/lecture/yatra/route.ts`

`TATTVAM_CHAT_API_URL` is used by the server-side chat adapter or route that
forwards extraction chat requests to the notebook backend.

Any deployment or local setup that only provides `GEMINI_API_KEY` will not match the
current implementation for Gemini-backed flows.
