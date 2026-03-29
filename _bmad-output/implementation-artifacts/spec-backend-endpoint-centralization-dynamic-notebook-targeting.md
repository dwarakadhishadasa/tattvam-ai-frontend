---
title: 'Backend Endpoint Centralization with Preconfigured Notebook Targets'
type: 'feature'
created: '2026-03-28'
status: 'done'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/implementation-artifacts/spec-chat-proxy-fetch-failure-recovery.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Backend endpoint details are currently embedded inside feature-specific server adapters. `lib/chat/server.ts` hardcodes a notebook-specific default chat URL, while `lib/notebooks/server.ts` separately owns notebook collection and source-upload URL strings. That mixes endpoint composition with transport code, spreads backend configuration across files, and makes it awkward to support more than one notebook target.

**Approach:** Move backend endpoint construction into one dedicated server-owned module that resolves a normalized backend origin and builds notebook routes from explicit inputs. Separate backend origin configuration from notebook resource identifiers. Keep Extraction chat fully preconfigured on the server so the browser never chooses or passes notebook ids, while still removing hardcoded notebook-specific URLs from feature adapters.

## Boundaries & Constraints

**Always:** Keep the browser talking only to same-origin Next.js routes; centralize backend URL construction in one dedicated `lib/` module; derive notebook collection, text-source, and chat URLs from a shared backend origin; keep raw backend path and snake_case handling on the server boundary.

**Ask First:** Automatically switching Extraction chat to the newly generated notebook; widening persisted session state from one `generatedNotebookId` field to a multi-handle notebook map; introducing notebook-target selection UI.

**Never:** Keep notebook-specific backend URLs embedded in multiple server files; require client components to concatenate backend paths; make future multi-notebook support depend on editing string literals in transport helpers.

## Proposed Configuration Contract

### Preferred Environment Variables

Use a split configuration model:

```env
TATTVAM_NOTEBOOK_BACKEND_ORIGIN=http://127.0.0.1:8000
TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID=da406743-a373-47f9-9275-6c2e1e86c2b6
```

Rationale:

- `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` configures where the notebook service lives.
- `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` configures which backend notebook Extraction chat should use.

## Endpoint Builder Contract

The dedicated backend-endpoint module should expose functions along these lines:

```ts
getNotebookBackendOrigin()
getNotebooksUrl()
getNotebookSetSourceUrl(notebookId: string)
getDefaultExtractionChatNotebookId()
getDefaultExtractionChatUrl()
```

Behavior rules:

- Normalize `0.0.0.0` to `127.0.0.1` at the origin level.
- Throw a dedicated configuration error when the backend origin is malformed instead of building an invalid fetch URL.
- Treat blank configured notebook IDs as invalid configuration rather than building malformed paths.
- Treat blank `notebookId` input for `getNotebookSetSourceUrl(...)` as invalid input and fail fast.
- Keep notebook path ownership in one place so chat and notebook flows cannot drift.

## Local Route Contract

### `/api/chat`

Keep the local request body as:

```json
{ "question": "What are the main teachings on envy?" }
```

Rules:

- `question` remains required.
- The client never passes `notebookId`.
- The server always targets the notebook configured by `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`.
- If the configured default notebook id is blank or missing, `/api/chat` returns an actionable configuration error instead of silently targeting the wrong notebook.

### `/api/notebooks`

The current browser contract can remain unchanged. The route continues to accept the existing create-and-seed payload, but it must reuse the same endpoint builder module for:

- `POST /v1/notebooks`
- `POST /v1/notebooks/{notebook_id}/sources/text`

## Notebook-ID Strategy

This story should support multiple notebook identifiers in the codebase without forcing a broad client-state redesign immediately.

Approved approach for this story:

- Keep `generatedNotebookId` as the current persisted handle for the generated Presentation notebook.
- Keep Extraction chat bound to one configured backend notebook id.
- Keep the selection policy explicit in centralized server configuration instead of inferring it from scattered code.

Deferred until product intent is clearer:

