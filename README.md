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
   - `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` for the notebook targeted by extraction chat, for example `da406743-a373-47f9-9275-6c2e1e86c2b6`
3. Run the app:
   `npm run dev`
