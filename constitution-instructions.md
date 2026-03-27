# Constitution Update Instructions for Tattvam AI

Use this document as the input brief for `speckit-constitution`. Keep the resulting
constitution aligned with the current repository, not an imagined mature platform.

## Source Inputs To Respect

- `docs/frontend-engineering-principles.md` is the primary guidance source.
- `.specify/memory/constitution.md` is the live project constitution and should be
  amended in place unless a full replacement is explicitly justified.
- `.specify/templates/constitution-template.md`, `plan-template.md`,
  `spec-template.md`, and `tasks-template.md` must stay in sync with the final
  constitution.
- `package.json` shows the current scripts: `dev`, `build`, `start`, `lint`, and
  `clean`.
- `metadata.json` names the project `Tattvam AI`.

## Current Repo Facts The Constitution Should Reflect

- This is a Next.js App Router app using React 19, strict TypeScript, and Tailwind 4.
- Shared UI primitives live in `components/ui` and follow the existing `cn` + CVA
  pattern.
- The architectural hot spots today are `app/page.tsx` and
  `components/SettingsModal.tsx`; the constitution should discourage adding more
  orchestration, persistence, and vendor logic to those files.
- There is no test suite or test harness in the repo today.
- Implementation should follow the versions currently declared in `package.json`
  and avoid older-version library patterns unless an upgrade or compatibility plan
  is explicit.
- The app already contains client-heavy workflows, so the constitution should prefer
  Server Components for new work but allow small, justified client boundaries where
  browser APIs or interaction require them.

## Principles The Constitution Should Encode

1. Keep route files thin.
- Route files should primarily compose UI, wire data, and define metadata.
- Persistence, SDK calls, complex state machines, and cross-cutting orchestration
  belong in feature components, hooks, or library modules.
- Route files should not become the default home for business logic.

2. Separate rendering from domain logic.
- JSX should stay focused on layout and state display.
- Parsing, storage, prompt construction, validation, and transformation logic should
  live in named helpers or modules.
- Derived values should be computed once and reused, not repeated in JSX.

3. Optimize for readability and component boundaries.
- Components should have one dominant responsibility.
- Prefer explicit variables, small helpers, and shallow branching over clever inline
  logic.
- Use comments only when the code cannot express the constraint, workaround, or
  intent clearly.
- Avoid comments that simply restate what the code already says.

4. Keep the App Router and client/server boundaries deliberate.
- Default to Server Components.
- Add `"use client"` only at the smallest practical boundary that needs browser APIs,
  local state, effects, drag-and-drop, animation control, or event-heavy UI.
- Keep privileged operations, secret-bearing integrations, and server-appropriate
  data access off the client whenever possible.
- Use App Router conventions consistently for metadata, layouts, loading states, and
  route-specific behavior.

5. Raise the bar on verification and testing.
- Do not pretend the repo already has a full test stack.
- Every meaningful change should have a verification plan.
- Minimum baseline for changes is `npm run lint` and `npm run build`.
- When logic is testable, add the smallest practical test coverage available for the
  change.
- If a harness does not exist yet, require explicit manual validation steps and do not
  treat "no tests" as "no verification".

6. Reuse shared UI primitives and keep styling maintainable.
- Prefer existing `components/ui` primitives before introducing new raw patterns.
- Keep Tailwind class lists readable and stable.
- Extract repeated visual patterns instead of copying long class strings across files.
- Preserve accessibility, semantic HTML, and visible focus states.

7. Adhere to the currently declared library versions.
- New code should follow the APIs and recommended patterns of the dependency
  versions currently declared in `package.json`.
- Do not reintroduce legacy patterns from older React, Next.js, Tailwind, or other
  library releases when the repository already runs on newer versions.
- If a feature requires a dependency upgrade, downgrade, or compatibility shim,
  that work should be explicit in the spec, plan, tasks, and verification steps.

## Suggested Constitution Sections

- Core Principles
- Readability and Module Boundaries
- Next.js App Router Standards
- Verification and Testing Discipline
- UI Composition and Styling Standards
- Governance

## Governance Guidance

- The constitution should be the highest project-level frontend standard and should
  override informal habits when they conflict.
- Amendments should state what changed, why it changed, and what artifacts were
  updated.
- Reviewers should check for route bloat, hidden client-side complexity, leaky
  boundaries, weak naming, and missing verification.
- Exceptions should be rare, explicit, and documented in the change itself.

## Versioning Guidance For Amendments

- The constitution now exists and should be amended in place.
- Use semantic versioning for each amendment.
- Use `MINOR` bumps for new principles or materially expanded guidance, including
  explicit dependency-version discipline, `PATCH` for clarifications, and `MAJOR`
  only for breaking governance changes.

## Template Sync Notes

- `plan-template.md` should include a Constitution Check that explicitly guards against
  route-file bloat, oversized client boundaries, buried domain logic,
  library-version drift, and missing verification plans.
- `spec-template.md` should require dependency-version alignment to be stated when a
  feature touches library APIs, upgrades packages, or introduces compatibility work.
- `tasks-template.md` should include tasks for readability cleanup, extraction of
  helpers or hooks, explicit verification work, and dependency-version alignment.
- The tasks template should not imply a mature test suite exists; instead it should
  allow targeted tests where available and manual validation when not.
- Both templates should reflect the actual repo structure (`app/`, `components/`,
  `components/ui/`, `lib/`, `hooks/`) rather than a generic `src/` layout.

## What The Constitution Update Should Avoid

- Do not describe a fantasy architecture that assumes server-only processing or a
  complete test platform already exists.
- Do not require a full rewrite of `app/page.tsx` or `components/SettingsModal.tsx`
  as a prerequisite for future work.
- Do not weaken the current codebase standards by normalizing large monolithic files.
- Do not leave placeholder tokens or template comments in the final constitution.
