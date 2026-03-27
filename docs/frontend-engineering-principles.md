# Frontend Engineering Principles

This document defines the standards for new frontend code in this repository. It is based on the current codebase, not a generic checklist.

## Repository Signals

The current project already establishes a few useful patterns:

- Next.js App Router is the application shell.
- TypeScript `strict` mode is enabled.
- Shared utilities use the `@/` path alias.
- Reusable UI primitives follow the `cn` + `class-variance-authority` pattern in [`components/ui`](../components/ui).
- Global presentation styles live in [`app/globals.css`](../app/globals.css).

The main area that needs correction is architectural concentration:

- [`app/page.tsx`](../app/page.tsx) currently owns route rendering, local persistence, AI requests, markdown rendering, animation, and step orchestration in one file.
- [`components/SettingsModal.tsx`](../components/SettingsModal.tsx) mixes dialog UI, drag-and-drop, file reading, AI integration, and local storage concerns.

New code should preserve the foundation and avoid extending these large multi-responsibility patterns.

## Core Principles

### 1. Keep route files thin

- `page.tsx`, `layout.tsx`, and route-level files should primarily compose sections, declare metadata, and connect data to UI.
- If a route starts owning persistence, vendor SDK calls, complex state transitions, or multiple independent panels, split the work into feature components, hooks, and server-side modules.
- As a working limit, route files should usually stay under 150 to 200 lines unless they are mostly declarative composition.

### 2. Default to Server Components

- Use Server Components by default in the App Router.
- Add `"use client"` only when a file needs browser APIs, local state, effects, animation controllers, drag-and-drop, or event-heavy interaction.
- Do not mark an entire route as client-side just because one subsection is interactive. Push the client boundary down to the smallest practical component.

### 3. Separate domain logic from rendering

- Keep JSX focused on layout and state display.
- Move vendor integrations, storage helpers, parsing logic, and transformation logic into dedicated modules or hooks.
- Inline helper functions are acceptable when they are tiny and purely presentational. If they include branching, parsing, persistence, or asynchronous work, extract them.
- Do not repeat derived calculations inside JSX. Compute once above `return` or in a named helper.

### 4. One component, one job

- A component should have one dominant responsibility: compose a page, render a section, manage a form, or display a reusable primitive.
- Split a component when it starts doing three or more of these at once: data fetching, orchestration, persistence, rendering, animation coordination, third-party integration.
- Reusable primitives belong in `components/ui`.
- Product-specific UI belongs in feature folders such as `components/chat`, `components/pipeline`, or `components/settings`.

### 5. Prefer explicit boundaries over cleverness

- Use simple, named variables instead of nested ternaries or immediately invoked functions inside JSX.
- Prefer small pure helpers over dense inline logic.
- Keep render branches readable enough that another engineer can scan the component top to bottom without mentally executing the whole file.
- If a block needs a long comment to explain what it renders, extract the block into a well-named component instead.

## Readability Standards

### 6. Optimize for scanability

- Put types, constants, hooks, derived values, handlers, and JSX in a consistent order.
- Group related state together and separate sections with short, meaningful headings only when the file is large enough to need them.
- Keep import groups stable:
  1. React and Next imports
  2. third-party libraries
  3. internal modules
  4. styles when needed
- Avoid deep indentation in JSX. When the tree becomes hard to scan, extract a child component.

### 7. Name things by intent

- Use names that describe behavior, not implementation details.
- Event handlers should use `handle...`.
- Boolean state should read like a predicate: `isOpen`, `hasError`, `canSubmit`.
- Derived values should sound computed: `totalWordCount`, `requiredWordCount`, `isContentSufficient`.
- Avoid vague names such as `data`, `item`, `temp`, `value`, or `stuff` unless the scope is extremely small.

### 8. Keep Tailwind readable

- Use `cn()` whenever conditional classes or overrides are involved.
- Keep class lists in a stable order: layout, spacing, sizing, typography, color, effects, state.
- Repeated visual treatments should become utilities, shared wrappers, or UI components rather than copied class strings.
- Prefer semantic tokens or shared scale values over scattered arbitrary hex values once the design system starts repeating.

### 9. Reduce duplication aggressively

- If markup repeats with only content changes, extract a presentational component.
- If logic repeats across components, move it into a hook or utility.
- If a constant can drift across files, centralize it.
- Storage keys, animation timings, prompt templates, and validation limits should not be duplicated inline in multiple places.

## Clean Code Standards

### 10. Keep business rules out of the view

- The view layer should not be the only place where product rules exist.
- Thresholds, prompt construction, content sufficiency calculations, and export rules should be defined in named helpers with clear inputs and outputs.
- JSX should consume business decisions, not invent them inline.

### 11. Prefer typed boundaries

- Define types at module boundaries, props, return values for non-trivial helpers, and external API shapes.
- Let TypeScript infer local variables when the type is already obvious.
- Use unions for controlled UI states instead of loose strings and booleans when the state machine matters.
- Avoid `any`. If a third-party type is weak, wrap it with a safer local type.

