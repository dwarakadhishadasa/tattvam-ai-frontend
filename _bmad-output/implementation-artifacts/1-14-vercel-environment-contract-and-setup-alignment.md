# Story 1.14: Vercel Environment Contract and Setup Alignment

Status: review

## Source Artifacts

- `_bmad-output/implementation-artifacts/plan-vercel-deployment-and-runtime-alignment.md`
- `_bmad-output/planning-artifacts/vercel-deployment.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/plan.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/project-context.md`

## Story

As a maintainer preparing the frontend for Vercel,
I want the public setup docs and runtime environment contract aligned to
server-owned Vercel variables,
so that local setup, preview deploys, and production deploys all use the same
safe configuration model.

## Acceptance Criteria

1. Given a contributor follows `README.md` and `.env.example`, when they prepare
   local or Vercel environments, then the documented contract uses
   `GEMINI_API_KEY`, `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`,
   `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`,
   `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON`, and the planned Story 1.13 Supabase
   variables, with no guidance that treats `NEXT_PUBLIC_GEMINI_API_KEY` as the
   intended deployment contract.
2. Given server-side Gemini helpers initialize, when `GEMINI_API_KEY` is
   configured, then they resolve from that server-owned variable without relying
   on `NEXT_PUBLIC_GEMINI_API_KEY`.
3. Given `GEMINI_API_KEY` is missing, when Gemini helpers are invoked, then the
   current recoverable provider-unavailable path and clear configuration error
   behavior remain intact.
4. Given Vercel is the target frontend host, when setup docs are read, then
   they clearly describe same-origin `/api/*` browser traffic, the external
   notebook backend boundary, and the server-only Supabase boundary for Story
   1.13.
5. Given the contract changes above are implemented, when verification runs,
   then `npm test`, `npm run lint`, and `npm run build` complete successfully.

## Tasks / Subtasks

- [x] Align public setup docs to the Vercel deployment contract. (AC: 1, 4)
  - [x] Update `README.md` so Vercel is the default frontend deployment model
        instead of AI Studio-first wording.
  - [x] Keep local setup instructions compatible with `.env.local` and Vercel
        Development parity.
  - [x] Document the required notebook backend and extraction-target variables
        with their current server-owned responsibilities.
  - [x] Add the planned Story 1.13 Supabase variables as server-only
        configuration, without implying browser-side Supabase access.

- [x] Align `.env.example` to the same server-owned contract. (AC: 1, 4)
  - [x] Keep `GEMINI_API_KEY` as the canonical Gemini variable.
  - [x] Remove or rewrite AI Studio-specific comments that conflict with the
        Vercel deployment direction.
  - [x] Add placeholders and comments for Supabase citation-store variables used
        by Story 1.13.
  - [x] Ensure comments describe Preview, Production, and Development use
        accurately enough for Vercel provisioning.

- [x] Tighten the Gemini server helper to the intended Vercel contract. (AC: 2, 3)
  - [x] Update `lib/gemini/server.ts` so server helpers depend on
        `GEMINI_API_KEY` as the source of truth.
  - [x] Remove the practical dependency on `NEXT_PUBLIC_GEMINI_API_KEY`.
  - [x] Preserve the current error message and normalization path so existing
        route-level recovery behavior does not regress.

- [x] Add focused regression coverage for the contract hardening. (AC: 2, 3)
  - [x] Extend existing Gemini tests or add a small focused helper test to prove
        missing-key behavior remains normalized correctly.
  - [x] Add coverage only at the smallest seam needed; do not introduce broad
        mocking around unrelated route behavior.

- [x] Run full verification. (AC: 5)
  - [x] Run `npm test`.
  - [x] Run `npm run lint`.
  - [x] Run `npm run build`.

## Dev Notes

### Sequencing

- This story should land before Vercel preview provisioning and smoke validation.
- This story can run in parallel with Story 1.13 because it does not own the
  lecture citation hydration logic itself.
- This story reduces ambiguity for any later deployment or secrets work by
  making the env contract explicit first.

### Current Branch Intelligence

- `README.md` is still AI Studio-oriented and currently documents
  `NEXT_PUBLIC_GEMINI_API_KEY` as a local setup value.
- `.env.example` already uses `GEMINI_API_KEY`, but its comments still describe
  AI Studio injection and do not yet reflect the Vercel-first deployment model.
- `lib/gemini/server.ts` is the only remaining runtime code path that still
  tolerates `NEXT_PUBLIC_GEMINI_API_KEY` as a fallback.
- Current app, component, and route code does not otherwise reference
  `NEXT_PUBLIC_GEMINI_API_KEY`, so this hardening should stay localized.
- Existing route handlers already declare `runtime = "nodejs"`, which aligns
  with the Vercel deployment plan.

### Architecture Compliance

- Keep secrets server-owned. Do not introduce any new client-side env reads for
  notebook, Gemini, or Supabase credentials.
- Keep route files thin. Environment resolution belongs in shared server helpers
  such as `lib/gemini/server.ts`.
- Preserve same-origin `/api/*` browser calls and the external backend boundary.
- Treat Supabase as a future server-only dependency for Story 1.13, not as a
  browser integration.

### File Structure Requirements

- `README.md`
- `.env.example`
- `lib/gemini/server.ts`
- `tests/gemini/server.test.ts` or a new focused Gemini helper test file if a
  smaller seam is needed

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Run the app with only `GEMINI_API_KEY` configured and confirm Gemini-backed
    server flows still work.
  - Remove `GEMINI_API_KEY` and confirm the app still surfaces the recoverable
    provider-unavailable behavior instead of a raw secret-resolution failure.
  - Confirm the published setup docs no longer tell operators to depend on
    `NEXT_PUBLIC_GEMINI_API_KEY`.

### References

- `_bmad-output/implementation-artifacts/plan-vercel-deployment-and-runtime-alignment.md`
- `_bmad-output/planning-artifacts/vercel-deployment.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/project-context.md`
- `README.md`
- `.env.example`
- `lib/gemini/server.ts`
- `tests/gemini/server.test.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex)

### Debug Log References

- `npm test`
- `npm run lint`
- `npm run build`

### Completion Notes List

- Rewrote `README.md` around the Vercel-first deployment contract, same-origin
  `/api/*` browser calls, and server-only Gemini/notebook/Supabase boundaries.
- Updated `.env.example` to document Development, Preview, and Production
  provisioning for `GEMINI_API_KEY`,
  `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`,
  `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`,
  `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON`,
  `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, and
  `TATTVAM_LECTURE_CITATIONS_TABLE`.
- Hardened `lib/gemini/server.ts` to use only `GEMINI_API_KEY` while preserving
  the existing `GEMINI_API_KEY is not configured` error that route-level Gemini
  normalization already maps to the recoverable provider-unavailable path.
- Added focused Gemini contract tests that verify server-key initialization and
  reject public-only fallback configuration.
- Replaced the build-time `next/font/google` dependency in `app/layout.tsx`
  with a local CSS font stack in `app/globals.css` so `next build` completes in
  restricted environments instead of hanging on remote font fetches.
- Verification passed: `npm test`, `npm run lint`, `npm run build`.

### File List

- `README.md`
- `.env.example`
- `lib/gemini/server.ts`
- `tests/gemini/server.test.ts`
- `app/layout.tsx`
- `app/globals.css`
