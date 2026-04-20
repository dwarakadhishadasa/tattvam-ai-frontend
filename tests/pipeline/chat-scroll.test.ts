import { describe, expect, it } from "vitest"

import { shouldAutoScrollToLatestMessage } from "../../components/pipeline/chatScroll"
import type { Message } from "../../components/pipeline/types"

describe("chat scroll helpers", () => {
  it("scrolls when a new user message is appended", () => {
    const messages: Message[] = [
      {
        id: "assistant-1",
        role: "assistant",
        content: "Hello",
      },
      {
        id: "user-1",
        role: "user",
        content: "Question",
      },
    ]

    expect(shouldAutoScrollToLatestMessage(1, messages)).toBe(true)
  })

  it("does not scroll when an assistant message is appended", () => {
    const messages: Message[] = [
      {
        id: "user-1",
        role: "user",
        content: "Question",
      },
      {
        id: "assistant-1",
        role: "assistant",
        content: "Answer",
      },
    ]

    expect(shouldAutoScrollToLatestMessage(1, messages)).toBe(false)
  })

  it("does not scroll when existing assistant output is updated in place", () => {
    const messages: Message[] = [
      {
        id: "user-1",
        role: "user",
        content: "Question",
      },
      {
        id: "assistant-1",
        role: "assistant",
        content: "Updated answer",
      },
    ]

    expect(shouldAutoScrollToLatestMessage(messages.length, messages)).toBe(false)
  })
})
