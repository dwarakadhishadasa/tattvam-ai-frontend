<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ad340ec1-f98c-4712-85f7-ac0b91bb4cb6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set these values in [.env.local](.env.local):
   - `NEXT_PUBLIC_GEMINI_API_KEY` for Gemini-backed style extraction, slide generation, and lecture helper routes
   - `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` for the notebook backend origin, for example `http://127.0.0.1:8000`
   - `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` for the legacy single-target extraction chat fallback used by `POST /api/chat`
   - `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` for the server-owned four-target extraction chat stream used by `POST /api/chat/stream`
3. For the current multi-target extraction phase, `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` must contain exactly these four approved targets with stable keys and labels:
   - `ISKCON Bangalore Lectures` -> `From Senior devotees lectures`
   - `Bhaktivedanta NotebookLM` -> `From Srila Prabhupad's books`
   - `Srila Prabhupada Letters & Correspondence` -> `From Srila Prabhupad's letters and correspondence`
   - `Srila Prabhupada Audio Transcripts` -> `From Srila Prabhupad's audio transcripts`
4. Run the app:
   `npm run dev`
