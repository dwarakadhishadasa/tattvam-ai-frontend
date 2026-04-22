# Quickstart: Validate the Current Tattvam AI Frontend

This guide validates the implementation that exists today, not an idealized future
version.

## Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with the runtime values the app expects. For Vercel
   parity, these should mirror the Development environment values stored in the
   Vercel project:

```bash
GEMINI_API_KEY=your_key_here
TATTVAM_NOTEBOOK_BACKEND_ORIGIN=http://127.0.0.1:8000
TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID=da406743-a373-47f9-9275-6c2e1e86c2b6
TATTVAM_EXTRACTION_CHAT_TARGETS_JSON='[
  {"key":"ISKCON Bangalore Lectures","label":"From Senior devotees lectures","notebookId":"da406743-a373-47f9-9275-6c2e1e86c2b6"},
  {"key":"Bhaktivedanta NotebookLM","label":"From Srila Prabhupad'\''s books","notebookId":"09d526e1-8762-4a1b-897c-d4cafccafa53"},
  {"key":"Srila Prabhupada Letters & Correspondence","label":"From Srila Prabhupad'\''s letters and correspondence","notebookId":"c93d81ab-2e8a-49ed-b6c2-99248603d8b5"},
  {"key":"Srila Prabhupada Audio Transcripts","label":"From Srila Prabhupad'\''s audio transcripts","notebookId":"9234d4c1-c121-47ae-938f-721aa4c5b907"}
]'
```

Note: runtime server code should prefer `GEMINI_API_KEY`. The
`NEXT_PUBLIC_GEMINI_API_KEY` fallback is compatibility-only and should not be
treated as the intended Vercel contract.

3. Start the app:

```bash
npm run dev
```

## Baseline Verification

Run these before or after the manual walkthrough:

```bash
npm run lint
npm run build
```

## Manual Walkthrough 1: Context and Extraction

### Goal

Validate context selection, extraction chat, citation review, saving behavior, and
progression gating.

### Steps

1. Open the app and confirm the workflow starts on the context screen.
2. Choose one context type:
   - `Verse Specific Lecture` for `GET /api/verse`
   - `General Lecture` or `Festival Lecture` for direct extraction entry with no
     reference fetch
   - `Yatra Talk` for the route-backed helper reference
3. Complete the required input and continue to extraction.
4. Send a normal extraction question and confirm the app returns a backend-backed
   assistant response.
5. Inspect the network request if needed and confirm the outbound `question`
   payload matches the trimmed text you entered rather than a context-prefixed
   prompt.
6. Send a message containing the word `envy`.
7. Confirm the app returns a structured assistant response with citations and
   timestamped YouTube links.
8. Open a citation from the inline superscript link or from the References section.
9. Confirm the citation modal shows excerpt text and, when a URL exists, an embedded
   YouTube player plus an external YouTube link.
10. Save the citation excerpt as an insight.
11. Save the full assistant response as an insight.
12. Attempt to save the same full response again and confirm the knowledge base does
    not create a duplicate entry.
13. If you used `Verse Specific Lecture` or `Yatra Talk`, open `View Reference`
    once the reference loads and save that content into the knowledge base.
14. Confirm the saved-snippet counter increases and the `Proceed to Synthesis`
    action becomes available only after at least one insight exists.

### Expected Results

- General and festival enter extraction immediately after the user continues.
- Verse and yatra may load their optional reference in the background after
  extraction opens.
- Live extraction requests send only the trimmed user question in the backend
  payload.
- Citation review is interactive and supports embeds for YouTube URLs.
- Duplicate snippets are prevented by exact content matching.
- Snippets can be removed from the knowledge base sidebar.

## Manual Walkthrough 2: Synthesis

### Goal

Validate content preview, sufficiency messaging, default naming, and notebook
handoff.

### Steps

1. Enter synthesis with at least one saved snippet.
2. Confirm the content preview lists saved insights.
3. Observe the content sufficiency indicator and confirm it compares the saved word
   count against `lectureDuration * 140`.
4. Leave the workspace name blank and click `Compile Notebook`.
5. Wait for the simulated compile to complete.
6. Confirm the notebook name becomes `Untitled Workspace`.
7. Confirm the app advances to presentation mode and creates a notebook ID.
8. Return to extraction, remove all snippets, and confirm synthesis access becomes
   blocked again.

### Expected Results

- Synthesis cannot compile with zero snippets.
- Blank notebook names default automatically.
- The compile step is a timed local transition, not a real backend sync.

## Manual Walkthrough 3: Presentation and Visual Settings

### Goal

Validate settings persistence, style extraction/manual override, markdown deck
generation, fullscreen presentation, and current export limitation.

### Steps

1. Open `Settings`.
2. Set `Lecture Duration` to a non-default value.
3. Choose one of these style paths:
   - Upload a reference slide image and wait for automatic style extraction.
   - Or manually type a style prompt into the `Style Prompt` field.
4. Close settings and refresh the page.
5. Confirm lecture duration and any cached style/image values are restored from the
   browser cache.
6. Return to the active session from `History` if needed.
7. In presentation mode, click `Generate Slide Deck`.
8. Confirm markdown slides render as separate preview cards split on `---`.
9. Click `Present Fullscreen`.
10. Use `ArrowRight`, `ArrowLeft`, and `Space` to navigate slides.
11. Exit fullscreen and confirm the next fullscreen session starts from slide 1.
12. Click `Regenerate` and confirm the deck clears back to the pre-generation
    state.
13. Click `Export to PPTX` and confirm it only shows the current placeholder alert.

### Expected Results

- Slide generation requires both a compiled notebook and a non-empty style prompt.
- Fullscreen navigation works without leaving the app.
- Export is visibly present but non-functional in the current codebase.

## Optional Adjacent Checks

These behaviors are implemented even though they are not the main focus of the
current business spec.

1. Open `History` and confirm prior sessions can be restored.
2. Start a new session and verify chat, snippets, notebook ID, and generated slides
   reset while cached visual settings remain.
3. For verse-specific context, confirm the reference modal links back to
   `prabhupadabooks.com`.
4. For general or festival context, confirm extraction works without any `View Reference`
   affordance or pre-chat reference wait.

## Known Current Limitations

- Notebook compilation is simulated with `setTimeout`.
- Extraction chat depends on the configured notebook backend endpoint.
- Style extraction and slide generation depend on Gemini access.
- PPTX export is only a placeholder alert.
- `app/api/slides/generate` exists but is not part of the active UI flow.
- Browser persistence is unversioned and has no migration layer.
