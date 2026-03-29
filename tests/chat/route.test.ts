import { afterEach, describe, expect, it, vi } from "vitest"

import { POST } from "../../app/api/chat/route"

vi.mock("../../lib/chat/server", () => ({
  ChatBackendUnavailableError: class ChatBackendUnavailableError extends Error {},
  forwardChatQuestion: vi.fn(),
}))

import { forwardChatQuestion } from "../../lib/chat/server"

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("keeps the browser contract notebook-id-free and returns the normalized response", async () => {
    vi.mocked(forwardChatQuestion).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            answer: "Grounded response",
            references: [],
          },
        }),
        { status: 200 },
      ),
    )

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          question: " What is tattvam? ",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(vi.mocked(forwardChatQuestion)).toHaveBeenCalledWith("What is tattvam?")
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: {
        answerBody: "Grounded response",
        citations: [],
        conversationId: null,
        turnNumber: null,
        isFollowUp: null,
      },
    })
  })

  it("returns a clear misconfiguration response before fetch when chat endpoint resolution is invalid", async () => {
    vi.mocked(forwardChatQuestion).mockRejectedValueOnce(
      new Error("TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID is required"),
    )

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          question: "What is tattvam?",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: "TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID is required",
    })
  })
})
