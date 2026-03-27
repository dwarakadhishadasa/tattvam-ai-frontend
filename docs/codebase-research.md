# Codebase Research

## Overview

This repository is a single-screen, client-heavy Next.js App Router frontend for **Tattvam AI**, an AI Studio applet focused on lecture synthesis and slide generation. The dominant user journey is implemented in [`app/page.tsx`](../app/page.tsx): users chat with a transcript assistant, save useful responses into a notebook, compile that notebook, then generate a slide deck from an extracted visual style.

The app is intentionally lightweight on the server side. There are no route handlers, server actions, or backend modules in this repo. Nearly all product behavior lives in [`app/page.tsx`](../app/page.tsx) and [`components/SettingsModal.tsx`](../components/SettingsModal.tsx), while the rest of the tree is supporting infrastructure, UI primitives, and spec-kit workflow scaffolding.

## Tech Stack and Runtime Model

- Next.js App Router with React 19 and TypeScript strict mode.
- Tailwind CSS v4 for styling, with Framer Motion for transitions and `react-markdown` + `remark-gfm` for rendered AI output.
- Google GenAI SDK (`@google/genai`) is the only runtime AI integration in the codebase.
- Radix primitives and `class-variance-authority` are present for reusable UI patterns, though the current product screen mostly uses custom Tailwind markup instead of those primitives.
- Runtime is mostly browser-side. [`app/page.tsx`](../app/page.tsx) is a client component, and the main flows depend on `localStorage`, `FileReader`, and `window.matchMedia`.
- [`app/layout.tsx`](../app/layout.tsx) is the only clear server component boundary in the current app shell; it loads the Google Inter font and wraps the page.

The deployment/runtime docs are AI Studio oriented. [`metadata.json`](../metadata.json) describes the app as lecture synthesis powered by NotebookLM and Gemini, and [`README.md`](../README.md) tells users to configure Gemini credentials through the AI Studio secret flow.

## Directory and Module Map

- [`app/`](../app) contains the route shell: [`layout.tsx`](../app/layout.tsx), [`page.tsx`](../app/page.tsx), and [`globals.css`](../app/globals.css).
- [`components/SettingsModal.tsx`](../components/SettingsModal.tsx) holds the only substantial feature component outside the route file.
- [`components/ui/`](../components/ui) contains generic Radix/CVA-style primitives: button, input, textarea, card, scroll-area, and tabs.
- [`hooks/use-mobile.ts`](../hooks/use-mobile.ts) exports a reusable mobile breakpoint hook, but the current product flow does not consume it.
- [`lib/utils.ts`](../lib/utils.ts) is a single shared helper module with the `cn()` class-name merger.
- [`docs/frontend-engineering-principles.md`](../docs/frontend-engineering-principles.md) is the current frontend standards document.
- [`constitution-instructions.md`](../constitution-instructions.md) explains how the repo’s constitution and spec-kit templates should be kept in sync.
- [`.specify/`](../.specify) contains the spec-kit scaffold: templates, memory, and PowerShell scripts for feature planning.

There is no checked-in `specs/` tree yet. The workflow scaffolding exists, but no active feature spec artifacts are currently committed.

## Application Architecture

The app is structured as a three-step, full-height wizard inside one client-rendered page:

- Step 1 is the chat and snippet-capture surface.
- Step 2 is notebook synthesis and content sufficiency review.
- Step 3 is slide generation and deck preview.

[`app/page.tsx`](../app/page.tsx) owns the entire stepper, most UI state, persistence, AI prompts, and rendering logic. Step changes are local state transitions, not route transitions. `AnimatePresence` and `motion.div` are used to swap panels with short opacity/position animations.

[`components/SettingsModal.tsx`](../components/SettingsModal.tsx) is the main subordinate surface. It handles slide image upload, image preview, style extraction, and lecture-duration tuning. That modal is also client-only and directly touches browser APIs and the Gemini SDK.

The shared UI primitives in [`components/ui/`](../components/ui) are available, but the current app does not meaningfully compose them into the main experience. The product UI is mostly bespoke Tailwind markup, which keeps the initial delivery fast but makes consistency maintenance manual.

## Key Data Flows

- On mount, [`app/page.tsx`](../app/page.tsx) hydrates `slide_image_cache`, `slide_style_cache`, and `lecture_duration_cache` from `localStorage`, then auto-scrolls the chat window as messages change.
- When the user sends a chat message, the page appends the user message to `messages`, clears the input, and calls `GoogleGenAI.generateContent()` with a transcript-assistant prompt. The assistant response is then appended back into `messages`.
- Assistant messages are rendered through `react-markdown` with GFM support. If a link looks like YouTube, the page renders an embedded iframe via a local `YouTubeEmbed` helper.
- Users can save assistant responses into `savedSnippets`. Saving is deduped by exact content match, and snippets can be removed individually.
- In Step 2, the app computes a rough sufficiency signal from saved content using a hard-coded estimate of `140 words / minute`. That value is compared against `lectureDuration` to show either a sufficiency checkmark or a warning clock.
- Notebook compilation is currently a simulated delay: `handleGenerateNotebook()` sets a timeout, assigns a synthetic `generatedNotebookId`, and advances to Step 3. There is no real backend call in this repository.
- In Step 3, the app concatenates saved snippets, combines them with the extracted style prompt, and sends a second Gemini request to generate a markdown slide deck. Slides are split on `---` and rendered as individual preview cards.
- In [`components/SettingsModal.tsx`](../components/SettingsModal.tsx), uploaded images are read as data URLs, cached in `localStorage`, and sent to Gemini vision-style analysis. The extracted style text is written back into both component state and local storage.

## Integration Points and External Dependencies

