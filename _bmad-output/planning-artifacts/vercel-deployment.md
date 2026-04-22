# Vercel Deployment Plan

## Goal

Deploy the current Next.js App Router frontend to Vercel without changing the
browser contract, keep notebook services external, and make Story 1.13
deployment-safe by using a server-only Supabase lookup store instead of
file-backed SQLite.

## Recommended Topology

- Vercel hosts the Next.js frontend and same-origin `app/api/**` route handlers.
- All existing route handlers stay on the Node.js runtime.
- The notebook backend remains a separately operated service behind
  `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`.
- Gemini-backed server work continues through `lib/gemini/server.ts` using
  `GEMINI_API_KEY`.
- Story 1.13 lecture citation content is resolved from Supabase by a server-only
  adapter in `lib/`.

## Deployment Decisions

### 1. Treat Vercel as the frontend host of record

Vercel is the default deployment target for the frontend because the repository
is already a conventional Next.js App Router app with server routes and no
custom web-server requirement.

### 2. Keep server routes on the Node.js runtime

Do not migrate `app/api/**` routes to Edge as part of this deployment pass.
Current routes depend on Node-compatible libraries and behaviors such as
`cheerio`, streaming, and multi-service fetch orchestration.

### 3. Keep the notebook backend external

The notebook backend should remain independently deployed for now. The frontend
continues calling it only through same-origin route handlers and env-configured
server adapters.

### 4. Standardize on server-owned secrets

Vercel Production, Preview, and Development environments should define the
server-owned values directly in Project Settings. Browser code should not depend
on notebook or Supabase credentials.

### 5. Use Supabase for Story 1.13 lecture citation content

The lecture citation lookup store should be networked and server-owned. Supabase
fits the Vercel runtime model more cleanly than SQLite because it avoids mutable
filesystem assumptions and works the same way in preview and production.

## Required Environment Variables

| Name | Required | Purpose |
|------|----------|---------|
| `GEMINI_API_KEY` | Yes | Server-side Gemini access for lecture and slide routes |
| `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` | Yes | External notebook backend origin used by route handlers |
| `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` | Yes | Legacy single-target notebook id for `POST /api/chat` |
| `TATTVAM_EXTRACTION_CHAT_TARGETS_JSON` | Yes | Approved four-target registry for `POST /api/chat/stream` |
| `SUPABASE_URL` | Story 1.13 | Supabase project URL for lecture citation lookup |
| `SUPABASE_SERVICE_ROLE_KEY` | Story 1.13 | Server-only Supabase key for citation lookup |
| `TATTVAM_LECTURE_CITATIONS_TABLE` | Optional | Override for the lecture citation table name if the default changes |

## Deployment Rules

- Production, Preview, and Development must each define their own environment
  values in Vercel.
- Preview deployments should default to non-production notebook and Supabase
  resources unless the team explicitly wants shared datasets.
- The browser must continue calling same-origin `/api/*` routes rather than
  external notebook or Supabase URLs.
- Missing or malformed environment variables must fail fast in server code before
  any downstream fetch or database query is attempted.

## Story 1.13 Data Boundary

For `ISKCON Bangalore Lectures`, the planned lookup boundary is:

1. Parse inline URL citations from `answerBody`.
2. Canonicalize them to deterministic numeric citations.
3. Query Supabase on the server by canonical URL.
4. Return the existing browser-facing `Citation[]` shape with `number`, `url`,
   and `text`.

The browser does not know that Supabase is involved.

## Rollout Sequence

1. Create the Vercel project and connect the repository.
2. Configure Production, Preview, and Development environment variables.
3. Confirm Vercel previews can reach the notebook backend over the configured
   origin.
4. Implement Story 1.13 against the Supabase-backed citation store.
5. Run preview smoke tests for chat, streaming, slide routes, and lecture
   citation hydration.
6. Promote the first deployment only after preview verification passes.

## Smoke Checklist

- Open a Vercel preview and confirm the app shell renders.
- Send a normal extraction chat request and confirm `/api/chat` reaches the
  notebook backend.
- Confirm `/api/chat/stream` still emits the four approved targets.
- Trigger verse scraping and confirm the Node.js route continues working.
- Validate Gemini-backed slide or style routes with `GEMINI_API_KEY` configured.
- Validate Story 1.13 lecture citation lookup against Supabase once implemented.

## Non-Goals

- Moving the notebook backend into Vercel as part of this pass
- Migrating route handlers to Edge
- Exposing Supabase to the browser for lecture citation lookup
- Introducing a general-purpose server-side session database
