import { describe, expect, it, vi } from "vitest"

import {
  extractChatStreamMessages,
  parseChatStreamMessage,
  streamChatQuestion,
} from "../../lib/chat/client"

describe("chat stream client helpers", () => {
  it("splits complete sse messages from a buffered chunk stream", () => {
    const parsed = extractChatStreamMessages(
      'event: target.completed\ndata: {"target":{"key":"one","label":"One"},"result":{"answerBody":"A","citations":[],"conversationId":null,"turnNumber":1,"isFollowUp":false}}\n\npartial',
    )

    expect(parsed.messages).toHaveLength(1)
    expect(parsed.remainder).toBe("partial")
  })

  it("parses typed target and completion events", () => {
    expect(
      parseChatStreamMessage(
        'event: target.failed\ndata: {"target":{"key":"one","label":"One"},"error":"Failed"}',
      ),
    ).toEqual({
      event: "target.failed",
      data: {
        target: {
          key: "one",
          label: "One",
        },
        error: "Failed",
      },
    })

    expect(
      parseChatStreamMessage(
        'event: chat.completed\ndata: {"totalTargets":4,"completedTargets":3,"failedTargets":1}',
      ),
    ).toEqual({
      event: "chat.completed",
      data: {
        totalTargets: 4,
        completedTargets: 3,
        failedTargets: 1,
      },
    })
  })

  it("consumes a streamed response incrementally and dispatches callbacks", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        createEventStream([
          'event: target.completed\ndata: {"target":{"key":"one","label":"One"},"result":{"answerBody":"A","citations":[],"conversationId":null,"turnNumber":1,"isFollowUp":false}}\n\n',
          'event: target.failed\ndata: {"target":{"key":"two","label":"Two"},"error":"Failed"}\n\n',
          'event: chat.completed\ndata: {"totalTargets":2,"completedTargets":1,"failedTargets":1}\n\n',
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
          },
        },
      ),
    )

    const onTargetCompleted = vi.fn()
    const onTargetFailed = vi.fn()
    const onChatCompleted = vi.fn()

    await streamChatQuestion("What is tattvam?", {
      onTargetCompleted,
      onTargetFailed,
      onChatCompleted,
    })

    expect(fetchMock).toHaveBeenCalledWith("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "What is tattvam?" }),
    })
    expect(onTargetCompleted).toHaveBeenCalledWith({
      target: {
        key: "one",
        label: "One",
      },
      result: {
        answerBody: "A",
        citations: [],
        conversationId: null,
        turnNumber: 1,
        isFollowUp: false,
      },
    })
    expect(onTargetFailed).toHaveBeenCalledWith({
      target: {
        key: "two",
        label: "Two",
      },
      error: "Failed",
    })
    expect(onChatCompleted).toHaveBeenCalledWith({
      totalTargets: 2,
      completedTargets: 1,
      failedTargets: 1,
    })
  })
})

function createEventStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }

      controller.close()
    },
  })
}
