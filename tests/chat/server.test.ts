import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CHAT_BACKEND_UNAVAILABLE_MESSAGE,
  ChatBackendUnavailableError,
  forwardChatQuestion,
  getChatApiUrl,
  normalizeChatApiUrl,
} from "../../lib/chat/server"

describe("chat server URL resolution", () => {
  it("uses a client-usable loopback host for the default chat endpoint", () => {
    expect(getChatApiUrl("")).toContain("http://127.0.0.1:8000/")
  })

  it("normalizes explicit 0.0.0.0 chat endpoints to 127.0.0.1", () => {
    expect(
      normalizeChatApiUrl("http://0.0.0.0:8000/v1/notebooks/notebook-id/chat/ask?mode=full"),
    ).toBe("http://127.0.0.1:8000/v1/notebooks/notebook-id/chat/ask?mode=full")
  })

  it("preserves non-loopback chat endpoints", () => {
    expect(normalizeChatApiUrl("https://example.com/v1/notebooks/notebook-id/chat/ask")).toBe(
      "https://example.com/v1/notebooks/notebook-id/chat/ask",
    )
  })
})

describe("chat server transport failures", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("wraps upstream fetch failures in a chat-backend-unavailable error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(forwardChatQuestion("hello")).rejects.toMatchObject({
      message: CHAT_BACKEND_UNAVAILABLE_MESSAGE,
      name: "ChatBackendUnavailableError",
    })
  })

  it("exposes the classified error type for the route layer", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    try {
      await forwardChatQuestion("hello")
    } catch (error) {
      expect(error).toBeInstanceOf(ChatBackendUnavailableError)
    }
  })
})
