---
title: 'Chat Proxy Fetch Failure Recovery'
type: 'bugfix'
created: '2026-03-27'
status: 'done'
baseline_commit: '946b37e9b4e893ce623f9b4c844f10b4919f7c97'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/runtime-interfaces.md'
  - '_bmad-output/planning-artifacts/quickstart.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Extraction chat currently fails before it reaches the notebook backend because the default server-side endpoint uses `http://0.0.0.0:8000/...`, which reproduces as a low-level `fetch failed` error in Node. The API route forwards that raw transport failure back to the browser, so users only see an opaque chat error instead of a working request or an actionable message.

**Approach:** Keep the existing `/api/chat` proxy contract and parsed chat response shape, but make the server-side adapter safe for local development by resolving `0.0.0.0` loopback destinations to a client-usable host, preserving explicit non-loopback overrides, and returning a clearer backend-unavailable message when the upstream fetch still cannot connect. Update the local setup examples to match the fixed endpoint.

## Boundaries & Constraints

**Always:** Preserve `POST /api/chat` as the frontend entry point; preserve the existing request body shape `{ question }`; preserve successful backend responses unchanged; treat only loopback bind addresses such as `0.0.0.0` as rewrite candidates; keep explicit remote hosts and paths intact; return structured JSON errors from the API route.

**Ask First:** Changing the extraction chat UI flow beyond error text; introducing retries, timeouts, or circuit-breaker behavior; changing the notebook backend API contract; replacing the server proxy with a direct browser-to-backend call.

**Never:** Keep `0.0.0.0` as the documented client destination for local chat; leak a raw undici `fetch failed` message to the user when the proxy can provide a clearer explanation; break existing successful chat parsing or citation behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default local endpoint | `TATTVAM_CHAT_API_URL` is unset, so chat uses the built-in default | Server proxy targets the same notebook path on a client-usable loopback host and can reach a locally running backend | If the backend is not running, API returns a clear unavailable message instead of raw `fetch failed` |
| Explicit loopback bind address | `TATTVAM_CHAT_API_URL` is set to `http://0.0.0.0:8000/...` | Server normalizes only the host and preserves protocol, port, path, and query | If connection still fails, API returns JSON with actionable error text |
| Explicit remote endpoint | `TATTVAM_CHAT_API_URL` is set to a non-loopback host such as `https://example.com/...` | Server uses the configured URL as-is | Upstream non-OK responses continue to flow through the existing error mapping |
| Upstream transport failure | Backend host is unreachable or refused | Frontend receives a stable human-readable error from `/api/chat` | Proxy catches the thrown fetch error and returns a 502-style backend unavailable response payload |

</frozen-after-approval>

## Code Map

- `lib/chat/server.ts` -- owns chat endpoint resolution and upstream fetch behavior
- `app/api/chat/route.ts` -- maps upstream transport and backend failures into JSON responses for the client
- `lib/chat/client.ts` -- surfaces API error text to the UI without changing the request contract
- `README.md` -- local setup instructions for the chat backend URL
- `.env.example` -- sample environment variable for local chat backend configuration
- `tests/chat/server.test.ts` -- regression coverage for endpoint normalization and transport-failure messaging

## Tasks & Acceptance

**Execution:**
- [x] `lib/chat/server.ts` -- normalize loopback bind-address chat URLs to a client-usable host and preserve explicit remote overrides
- [x] `lib/chat/server.ts` -- wrap upstream transport failures in a stable application error that the route can classify
- [x] `app/api/chat/route.ts` -- convert unreachable-backend failures into a clear JSON error response without changing successful passthrough behavior
- [x] `README.md` -- replace the local chat endpoint example with a client-usable loopback URL and note the env var purpose clearly
- [x] `.env.example` -- update the sample chat endpoint to match the fixed local default
- [x] `tests/chat/server.test.ts` -- cover default URL normalization, explicit `0.0.0.0` normalization, remote URL passthrough, and transport-failure error messaging

**Acceptance Criteria:**
- Given the extraction chat backend is configured with the current local default, when `/api/chat` forwards a question, then it uses a client-usable loopback destination instead of `0.0.0.0`.
- Given `TATTVAM_CHAT_API_URL` is explicitly set to `http://0.0.0.0:8000/...`, when the server forwards chat, then it preserves the endpoint path but rewrites the host to a usable loopback address.
- Given `TATTVAM_CHAT_API_URL` points to a non-loopback host, when the server forwards chat, then it does not rewrite the configured endpoint.
- Given the upstream chat backend is unreachable, when the frontend posts to `/api/chat`, then the response contains a clear backend-unavailable error message rather than the raw text `fetch failed`.
- Given the upstream backend returns a normal success payload, when `/api/chat` completes, then the frontend still receives the unchanged backend JSON for existing parsing and citation rendering.

## Spec Change Log

## Verification

**Commands:**
- `npm test -- tests/chat/server.test.ts` -- expected: chat adapter regression coverage passes
- `npm run lint` -- expected: updated server, route, and docs changes introduce no lint errors