- `@google/genai` is used directly from the browser in both [`app/page.tsx`](../app/page.tsx) and [`components/SettingsModal.tsx`](../components/SettingsModal.tsx).
- The page currently passes `process.env.NEXT_PUBLIC_GEMINI_API_KEY` into the SDK. That is a notable deployment and security decision because it exposes the key path to client-side code.
- `react-dropzone` powers the modal’s drag-and-drop image intake.
- `react-markdown` and `remark-gfm` render AI output and markdown slide content.
- `framer-motion` drives the step transitions, typing indicators, modal animation, and card entrance effects.
- `next/image` is used for previewing the uploaded slide image inside the modal, with `unoptimized` enabled for the data URL preview path.
- `lucide-react` provides the icon set throughout the app.
- [`metadata.json`](../metadata.json) includes AI Studio runtime metadata, including `requestFramePermissions`, which is currently empty.

## Styling and UI Patterns

- The app uses a restrained zinc-based palette, large radii, thin borders, and soft shadows to create a clean presentation surface.
- [`app/globals.css`](../app/globals.css) imports Tailwind v4 and defines only a small set of custom utilities: hidden scrollbars, chat markdown styles, slide markdown styles, and a subtle chat background gradient.
- The page is layout-heavy and full-viewport: a fixed left stepper, a main stage, and a right knowledge-base sidebar during the chat step.
- Motion is used to reinforce hierarchy rather than decorate the interface. The animation vocabulary is small and consistent: fade, small vertical drift, scale-on-hover, and brief loader pulses.
- Markdown content receives special styling through `.chat-content` and `.slide-content`, which is important because the app’s primary output is generated text rather than static UI.
- The current visual system is intentionally custom rather than shared-component driven. That makes the app feel cohesive today, but it also means repeated surface patterns are not yet centralized into the primitives under [`components/ui/`](../components/ui).

## Tooling, Quality, and Workflow Conventions

- `package.json` exposes only `dev`, `build`, `start`, `lint`, and `clean`.
- `tsconfig.json` enables strict mode, uses `@/*` path aliasing, and still allows JavaScript files.
- `eslint.config.mjs` extends the Next.js ESLint preset. There is no custom lint rule layer beyond that.
- `next.config.ts` is effectively empty, so there are no custom redirects, image domains, or advanced runtime flags configured yet.
- `postcss.config.mjs` is minimal and only wires the Tailwind v4 PostCSS plugin.
- [`docs/frontend-engineering-principles.md`](../docs/frontend-engineering-principles.md) is a repo-specific architecture guide. It explicitly calls out route-file bloat, the need to split domain logic from rendering, and the preference for thin client boundaries.
- [`constitution-instructions.md`](../constitution-instructions.md) describes how the constitution should be replaced and how the spec-kit templates should stay aligned with the actual repo structure.
- [`.specify/init-options.json`](../.specify/init-options.json) shows the spec-kit runtime is set up for Codex, PowerShell scripts, and sequential feature numbering.
- [`.specify/scripts/powershell/create-new-feature.ps1`](../.specify/scripts/powershell/create-new-feature.ps1) creates numbered feature branches and `specs/<branch>/` directories.
- [`.specify/scripts/powershell/setup-plan.ps1`](../.specify/scripts/powershell/setup-plan.ps1) copies the plan template into the feature folder.
- [`.specify/scripts/powershell/check-prerequisites.ps1`](../.specify/scripts/powershell/check-prerequisites.ps1) validates feature docs before planning or implementation.
- [`.specify/scripts/powershell/update-agent-context.ps1`](../.specify/scripts/powershell/update-agent-context.ps1) generates agent-specific instruction files from `plan.md`.
- `.specify/memory/constitution.md` is still the placeholder constitution template and has not been replaced with a real project constitution.

There is no committed automated test suite in this repository. The repo’s scripted checks are lint/build oriented, but the source tree currently depends on installed dependencies being present for those commands to run.

## Current Limitations / Architectural Debt

- [`app/page.tsx`](../app/page.tsx) is doing too much: routing, chat orchestration, local persistence, AI prompting, slide rendering, and step gating all live together.
- [`components/SettingsModal.tsx`](../components/SettingsModal.tsx) mixes file upload, preview rendering, Gemini vision calls, persistence, and form state in one file.
- The Gemini credential flow is inconsistent across the repo. [`README.md`](../README.md) tells users to set `GEMINI_API_KEY`, while the actual client code reads `NEXT_PUBLIC_GEMINI_API_KEY`.
- The notebook synthesis step is not backed by a real service yet. Step 2 advances via `setTimeout`, so the UI implies a backend contract that does not exist in this repo.
- `app/layout.tsx` still uses template metadata (`Create Next App`), so the rendered document metadata does not match the product identity in [`metadata.json`](../metadata.json).
- The reusable UI primitives under [`components/ui/`](../components/ui) are scaffolded but not actively adopted by the main product flow.
- `hooks/use-mobile.ts` exists, but the current layout does not use it to alter the experience or responsiveness.
- Local storage is unversioned and manually managed. There is no migration layer, expiry policy, or schema guard for cached slide assets and style prompts.

## Suggested Focus Areas For Future Contributors

- Extract Gemini integration and prompt construction into smaller modules, and move secret-bearing work off the client when a server boundary is available.
- Split the page into feature components or hooks so the main route becomes composition rather than orchestration.
- Replace the simulated notebook compilation step with a real contract and document the shape of that integration.
- Normalize environment-variable usage across the README, AI Studio metadata, and runtime code.
- Adopt the reusable primitives under [`components/ui/`](../components/ui) where they help, or prune them if they remain unused.
- Add a minimal verification harness so future changes can be checked beyond manual walkthroughs and linting.
- Update the App Router metadata and the placeholder constitution so the repository docs match the current product and workflow.
