import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CHAT_BACKEND_UNAVAILABLE_MESSAGE,
  ChatBackendUnavailableError,
  forwardChatQuestion,
  forwardChatQuestionToNotebook,
} from "../../lib/chat/server"
import * as backendEndpoints from "../../lib/backend/endpoints"

describe("chat server transport failures", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves the default extraction chat target through the shared endpoint builder", async () => {
    const endpointSpy = vi
      .spyOn(backendEndpoints, "getDefaultExtractionChatUrl")
      .mockReturnValue("http://127.0.0.1:8000/v1/notebooks/extraction-id/chat/ask")
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await forwardChatQuestion("hello")

    expect(endpointSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/notebooks/extraction-id/chat/ask",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: "hello" }),
        cache: "no-store",
      },
    )
  })

  it("wraps upstream fetch failures in a chat-backend-unavailable error", async () => {
    vi.spyOn(backendEndpoints, "getDefaultExtractionChatUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/extraction-id/chat/ask",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(forwardChatQuestion("hello")).rejects.toMatchObject({
      message: CHAT_BACKEND_UNAVAILABLE_MESSAGE,
      name: "ChatBackendUnavailableError",
    })
  })

  it("exposes the classified error type for the route layer", async () => {
    vi.spyOn(backendEndpoints, "getDefaultExtractionChatUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/extraction-id/chat/ask",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    try {
      await forwardChatQuestion("hello")
    } catch (error) {
      expect(error).toBeInstanceOf(ChatBackendUnavailableError)
    }
  })

  it("builds per-target notebook chat URLs through the shared endpoint helper", async () => {
    const endpointSpy = vi
      .spyOn(backendEndpoints, "getNotebookChatUrl")
      .mockReturnValue("http://127.0.0.1:8000/v1/notebooks/target-id/chat/ask")
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await forwardChatQuestionToNotebook("hello", " target-id ")

    expect(endpointSpy).toHaveBeenCalledWith(" target-id ")
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/notebooks/target-id/chat/ask",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: "hello" }),
        cache: "no-store",
      },
    )
  })
})
