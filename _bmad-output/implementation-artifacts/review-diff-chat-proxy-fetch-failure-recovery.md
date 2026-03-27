# Review Diff: Chat Proxy Fetch Failure Recovery

Best-effort diff for this story only. The worktree was already dirty before implementation began, so this review package is intentionally limited to the files changed for the chat proxy fetch-failure fix.

## `lib/chat/server.ts`

```diff
diff --git a/lib/chat/server.ts b/lib/chat/server.ts
index 7d830e5..ec43bdb 100644
--- a/lib/chat/server.ts
+++ b/lib/chat/server.ts
@@ -1,17 +1,55 @@
 const DEFAULT_CHAT_API_URL =
-  "http://0.0.0.0:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask"
+  "http://127.0.0.1:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask"
 
-export function getChatApiUrl(): string {
-  return process.env.TATTVAM_CHAT_API_URL?.trim() || DEFAULT_CHAT_API_URL
+export const CHAT_BACKEND_UNAVAILABLE_MESSAGE =
+  "Chat backend is unavailable. Start the notebook service or set TATTVAM_CHAT_API_URL to a reachable endpoint."
+
+export class ChatBackendUnavailableError extends Error {
+  constructor(message: string, options?: { cause?: unknown }) {
+    super(message)
+    this.name = "ChatBackendUnavailableError"
+
+    if (options && "cause" in options) {
+      this.cause = options.cause
+    }
+  }
+}
+
+export function normalizeChatApiUrl(url: string): string {
+  const trimmedUrl = url.trim()
+
+  if (!trimmedUrl) {
+    return DEFAULT_CHAT_API_URL
+  }
+
+  try {
+    const parsedUrl = new URL(trimmedUrl)
+
+    if (parsedUrl.hostname === "0.0.0.0") {
+      parsedUrl.hostname = "127.0.0.1"
+    }
+
+    return parsedUrl.toString()
+  } catch {
+    return trimmedUrl
+  }
+}
+
+export function getChatApiUrl(rawUrl = process.env.TATTVAM_CHAT_API_URL): string {
+  return normalizeChatApiUrl(rawUrl?.trim() || DEFAULT_CHAT_API_URL)
 }
 
 export async function forwardChatQuestion(question: string): Promise<Response> {
-  return fetch(getChatApiUrl(), {
-    method: "POST",
-    headers: {
-      "Content-Type": "application/json",
-    },
-    body: JSON.stringify({ question }),
-    cache: "no-store",
-  })
+  try {
+    return await fetch(getChatApiUrl(), {
+      method: "POST",
+      headers: {
+        "Content-Type": "application/json",
+      },
+      body: JSON.stringify({ question }),
+      cache: "no-store",
+    })
+  } catch (error) {
+    throw new ChatBackendUnavailableError(CHAT_BACKEND_UNAVAILABLE_MESSAGE, { cause: error })
+  }
 }
```

## `app/api/chat/route.ts`

```diff
diff --git a/app/api/chat/route.ts b/app/api/chat/route.ts
index aeb2084..df8c5f9 100644
--- a/app/api/chat/route.ts
+++ b/app/api/chat/route.ts
@@ -1,6 +1,6 @@
 import { NextRequest, NextResponse } from "next/server"
 
-import { forwardChatQuestion } from "@/lib/chat/server"
+import { ChatBackendUnavailableError, forwardChatQuestion } from "@/lib/chat/server"
 
 export const runtime = "nodejs"
 
@@ -31,6 +31,10 @@ export async function POST(request: NextRequest) {
 
     return NextResponse.json(data)
   } catch (error) {
+    if (error instanceof ChatBackendUnavailableError) {
+      return NextResponse.json({ error: error.message }, { status: 502 })
+    }
+
     const message = error instanceof Error ? error.message : "Unexpected chat proxy failure"
     return NextResponse.json({ error: message }, { status: 500 })
   }
```

## `README.md` and `.env.example`

```diff
diff --git a/.env.example b/.env.example
index fc16cfa..a363859 100644
--- a/.env.example
+++ b/.env.example
@@ -9,4 +9,4 @@ GEMINI_API_KEY="MY_GEMINI_API_KEY"
 APP_URL="MY_APP_URL"
 
 # TATTVAM_CHAT_API_URL: Server-side notebook chat endpoint used by extraction chat.
-TATTVAM_CHAT_API_URL="http://0.0.0.0:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask"
+TATTVAM_CHAT_API_URL="http://127.0.0.1:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask"
diff --git a/README.md b/README.md
index cff1a56..62a02b0 100644
--- a/README.md
+++ b/README.md
@@ -17,6 +17,6 @@ View your app in AI Studio: https://ai.studio/apps/ad340ec1-f98c-4712-85f7-ac0b9
    `npm install`
 2. Set these values in [.env.local](.env.local):
    - `NEXT_PUBLIC_GEMINI_API_KEY` for Gemini-backed style extraction, slide generation, and lecture helper routes
-   - `TATTVAM_CHAT_API_URL` for extraction chat, for example `http://0.0.0.0:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask`
+   - `TATTVAM_CHAT_API_URL` for extraction chat, for example `http://127.0.0.1:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask`
 3. Run the app:
    `npm run dev`
```

## `tests/chat/server.test.ts`

```diff
diff --git a/tests/chat/server.test.ts b/tests/chat/server.test.ts
new file mode 100644
index 0000000..ea45e1f
--- /dev/null
+++ b/tests/chat/server.test.ts
@@ -0,0 +1,52 @@
+import { afterEach, describe, expect, it, vi } from "vitest"
+
+import {
+  CHAT_BACKEND_UNAVAILABLE_MESSAGE,
+  ChatBackendUnavailableError,
+  forwardChatQuestion,
+  getChatApiUrl,
+  normalizeChatApiUrl,
+} from "../../lib/chat/server"
+
+describe("chat server URL resolution", () => {
+  it("uses a client-usable loopback host for the default chat endpoint", () => {
+    expect(getChatApiUrl("")).toContain("http://127.0.0.1:8000/")
+  })
+
+  it("normalizes explicit 0.0.0.0 chat endpoints to 127.0.0.1", () => {
+    expect(
+      normalizeChatApiUrl("http://0.0.0.0:8000/v1/notebooks/notebook-id/chat/ask?mode=full"),
+    ).toBe("http://127.0.0.1:8000/v1/notebooks/notebook-id/chat/ask?mode=full")
+  })
+
+  it("preserves non-loopback chat endpoints", () => {
+    expect(normalizeChatApiUrl("https://example.com/v1/notebooks/notebook-id/chat/ask")).toBe(
+      "https://example.com/v1/notebooks/notebook-id/chat/ask",
+    )
+  })
+})
+
+describe("chat server transport failures", () => {
+  afterEach(() => {
+    vi.restoreAllMocks()
+  })
+
+  it("wraps upstream fetch failures in a chat-backend-unavailable error", async () => {
+    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))
+
+    await expect(forwardChatQuestion("hello")).rejects.toMatchObject({
+      message: CHAT_BACKEND_UNAVAILABLE_MESSAGE,
+      name: "ChatBackendUnavailableError",
+    })
+  })
+
+  it("exposes the classified error type for the route layer", async () => {
+    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))
+
+    try {
+      await forwardChatQuestion("hello")
+    } catch (error) {
+      expect(error).toBeInstanceOf(ChatBackendUnavailableError)
+    }
+  })
+})
```
