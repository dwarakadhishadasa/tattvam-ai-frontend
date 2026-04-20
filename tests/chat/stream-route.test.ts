import { afterEach, describe, expect, it, vi } from "vitest"

import { POST } from "../../app/api/chat/stream/route"

vi.mock("../../lib/chat/server", () => ({
  ChatBackendResponseError: class ChatBackendResponseError extends Error {
    status: number

    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
  ChatBackendUnavailableError: class ChatBackendUnavailableError extends Error {},
  requestNormalizedChatResult: vi.fn(),
}))

vi.mock("../../lib/chat/targets", async () => {
  const actual = await vi.importActual<typeof import("../../lib/chat/targets")>(
    "../../lib/chat/targets",
  )

  return {
    ...actual,
    getExtractionChatTargets: vi.fn(),
  }
})

import { requestNormalizedChatResult } from "../../lib/chat/server"
import { getExtractionChatTargets } from "../../lib/chat/targets"

describe("POST /api/chat/stream", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("rejects blank questions before streaming begins", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ question: "   " }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Question is required" })
    expect(getExtractionChatTargets).not.toHaveBeenCalled()
  })

  it("fails before streaming when the target registry is invalid", async () => {
    vi.mocked(getExtractionChatTargets).mockImplementationOnce(() => {
      throw new Error("TATTVAM_EXTRACTION_CHAT_TARGETS_JSON is required")
    })

    const response = await POST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ question: "What is tattvam?" }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON is required",
    })
  })

  it("streams target completion, failure, and final completion events as targets settle", async () => {
    vi.mocked(getExtractionChatTargets).mockReturnValue([
      { key: "one", label: "One", notebookId: "nb-1" },
      { key: "two", label: "Two", notebookId: "nb-2" },
      { key: "three", label: "Three", notebookId: "nb-3" },
      { key: "four", label: "Four", notebookId: "nb-4" },
    ])

    vi.mocked(requestNormalizedChatResult).mockImplementation(async (_question, notebookId) => {
      if (notebookId === "nb-1") {
        await Promise.resolve()
        return {
          answerBody: "First answer",
          citations: [],
          conversationId: null,
          turnNumber: 1,
          isFollowUp: false,
        }
      }

      if (notebookId === "nb-2") {
        throw new Error("Notebook target unavailable")
      }

      if (notebookId === "nb-3") {
        await Promise.resolve()
        return {
          answerBody: "Third answer",
          citations: [],
          conversationId: null,
          turnNumber: 2,
          isFollowUp: false,
        }
      }

      return {
        answerBody: "Fourth answer",
        citations: [],
        conversationId: null,
        turnNumber: 3,
        isFollowUp: false,
      }
    })

    const response = await POST(
      new Request("http://localhost/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ question: "What is tattvam?" }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/event-stream")

    const body = await response.text()

    expect(body).toContain("event: target.completed")
    expect(body).toContain('"key":"one"')
    expect(body).toContain('"key":"three"')
    expect(body).toContain('"key":"four"')
    expect(body).toContain("event: target.failed")
    expect(body).toContain('"key":"two"')
    expect(body).toContain('"error":"Notebook target unavailable"')
    expect(body).toContain("event: chat.completed")
    expect(body).toContain('"totalTargets":4')
    expect(body).toContain('"completedTargets":3')
    expect(body).toContain('"failedTargets":1')
    expect(requestNormalizedChatResult).toHaveBeenCalledWith("What is tattvam?", "nb-1", {
      targetKey: "one",
    })
    expect(requestNormalizedChatResult).toHaveBeenCalledWith("What is tattvam?", "nb-2", {
      targetKey: "two",
    })
  })
})