### 12. Keep side effects isolated

- Effects should synchronize with an external system such as local storage, timers, subscriptions, or DOM APIs.
- Do not use `useEffect` to compute values that can be derived during render.
- Prefer one effect per external concern.
- Browser persistence should usually live in a dedicated hook such as `useLocalStorageState` once the pattern repeats.

### 13. Make async flows easy to reason about

- Keep async handlers short and linear.
- Centralize error mapping so the UI does not sprinkle hard-coded fallback messages everywhere.
- Handle loading, success, empty, and error states deliberately.
- Vendor SDK calls should sit behind a wrapper when they are reused or when request formatting is non-trivial.

## Commenting Standards

### 14. Comment only what code cannot say clearly

- Comments should explain why, constraints, tradeoffs, or unusual behavior.
- Do not add comments that restate obvious code.
- Prefer expressive names and extracted helpers before reaching for comments.

### 15. Use comments in these cases

- Non-obvious product rules or thresholds.
- Workarounds for framework or browser behavior.
- Security, accessibility, or performance constraints.
- Synchronization with external systems such as local storage, embed logic, or SDK quirks.

### 16. Keep comments short and durable

- Write comments as facts, not narration.
- Avoid dated wording such as "new", "temporary", or "recently changed" unless tied to an issue.
- Every `TODO` should include a removal condition, owner, or issue reference.
- Delete comments when the code becomes self-explanatory or the behavior changes.

## Next.js Standards

### 17. Follow App Router conventions strictly

- Keep route concerns colocated under `app/`.
- Add `loading.tsx`, `error.tsx`, and `not-found.tsx` where route behavior needs them.
- Use `layout.tsx` for shared shells and `template.tsx` only when remount behavior is intentional.
- Put route metadata in `metadata` or `generateMetadata` and keep it real. Placeholder values should not survive past scaffolding.

### 18. Use the platform primitives

- Use `next/image` for images unless there is a strong reason not to.
- Use `next/font` for font loading.
- Use `Link` for internal navigation.
- Use route handlers, Server Actions, or server-only modules for privileged operations and secret-bearing integrations.
- Follow the dependency versions currently declared in `package.json` and the lockfile. When the repo is on React 19, Next.js 15, Tailwind 4, or newer library releases, prefer the patterns those versions are designed for instead of carrying forward older-version idioms.
- Treat dependency upgrades or compatibility shims as explicit work: document the reason, impacted surfaces, migration steps, and validation plan instead of mixing old and new usage patterns silently.

### 19. Keep secrets off the client

- Do not expose API keys to the browser unless the provider explicitly requires a public key model and the security model is understood.
- If a request can be made from the server, move it to the server.
- Environment variables should be validated centrally and accessed through a small config module instead of scattered direct reads.

### 20. Be deliberate about data fetching

- Fetch on the server by default for initial page data.
- Use client fetching for user-triggered interactions, live updates, or browser-only workflows.
- Choose caching and revalidation intentionally. Do not rely on defaults without understanding them.
- Use `Suspense` and route streaming when the UX benefits from progressive rendering.

### 21. Build for accessibility first

- Use semantic HTML before adding ARIA.
- Every interactive element must have a clear label, keyboard access, focus state, and sufficient hit target.
- Motion should support reduced-motion preferences when it becomes substantial.
- Color contrast and focus visibility are not optional polish items.

## UI and Frontend Composition Standards

### 22. Favor deliberate interfaces over UI accumulation

- Each screen should have one dominant task and a clear visual hierarchy.
- Avoid adding new cards, pills, badges, or helper text unless they improve comprehension.
- Repetition in chrome usually signals missing structure.
- Motion should reinforce hierarchy, not decorate it.

### 23. Reuse primitives, not raw patterns

- Before introducing a new button, input, textarea, or panel style, check whether an existing primitive or shared pattern already covers it.
- If the design needs a product-specific variant, extend the primitive instead of duplicating raw HTML and class strings across screens.
- Shared primitives should stay generic and free of product logic.

## Suggested Project Structure For New Work

Use this as the default direction when adding features:

- `app/...`: routing, metadata, layouts, server entry points
- `components/ui/...`: generic reusable primitives
- `components/<feature>/...`: product-specific UI
- `hooks/...`: browser-side state and effect abstractions
- `lib/...`: pure helpers, formatters, adapters, config
- `types/...`: shared domain types when reused across modules

## Review Checklist For New Code

Before merging, confirm:

- The route file is mostly composition, not orchestration.
- Client boundaries are as small as possible.
- Repeated calculations are extracted from JSX.
- External integrations are not embedded directly in large UI files.
- Comments explain non-obvious intent and nothing else.
- Styling reuses existing primitives or introduces a clearly justified new one.
- Metadata, accessibility, loading states, and error states are handled intentionally.
