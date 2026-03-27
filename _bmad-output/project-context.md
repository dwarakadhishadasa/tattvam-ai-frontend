---
project_name: 'tattvam-ai-frontend'
user_name: 'Dwaraka'
date: '2026-03-26'
sections_completed:
  - technology_stack
  - critical_implementation_rules
existing_patterns_found: 7
---

# Project Context for AI Agents

_This file contains the day-to-day frontend operating rules for Tattvam AI. It elaborates on the project constitution and MUST NOT contradict it._

---

## Technology Stack & Versions

- TypeScript `5.9.3` with strict typing
- React `19.2.4`
- Next.js `15.5.14` with App Router
- Tailwind CSS `4.1.11`
- Framer Motion `12.38.0` and `motion` `12.38.0`
- `class-variance-authority` `0.7.1`, `clsx` `2.1.1`, and `tailwind-merge` `3.5.0` for styling composition
- Reusable UI primitives live in `components/ui/`

## Critical Implementation Rules

### Core Principles

#### I. Keep Route Files Thin

Route files under `app/` MUST primarily compose UI, wire data, and declare route metadata. Persistence, SDK calls, prompt construction, complex state transitions, and cross-cutting orchestration MUST live in feature components, hooks, or `lib/` modules. New work MUST reduce pressure on `app/page.tsx` and MUST NOT treat route files as the default home for business logic.

Rationale: the current codebase is already concentrated in route-level files, so future changes must reverse that pattern instead of normalizing it.

#### II. Separate Rendering From Domain Logic

JSX MUST stay focused on layout, state display, and event wiring. Parsing, storage, validation, transformation, prompt generation, and third-party adapters MUST be implemented in named helpers, hooks, or modules with typed inputs and outputs. Derived values MUST be computed once and reused rather than repeated inline in JSX.

Rationale: concentrated view-layer logic is the main source of scanability and change-risk in the current app.

#### III. Optimize for Readability and Clear Module Boundaries

Each component, hook, and helper MUST have one dominant responsibility and a name that reflects intent. Files SHOULD favor explicit variables, shallow branching, and small helpers over nested ternaries, repeated inline functions, or comment-heavy render blocks. Comments MUST explain non-obvious constraints, workarounds, or tradeoffs and MUST NOT restate obvious code.

Rationale: readability is the fastest way to lower regression risk in a client-heavy frontend without a large test suite.

#### IV. Keep App Router and Client Boundaries Deliberate

New work MUST default to Server Components and MUST add `"use client"` only at the smallest practical boundary that genuinely needs browser APIs, local state, animation control, drag-and-drop, or event-heavy interaction. Server-appropriate data access, privileged operations, and secret-bearing integrations MUST stay off the client whenever the platform allows it. App Router conventions for metadata, layouts, loading states, and route-specific behavior MUST be used consistently.

Rationale: this repo already has client-heavy flows, so discipline at the boundary is required to avoid pushing more privileged or orchestration work into the browser.

#### V. Verify Every Meaningful Change

Every meaningful change MUST include an explicit verification plan. The minimum baseline is `npm run lint`, `npm run build`, and documented manual validation for the affected user journey. When logic is testable and a harness exists or is added within scope, contributors SHOULD add the smallest practical automated coverage instead of relying only on manual checks. Lack of an existing test suite MUST NOT be treated as permission to skip verification.

Rationale: the repository currently has no committed automated test suite, so verification discipline must be intentional and explicit.

#### VI. Adhere to Current Library Versions

Implementation MUST follow the APIs, behavioral expectations, and recommended patterns of the dependency versions currently declared in `package.json` and the lockfile. New code MUST NOT introduce legacy patterns from older major versions when the repository already runs on a newer release. Any dependency upgrade, downgrade, or compatibility shim MUST be intentional, documented in the relevant spec or plan, and validated across impacted user journeys.

Rationale: mixing multiple library eras in one codebase obscures the supported programming model, makes upgrades harder, and increases regression risk.

#### VII. Shape Raw Backend Payloads at Server Boundaries

Any change to raw backend payloads MUST be performed at the smallest server-owned boundary, typically a Next.js route handler or a server adapter in `lib/`, before client components consume or persist that data. Route handlers and server adapters are the approved place to rename, split, merge, redact, enrich, validate, normalize, and version backend response fields when upstream payloads are unstable, provider-specific, over-broad, or not yet aligned with the app's UI and persistence model. Client code MUST prefer explicit application fields and MUST NOT treat raw backend payloads as the primary contract when a server boundary can shape them first.

Rationale: server-owned payload shaping localizes upstream churn, keeps browser state deterministic, prevents persistence drift, and avoids spreading backend-specific parsing rules across JSX, hooks, and restore paths.

### UI Composition and Styling Standards

Use existing `components/ui` primitives and the established `cn` + `class-variance-authority` pattern before introducing new raw interaction patterns. Product-specific surfaces belong in feature modules under `components/`, not inside generic primitives. Repeated class lists, wrappers, and interaction treatments MUST be extracted instead of copied across files. Tailwind class lists SHOULD remain readable and stable, and all new UI MUST preserve semantic HTML, keyboard access, visible focus states, and reduced-motion awareness where motion is substantial.

### Default Module Placement for New Work

- `app/`: routes, metadata, layouts, loading and error boundaries, server entry points
- `components/ui/`: generic reusable primitives
- `components/<feature>/`: product-specific UI composition
- `hooks/`: browser-side state and effect abstractions
- `lib/`: pure helpers, adapters, validation, config, and transformation logic
- `types/`: shared domain types when reused across modules

### Review and Delivery Standards

Specs, plans, and task lists MUST call out route-file impact, client-boundary decisions, extracted module boundaries, shared UI reuse, and the verification strategy before implementation starts. Reviewers MUST block changes that add route bloat, hide domain logic inside JSX, spread vendor logic across UI files, introduce unjustified client boundaries, expose raw backend-shaped payloads to client rendering when a route or server adapter can shape them first, or omit verification steps. Exceptions MUST be rare, explicit in the change itself, and justified in the relevant spec, plan, or review thread with the simpler alternative that was rejected.

### Governance

This document is the highest project-level frontend operating standard for Tattvam AI and supersedes informal habits when they conflict, while remaining subordinate to the constitution it elaborates. Amendments MUST document what changed, why it changed, which templates or guidance files were updated, and the resulting semantic version bump. Versioning follows semantic rules: MAJOR for backward-incompatible governance changes or principle removals, MINOR for new principles or materially expanded guidance, and PATCH for clarifications or wording refinements. Compliance review is required for every feature plan, generated tasks, and implementation review. Approved exceptions MUST be documented alongside the change and revisited on the next related amendment.
