# Story 1.15: Vercel Preview Provisioning and Smoke Validation

Status: in-progress

## Source Artifacts

- `_bmad-output/implementation-artifacts/plan-vercel-deployment-and-runtime-alignment.md`
- `_bmad-output/planning-artifacts/vercel-deployment.md`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-22.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/1-13-iskcon-bangalore-lecture-inline-url-citation-resolution.md`
- `_bmad-output/project-context.md`

## Story

As a release owner deploying the frontend to Vercel,
I want Preview, Development, and Production environments provisioned and
validated against the real server-route contract,
so that production promotion only happens after notebook, Gemini, and planned
Supabase integrations behave correctly in preview.

## Acceptance Criteria

1. Given the Vercel project is configured, when Development, Preview, and
   Production environments are provisioned, then each environment contains the
   required notebook-backend, Gemini, and planned Story 1.13 Supabase values,
   with Preview able to point at non-production resources.
2. Given a Vercel preview deployment is opened, when the extraction flow is
   exercised, then browser traffic continues using same-origin `/api/*` routes
   while the server reaches the configured notebook backend through
   `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`.
3. Given Gemini-backed server routes run in preview, when `GEMINI_API_KEY` is
   configured, then those routes work without relying on public browser-facing
   key variables.
4. Given Story 1.13 is implemented against Supabase, when preview provisioning
   is used, then lecture citation hydration can point at preview-safe Supabase
   data and missing Supabase configuration fails before any query executes.
5. Given preview smoke checks complete, when production readiness is assessed,
   then pass/fail outcomes and unresolved blockers are recorded before
   promotion.

## Tasks / Subtasks

- [ ] Provision Vercel environment variables across all required environments. (AC: 1)
  - [ ] Configure Development, Preview, and Production values for
        `GEMINI_API_KEY`, `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`,
        `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`, and
        `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON`.
  - [ ] Add the planned Story 1.13 Supabase values to Vercel as server-only
        variables, even if final runtime validation must wait for the code path
        to land.
  - [ ] Ensure Preview does not unintentionally share live production notebook
        or Supabase resources unless that tradeoff is explicitly accepted.

- [ ] Validate the deployed route contract in a Vercel preview. (AC: 2, 3)
  - [ ] Confirm the preview app shell renders successfully.
  - [ ] Exercise `POST /api/chat` and verify the route reaches the configured
        notebook backend.
  - [ ] Exercise `POST /api/chat/stream` and verify the approved four-target
        stream still completes with same-origin browser calls.
  - [ ] Exercise at least one Gemini-backed server route and confirm
        `GEMINI_API_KEY` is sufficient.

- [ ] Define and execute the Story 1.13 deployment gate for Supabase hydration. (AC: 4)
  - [ ] Record that lecture citation hydration validation is blocked until Story
        1.13 implementation lands.
  - [ ] Once Story 1.13 is merged, exercise a lecture response in preview and
        confirm citation text hydrates from Supabase without exposing Supabase
        credentials to the browser.
  - [ ] Confirm missing Supabase configuration fails fast with a server-owned
        configuration error rather than a browser-visible raw query failure.

- [ ] Capture promotion evidence and blocker handling. (AC: 5)
  - [x] Record pass/fail results for each preview smoke check in the story's Dev
        Agent Record or an explicitly linked deployment note.
  - [x] Treat failed notebook, Gemini, or Supabase checks as promotion blockers.
  - [x] Record any environment-specific deviations between Development, Preview,
        and Production before sign-off.

- [x] Run repository verification before final promotion recommendation. (AC: 5)
  - [x] Run `npm test`.
  - [x] Run `npm run lint`.
  - [x] Run `npm run build`.

## Dev Notes

### Sequencing

- Story 1.14 should land first so the environment contract and public setup docs
  are already aligned when Vercel provisioning begins.
- Story 1.13 remains the implementation dependency for lecture citation
  hydration; this story only validates its deployment behavior once that code is
  available.
- This story is the promotion gate. It should be the last story in the Vercel
  alignment slice.

### Current Branch Intelligence

- Planning artifacts now define Vercel as the target frontend host and Supabase
  as the deployment-safe citation-store direction for Story 1.13.
- Existing API routes already use the Node.js runtime, which is compatible with
  the current Vercel deployment plan.
- The repository has no committed Vercel project automation yet, so some work in
  this story will occur in Vercel project settings rather than only in code.
- `README.md` and `.env.example` were previously AI Studio-oriented; Story 1.14
  is intended to correct that before this validation pass.

### Architecture Compliance

- Keep browser traffic on same-origin `/api/*` routes. Do not introduce
  browser-direct notebook or Supabase calls during deployment validation.
- Keep deployment findings tied to the server-owned boundaries already defined in
  `lib/backend/`, `lib/chat/`, and `lib/gemini/`.
- Treat Preview as the safety boundary for real environment validation before
  production promotion.
- Do not migrate route handlers to Edge as part of this story.

### File Structure Requirements

- Vercel project settings for Development, Preview, and Production
- Existing server routes under `app/api/**`
- Existing deployment and runtime docs only if a small clarifying note is needed
  to record final provisioning outcomes

### Testing Requirements

- Minimum automated checks: `npm test`, `npm run lint`, `npm run build`
- Manual checks:
  - Open a Vercel preview deployment and confirm the app shell renders.
  - Exercise `POST /api/chat` and `POST /api/chat/stream` from the browser and
    confirm they remain same-origin calls.
  - Confirm the server reaches the configured notebook backend through
    `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`.
  - Exercise a Gemini-backed route with only server-owned `GEMINI_API_KEY`
    configured.
  - After Story 1.13 lands, verify lecture citation hydration against preview
    Supabase data.

### References

- `_bmad-output/implementation-artifacts/plan-vercel-deployment-and-runtime-alignment.md`
- `_bmad-output/planning-artifacts/vercel-deployment.md`
- `_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-22.md`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/1-13-iskcon-bangalore-lecture-inline-url-citation-resolution.md`
- `_bmad-output/project-context.md`
- `app/api/chat/route.ts`
- `app/api/chat/stream/route.ts`
- `lib/chat/server.ts`
- `lib/chat/stream.ts`
- `lib/gemini/server.ts`

## Dev Agent Record

### Agent Model Used

GPT-5.2 (Codex)

### Debug Log References

- `mcp__vercel__.list_teams` -> no accessible Vercel teams returned
- `mcp__vercel__.deploy_to_vercel` -> instructed to use `vercel deploy` from a
  linked project root containing `.vercel/`
- `cat .vercel/project.json` -> file missing
- `vercel whoami` -> `vercel` CLI not installed in this workspace
- `npm test`
- `npm run lint`
- `npm run build`

### Completion Notes List

- Repository verification passed: `npm test`, `npm run lint`, `npm run build`.
- Story `1.13` is now implemented locally, so Supabase hydration code exists and
  is ready for preview validation once a Vercel project is linked.
- Provisioning and preview smoke execution are currently blocked by missing
  Vercel project linkage in the workspace: there is no `.vercel/project.json`,
  no installed `vercel` CLI, no accessible Vercel team/project from the MCP
  account, and no existing preview deployment URL to exercise.
- Because those prerequisites are missing, AC 1-4 could not be completed from
  this environment. Promotion should remain blocked until a linked Vercel
  project exists and Development, Preview, and Production variables are added.
- Recorded environment deviation: local verification is green, but there is no
  connected Vercel Development, Preview, or Production environment to compare.

### File List

- `_bmad-output/implementation-artifacts/1-15-vercel-preview-provisioning-and-smoke-validation.md`
