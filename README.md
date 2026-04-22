# Tattvam AI Frontend

This frontend is intended to run on Vercel. The browser talks only to same-origin
Next.js routes under `/api/*`, and those server routes own communication with:

- Gemini via `GEMINI_API_KEY`
- The notebook backend via `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`
- The planned Story 1.13 citation store via server-only Supabase variables

No notebook, Gemini, or Supabase secrets should be read from browser code.

## Prerequisites

- Node.js
- A reachable notebook backend
- A Gemini API key for server-side Gemini routes

## Local Development

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`.
3. Configure these server-owned variables in `.env.local`:
   - `GEMINI_API_KEY` for Gemini-backed style extraction, slide generation, and
     other server-side Gemini helpers
   - `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` for the external notebook backend
     boundary, for example `http://127.0.0.1:8000` locally or
     `https://tattvam-ai-backend-two.vercel.app` in Vercel
   - `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` for the legacy single-target
     `POST /api/chat` route
   - `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` for the approved four-target
     `POST /api/chat/stream` fan-out
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional
     `TATTVAM_LECTURE_CITATIONS_TABLE` for the server-only lecture citation
     store planned in Story 1.13
4. For the current multi-target extraction phase,
   `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` must contain exactly these four
   approved targets with stable keys and labels:
   - `ISKCON Bangalore Lectures` -> `From Senior devotees lectures`
   - `Bhaktivedanta NotebookLM` -> `From Srila Prabhupad's books`
   - `Srila Prabhupada Letters & Correspondence` -> `From Srila Prabhupad's letters and correspondence`
   - `Srila Prabhupada Audio Transcripts` -> `From Srila Prabhupad's audio transcripts`
5. Start the app:
   `npm run dev`

Vercel Development should mirror the same contract. Keep `.env.local`, `vercel env pull`,
and Vercel Development aligned so local testing and preview deployments use the same
server-owned variable names.

## Vercel Environment Contract

Provision these variables in Vercel for the environments that need them:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Server-side Gemini access |
| `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` | Yes | External notebook backend origin used by server routes |
| `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` | Yes | Legacy single-target notebook id for `POST /api/chat` |
| `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` | Yes | Approved four-target registry for `POST /api/chat/stream` |
| `SUPABASE_URL` | Story 1.13 | Supabase project URL for lecture citation hydration |
| `SUPABASE_SERVICE_ROLE_KEY` | Story 1.13 | Server-only Supabase key for lecture citation hydration |
| `TATTVAM_LECTURE_CITATIONS_TABLE` | Optional | Override for the lecture citation table name if the default changes |

Guidance:

- Development, Preview, and Production should each define their own values in Vercel.
- If Vercel is missing `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`, the app now falls back
  to `https://tattvam-ai-backend-two.vercel.app` instead of localhost, but the
  variable should still be set explicitly per environment.
- Preview should point at preview-safe notebook and Supabase resources unless the
  team explicitly accepts shared production dependencies.
- Browser traffic should remain same-origin to `/api/*`; the browser should never
  call notebook or Supabase hosts directly.
