---
title: 'Implementation Plan: Backend Endpoint Centralization with Preconfigured Notebook Targets'
type: 'implementation-plan'
created: '2026-03-28'
status: 'proposed'
context:
  - '_bmad-output/implementation-artifacts/spec-backend-endpoint-centralization-dynamic-notebook-targeting.md'
  - '_bmad-output/project-context.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md'
---

## Goal

Centralize notebook-backend URL construction in one dedicated server module and keep Extraction chat bound to a preconfigured notebook target so the app is no longer tied to embedded notebook-specific URLs.

## Target Workflow

1. Server code resolves one normalized notebook-backend origin.
2. Shared helpers build `/v1/notebooks`, `/v1/notebooks/{id}/sources/text`, and `/v1/notebooks/{id}/chat/ask`.
3. `/api/chat` accepts `{ question }`.
4. The route targets the configured Extraction chat notebook id.
5. Notebook creation and source seeding continue using the same shared endpoint builders.

## Scope

### In Scope

- Shared backend endpoint resolution under `lib/`
- Origin normalization and notebook-path builders
- Server-configured Extraction chat notebook targeting
- Shared endpoint reuse by notebook creation and source-text seeding flows
- Environment and documentation updates for the split configuration model

### Out of Scope

- Automatic switching of Extraction chat to the generated notebook
- New notebook-selection UI
- Replacing `generatedNotebookId` with a multi-handle persistence object
- Client-passed notebook ids for chat
- Any change to slide-generation backend behavior

## Implementation Changes

### 1. Shared Backend Endpoint Module

Add [endpoints.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/backend/endpoints.ts):

- Resolve a normalized backend origin from preferred env vars
- Normalize `0.0.0.0` to `127.0.0.1`
- Build notebook collection, chat, and text-source URLs from one source of truth
- Provide helpers for the configured Extraction chat notebook id and its chat URL
- Throw a dedicated configuration error when origin or notebook-id configuration is invalid instead of returning malformed URLs

### 2. Chat Route and Transport

Update [route.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/app/api/chat/route.ts), [server.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/server.ts), and [client.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/chat/client.ts):

- Keep the same-origin chat request free of notebook ids
- Validate configured chat-target availability on the server boundary
- Build the backend chat URL through the shared endpoint module
- Convert fail-fast endpoint-configuration errors into clear route-level misconfiguration responses
- Preserve existing chat normalization and backend-unavailable classification

### 3. Notebook Transport Reuse

Update [server.ts](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/lib/notebooks/server.ts):

- Replace inline notebook endpoint strings with shared builder calls
- Allow endpoint-builder configuration errors to surface clearly instead of being masked as generic fetch failures
- Keep transport ownership and failure classification in the notebook adapter
- Preserve the current `/api/notebooks` browser-facing contract

### 4. Docs and Configuration

Update documentation surfaces such as [README.md](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/README.md), [.env.example](/home/dwarakadas/projects/tattvam-ai/tattvam-ai-frontend/.env.example), and runtime docs:

- Document `TATTVAM_NOTEBOOK_BACKEND_ORIGIN`
- Document `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID`
- Remove legacy full-URL env guidance so configuration is unambiguous

### UI Reuse Impact

No `components/ui` reuse changes are expected because this story is limited to server-boundary adapters, configuration, and documentation.

### 5. Verification

Add or update tests for:

- Origin normalization and endpoint building
- Configured Extraction chat URL building
- Fail-fast configuration-error behavior for malformed origin and missing configured notebook ids
- Misconfiguration behavior when the configured notebook target is missing
- Notebook transport reuse after endpoint centralization

## Suggested Delivery Order

1. Add the shared backend endpoint module.
2. Add fail-fast configuration validation and a dedicated configuration-error type in that module.
3. Migrate notebook transport helpers to the shared builders.
4. Migrate chat transport to the shared builders while keeping the client payload unchanged.
5. Add regression tests for builders, configured chat targeting, and misconfiguration handling.
6. Update docs and env examples.
7. Run lint, test, and build verification.

## Verification Plan

### Commands

- `npm test`
- `npm run lint`
- `npm run build`

### Manual Checks

1. Run with `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` and `TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID` only, then confirm extraction chat still succeeds.
2. Generate a notebook and confirm create-and-seed still works after URL centralization.
3. Set `TATTVAM_NOTEBOOK_BACKEND_ORIGIN` to an invalid absolute URL and confirm the server returns a clear configuration error before any backend fetch is attempted.
4. Remove the default chat notebook id and confirm chat returns a clear configuration error.

## Risks

- If chat target resolution happens partly in the client and partly in the server, notebook routing rules will drift again.
- If configuration validation is weak, the app can fail late with opaque fetch errors instead of clear route-level messages.
- If the story widens persistence prematurely, it can turn a contained endpoint cleanup into a larger state-migration project.
