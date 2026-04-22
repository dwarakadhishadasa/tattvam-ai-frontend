import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  CHAT_BACKEND_UNAVAILABLE_MESSAGE,
  ChatBackendUnavailableError,
  forwardChatQuestion,
  forwardChatQuestionToNotebook,
  requestNormalizedChatResult,
} from "../../lib/chat/server"
import * as backendEndpoints from "../../lib/backend/endpoints"
import * as citationContentStore from "../../lib/chat/citation-content-store"
import * as chatNormalize from "../../lib/chat/normalize"

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

  it("passes the completed target key into response normalization when provided", async () => {
    vi.spyOn(backendEndpoints, "getNotebookChatUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/target-id/chat/ask",
    )
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            answer: "Answer body [1].",
            references: [],
          },
        }),
        { status: 200 },
      ),
    )
    const normalizeSpy = vi.spyOn(chatNormalize, "normalizeDownstreamChatResponse")

    await requestNormalizedChatResult("hello", "target-id", {
      targetKey: "ISKCON Bangalore Lectures",
    })

    expect(normalizeSpy).toHaveBeenCalledWith(
      {
        ok: true,
        result: {
          answer: "Answer body [1].",
          references: [],
        },
      },
      { targetKey: "ISKCON Bangalore Lectures" },
    )
  })

  it("hydrates lecture citation text from the citation content store", async () => {
    vi.spyOn(backendEndpoints, "getNotebookChatUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/target-id/chat/ask",
    )
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            answer: "Answer body [1].",
            references: [],
          },
        }),
        { status: 200 },
      ),
    )
    vi.spyOn(chatNormalize, "normalizeDownstreamChatResponse").mockReturnValue({
      ok: true,
      result: {
        answerBody: "Answer body [1].",
        citations: [
          {
            number: 1,
            text: "",
            url: "https://youtu.be/AAAAABBBBB1?t=11",
          },
          {
            number: 2,
            text: "",
            url: "https://youtu.be/CCCCCDDDDD2?t=22",
          },
        ],
        conversationId: null,
        turnNumber: 1,
        isFollowUp: false,
      },
    })
    const storeSpy = vi.spyOn(citationContentStore, "getCitationContentByUrls").mockResolvedValue(
      new Map([["https://youtu.be/AAAAABBBBB1?t=11", "Hydrated lecture excerpt"]]),
    )

    const result = await requestNormalizedChatResult("hello", "target-id", {
      targetKey: "ISKCON Bangalore Lectures",
    })

    expect(storeSpy).toHaveBeenCalledWith([
      "https://youtu.be/AAAAABBBBB1?t=11",
      "https://youtu.be/CCCCCDDDDD2?t=22",
    ])
    expect(result.citations).toEqual([
      {
        number: 1,
        text: "Hydrated lecture excerpt",
        url: "https://youtu.be/AAAAABBBBB1?t=11",
      },
      {
        number: 2,
        text: "",
        url: "https://youtu.be/CCCCCDDDDD2?t=22",
      },
    ])
  })
})
