# Implementation Readiness Assessment Report

**Date:** 2026-04-22
**Project:** tattvam-ai-frontend

## Scope

- Vercel deployment of the Next.js frontend
- External notebook backend connectivity from Vercel route handlers
- Story 1.13 shift from SQLite to a Supabase-backed citation store

## Ready

- The application is already a conventional Next.js App Router project.
- Existing `app/api/**` handlers are explicitly on the Node.js runtime.
- Notebook backend routing is already env-driven through
  `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`.
- Gemini access already has a server-owned path through `lib/gemini/server.ts`.

## Gaps Closed In This Artifact Pass

- Added a dedicated Vercel deployment plan.
- Updated architecture and implementation planning to treat Vercel as the target
  frontend host.
- Replaced Story 1.13 SQLite assumptions with a server-only Supabase lookup
  model.
- Updated the runtime contract to include Vercel and Supabase environment
  requirements.

## Remaining Delivery Risks

- `README.md` and `.env.example` still carry AI Studio-oriented wording and
  should be aligned in the implementation pass.
- `lib/gemini/server.ts` still tolerates `NEXT_PUBLIC_GEMINI_API_KEY` as a
  fallback, which is not the desired long-term Vercel contract.
- Story 1.13 still needs concrete table or RPC wiring and verification once code
  work begins.
- Preview and production smoke tests are not yet automated.

## Required Before First Production Cut

1. Provision Vercel environment variables for Production, Preview, and
   Development.
2. Confirm the notebook backend is reachable from Vercel.
3. Provision the Supabase citation dataset and server credentials for Story 1.13.
4. Align the public setup docs with the Vercel deployment model.
5. Run `npm test`, `npm run lint`, `npm run build`, and preview smoke tests.

## Verdict

Ready with conditions. The architecture and planning direction are now coherent
enough to implement, but production deployment should wait until the doc/runtime
cleanup and Story 1.13 Supabase wiring are completed.
