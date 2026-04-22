---
title: 'Implementation Plan: Vercel Deployment and Runtime Alignment'
type: 'implementation-plan'
created: '2026-04-22'
status: 'proposed'
context:
  - '_bmad-output/planning-artifacts/vercel-deployment.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/plan.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/implementation-artifacts/1-13-iskcon-bangalore-lecture-inline-url-citation-resolution.md'
  - '_bmad-output/project-context.md'
---

## Goal

Deploy the current Next.js frontend to Vercel with low operational surprise,
keep server-owned integrations behind same-origin routes, and align Story 1.13
with a Supabase-backed citation lookup that works cleanly on Vercel.

## Problem Summary

The repo can run on Vercel, but the artifact set is still split between older AI
Studio wording, inconsistent Gemini env guidance, and a Story 1.13 plan that
assumes file-backed SQLite. That creates three practical risks:

1. deployment docs point contributors at the wrong runtime model
2. preview and production env configuration is under-specified
3. Story 1.13 picks a data store that does not fit the target hosting model

## Boundary Decisions

### 1. Treat Vercel as the frontend host of record

The Next.js frontend and same-origin `app/api/**` routes should deploy on
Vercel. No custom Node host is needed for this pass.

### 2. Keep the notebook backend external

Do not collapse the notebook service into the frontend deployment. Keep the
current env-driven backend-origin boundary and let Vercel route handlers call it
server-side.

### 3. Keep route handlers on the Node.js runtime

Current routes use Node-compatible dependencies and behaviors such as
`cheerio`, server fetch orchestration, and streaming. Do not introduce an Edge
runtime migration as part of deployment alignment.

### 4. Standardize on server-owned environment variables

The long-term deployment contract should use:

- `GEMINI_API_KEY`
- `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`
- `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`
- `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON`
- Supabase citation-store variables for Story 1.13

`NEXT_PUBLIC_GEMINI_API_KEY` may remain as a temporary compatibility fallback in
code, but it should not be the intended Vercel contract.

### 5. Use Supabase for Story 1.13 lecture citation lookup

The lecture citation content store should be server-only and networked.
Supabase is the approved fit because it works consistently across Vercel
Preview, Production, and local parity environments.

## Suggested File Touches

- `README.md`
- `.env.example`
- `lib/gemini/server.ts`
- `lib/chat/citation-content-store.ts`
- `lib/chat/server.ts`
- `tests/chat/server.test.ts`
- Vercel project settings and environment configuration

## Acceptance Sketch

- Given a Vercel preview has the required environment variables, when the app
  loads, then browser traffic still uses same-origin `/api/*` routes and the app
  shell renders successfully.
- Given `/api/chat` and `/api/chat/stream` run on Vercel, when a user asks an
  extraction question, then the server still reaches the configured notebook
  backend and returns the current normalized browser contract.
- Given Story 1.13 lecture URLs exist in Supabase, when normalization completes,
  then citation text is hydrated server-side without exposing Supabase to the
  browser.
- Given a required deployment variable is missing or malformed, when a server
  route starts work, then it fails fast with a clear configuration error before
  any downstream fetch or query.

## Suggested Delivery Order

1. Align the public setup docs and planning docs to the Vercel contract.
2. Provision Vercel Production, Preview, and Development environment variables.
3. Smoke-test existing route handlers on a preview deployment.
4. Implement Story 1.13 against the Supabase citation store.
5. Tighten `GEMINI_API_KEY` usage so server routes no longer rely on
   `NEXT_PUBLIC_GEMINI_API_KEY`.
6. Promote only after preview validation passes.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Open a Vercel preview and confirm the app shell renders.
2. Send an extraction question and confirm `/api/chat` reaches the notebook
   backend.
3. Confirm `/api/chat/stream` still emits the approved four targets.
4. Exercise a Gemini-backed route with `GEMINI_API_KEY` configured.
5. Once Story 1.13 is implemented, confirm lecture citations hydrate from
   Supabase and still render as numeric clickable citations.

## Risks

- If Preview and Production point at the same notebook or Supabase resources,
  deployment validation could contaminate live data.
- If `NEXT_PUBLIC_GEMINI_API_KEY` remains the practical source of truth, the
  Vercel deployment contract will stay ambiguous.
- If Story 1.13 keeps SQLite assumptions anywhere in code or docs, the
  deployment story will drift again.
- If route handlers are partially migrated to Edge later without revisiting the
  plan, streaming and dependency compatibility may regress.

## Recommended Architecture Decision

Deploy the frontend to Vercel, keep notebook integrations server-owned and
external, and use Supabase for Story 1.13 lecture citation content. That is the
smallest deployment change that fits the current codebase while keeping future
implementation straightforward.
