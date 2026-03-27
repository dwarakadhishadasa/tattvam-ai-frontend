# Implementation Plan: Tattvam AI Lecture Synthesis Workflow

**Branch**: `001-short-name-tattvam` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-short-name-tattvam/spec.md`

**Note**: This is a reverse-engineered current-state plan. Unchecked constitution
items document existing implementation debt in the shipped frontend, not missing
documentation work in this artifact pass.

## Summary

This plan captures the current Tattvam AI frontend after the client-boundary and
server-route cleanup so future contributors can reason from the code, not from
guesswork. The delivered experience is now a thin App Router route in
`app/page.tsx` that composes a dedicated `components/pipeline/*` feature surface,
supported by `components/SettingsModal.tsx`, shared server helpers in `lib/`, and
route handlers under `app/api/`. Extraction chat, lecture-context generation,
style extraction, and slide generation now flow through server-owned boundaries.

Within the scope of `spec.md`, the main journey is extraction -> synthesis ->
presentation. The live code also includes a preceding context-selection step and a
browser-local session-history system that are not fully represented in the business
spec but materially affect state, persistence, and validation.

## Technical Context

**Language/Version**: TypeScript 5.9.x (`strict`), React 19.2.1  
**Primary Dependencies**: Next.js 15.4.9 App Router, Tailwind CSS 4.1.11, Framer
Motion 12.x, `@google/genai` 1.17.0, `react-markdown` 10.1.0, `remark-gfm` 4.0.1,
`react-dropzone` 15.0.0, `cheerio` 1.2.0, and existing `components/ui` primitives  
**Storage**: Browser `localStorage` (`slide_image_cache`, `slide_style_cache`,
`lecture_duration_cache`, `tattvam_sessions`), in-memory React state, synthetic
notebook IDs, and outbound fetches to `prabhupadabooks.com`; there is no database
or durable backend storage in this repository  
**Testing**: No committed automated suite; baseline verification is `npm run lint`,
`npm run build`, and explicit manual walkthroughs of context selection, extraction,
citation review, synthesis, presentation, settings persistence, and history reload  
**Target Platform**: Modern web browsers via a Next.js frontend, with the current
experience optimized primarily for a full-screen desktop workflow  
**Project Type**: Single Next.js App Router application  
**Performance Goals**: Keep step transitions visually immediate, preserve smooth
scrolling and markdown rendering for chat and slides, keep fullscreen presentation
responsive for modest deck sizes, and restore local state quickly on reload  
**Constraints**: Browser-managed workflow state, session history, fullscreen
presentation, drag-and-drop, and modal interactions still require a substantial
client feature boundary in `components/pipeline/PipelinePageClient.tsx`; extraction
chat must target the notebook backend endpoint
`http://0.0.0.0:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask`
through a server-appropriate boundary, with the backend `question` field carrying
only the user's trimmed chat input; runtime server code now prefers
`GEMINI_API_KEY` and falls back to `NEXT_PUBLIC_GEMINI_API_KEY` for compatibility;
notebook compilation is still simulated; PPTX export is only a placeholder
affordance  
**Scale/Scope**: `app/page.tsx`, `components/pipeline/**`,
`components/SettingsModal.tsx`, `app/api/**`, `lib/**`, `app/layout.tsx`,
`app/globals.css`, `package.json`, and the reverse-engineered artifacts in
`specs/001-short-name-tattvam/`

## Constitution Check

*GATE: Reverse-engineered against the current shipped implementation. Unchecked
items are justified in Complexity Tracking below.*

- [x] Route files remain thin: `app/page.tsx` now composes the feature entry point
      and no longer owns product orchestration directly.
- [ ] Rendering and domain logic are separated: major prompt construction and
      server integrations moved into `lib/` and `app/api/`, but
      `components/pipeline/PipelinePageClient.tsx` still carries substantial
      workflow orchestration and persistence logic.
- [x] Client boundaries are deliberate: `app/page.tsx` is now server-first, Gemini
      work moved behind route handlers, and the remaining `"use client"` files are
      focused on browser-only interaction.
- [ ] UI reuse is intentional: the shipped product mostly uses bespoke Tailwind
      surfaces instead of composing the existing `components/ui` primitives.
- [x] Library-version alignment is explicit: the current implementation follows the
      dependency family declared in `package.json` and the artifacts document those
      versions directly.
- [x] Verification is explicit: this plan includes `npm run lint`, `npm run build`,
      and detailed manual validation for the live workflow.

## Project Structure

### Documentation (this feature)

```text
specs/001-short-name-tattvam/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── browser-persistence.md
│   └── runtime-interfaces.md
└── tasks.md              # Not generated in this reverse-engineering pass
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── lecture/
│   ├── slides/
│   └── verse/
├── globals.css
├── layout.tsx
└── page.tsx

components/
├── pipeline/
├── SettingsModal.tsx
└── ui/

hooks/
└── use-mobile.ts

lib/
├── chat/
├── gemini/
├── lecture/
├── utils.ts
└── youtube.ts

docs/
├── codebase-research.md
└── frontend-engineering-principles.md
```

**Structure Decision**: The current implementation now uses `components/pipeline/*`
for the feature UI split, keeps `app/page.tsx` as a thin server composition layer,
and routes Gemini-backed work through `app/api/**` plus `lib/gemini/server.ts` and
`lib/lecture/server.ts`. Follow-on refactors can still extract persistence-heavy
client logic into dedicated hooks such as `hooks/use-session-history.ts` and
`hooks/use-slide-settings.ts`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Large client container in `components/pipeline/PipelinePageClient.tsx` | The shipped workflow still coordinates local state, `localStorage`, fullscreen APIs, keyboard navigation, markdown rendering, and animations in one browser-owned feature shell | A reducer plus dedicated persistence hooks would further shrink the container, but that would add another refactor pass beyond the current cleanup |
| Bespoke product surfaces over `components/ui` | The existing experience uses custom Tailwind markup to preserve the established single-screen workflow styling | Extending shared primitives would improve reuse, but the current implementation still prioritizes product-specific presentation surfaces over a broader design-system extraction |