- Replacing `generatedNotebookId` with a persisted `notebookTargets` object
- Automatically re-pointing Extraction chat to a newly created notebook
- Supporting notebook-target switching UI in-session
- Allowing the client to choose chat notebook targets per request

## User Flow

1. Extraction chat sends `{ question }` to `/api/chat`.
2. The route resolves the configured Extraction chat notebook id from server configuration.
3. The shared endpoint module builds `POST /v1/notebooks/{notebook_id}/chat/ask`.
4. Notebook creation continues through `/api/notebooks`, which now uses the same endpoint module to build collection and source-upload URLs.
5. A follow-on story can later decide whether any notebook-target switching behavior should exist at all.

## Code Map

- `lib/backend/endpoints.ts` -- origin normalization, configuration access, endpoint builders, and fail-fast configuration validation
- `lib/chat/server.ts` -- transport ownership only; delegate chat URL building to the centralized endpoint module
- `app/api/chat/route.ts` -- validate `{ question }`, resolve the configured chat target, and preserve normalized success/error behavior
- `lib/chat/client.ts` -- keep the same-origin request payload minimal and notebook-id-free
- `lib/notebooks/server.ts` -- reuse shared notebook collection and source-upload URL builders
- `.env.example`, `README.md`, and runtime docs -- describe the split origin-plus-preconfigured-notebook-id configuration

## UI Impact

This change is server-boundary and configuration focused. No `components/ui` reuse changes or new shared UI primitives are expected in this story.

## Tasks & Acceptance

**Execution:**
- [ ] Add a shared backend-endpoint module under `lib/` and move notebook-service URL construction there.
- [ ] Add a notebook-backend configuration error type and let the endpoint module fail fast on invalid origin or missing configured notebook ids.
- [ ] Update notebook transport helpers to consume shared endpoint builders instead of inline URL strings.
- [ ] Keep `/api/chat` and the local chat client notebook-id-free while resolving the configured Extraction chat notebook target on the server.
- [ ] Preserve current route-owned normalization and transport failure handling.
- [ ] Document the new required environment variables without legacy compatibility handling.

**Acceptance Criteria:**
- Given the backend origin is unset or configured with `0.0.0.0`, when the shared endpoint module resolves URLs, then it produces a client-usable loopback origin and derives notebook collection, source-upload, and chat paths from that same origin.
- Given `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` is malformed or the configured Extraction chat notebook id is blank, when the endpoint module resolves a backend URL, then it throws a dedicated configuration error before any fetch is attempted.
- Given notebook creation or source-text seeding runs, when the server adapters call the backend, then they reuse the shared endpoint module rather than assembling inline endpoint strings.
- Given `/api/chat` is called from Extraction, when the route forwards the request, then it targets `POST /v1/notebooks/{configured_notebook_id}/chat/ask` using the configured Extraction chat notebook id.
- Given the configured Extraction chat notebook id is blank or missing, when `/api/chat` is called, then the route returns a clear misconfiguration error instead of silently using an unrelated notebook.

</frozen-after-approval>

## Design Notes

The important architectural decision is to separate "where the backend lives" from "which preconfigured notebook a server-owned flow should target." Those are different axes of change, and treating them as one full URL is why the current codebase has a hardcoded notebook id hiding inside the chat transport.

I am intentionally not forcing a persistence-schema rewrite in this story. The real immediate win is to make endpoint construction parametric and shared. Once that exists, the product can decide later whether chat should stay on its configured source notebook forever or whether a separate story should introduce notebook-role switching.

I also want the endpoint module to fail fast on bad configuration. That keeps invalid origins and missing configured notebook ids from degrading into vague transport failures later in the call chain.

## Spec Change Log

- Replace feature-local backend URL literals with one shared backend-endpoint module.
- Separate notebook backend origin configuration from notebook-target identifiers.
- Keep Extraction chat notebook targeting fully preconfigured on the server boundary.

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Configure only `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` plus `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` and confirm chat plus notebook creation still work.
- Create and seed a notebook and confirm the notebook routes still behave correctly after endpoint centralization.
- Remove the default extraction chat notebook id and confirm `/api/chat` returns a clear configuration error.
