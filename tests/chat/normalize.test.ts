import { describe, expect, it } from "vitest"

import { normalizeDownstreamChatResponse } from "../../lib/chat/normalize"

describe("chat normalization", () => {
  it("normalizes prose, appendix citations, and conversation metadata", () => {
    const normalized = normalizeDownstreamChatResponse({
      ok: true,
      result: {
        answer: [
          "Answer body with inline references [1] and [2].",
          "",
          "## Citations and Timestamped URLs",
          "",
          "[2] https://youtu.be/BBBBBBBBBBB?t=84",
          "[1] https://youtu.be/AAAAAAAAAAA?t=42",
          "[9] https://youtu.be/ORPHANAAAAA?t=21",
        ].join("\n"),
        conversation_id: "conversation-123",
        turn_number: 7,
        is_follow_up: true,
        references: [
          {
            citation_number: 1,
            cited_text: "First citation excerpt",
          },
          {
            citation_number: 2,
            cited_text: "Second citation excerpt",
          },
        ],
      },
    })

    expect(normalized).toEqual({
      ok: true,
      result: {
        answerBody: "Answer body with inline references [1] and [2].",
        citations: [
          {
            number: 1,
            text: "First citation excerpt",
            url: "https://youtu.be/AAAAAAAAAAA?t=42",
          },
          {
            number: 2,
            text: "Second citation excerpt",
            url: "https://youtu.be/BBBBBBBBBBB?t=84",
          },
        ],
        conversationId: "conversation-123",
        turnNumber: 7,
        isFollowUp: true,
      },
    })
  })

  it("strips a structurally citation-shaped appendix even when the heading changes", () => {
    const normalized = normalizeDownstreamChatResponse({
      ok: true,
      result: {
        answer: [
          "Answer body with inline reference [3].",
          "",
          "### Evidence Trail",
          "",
          "3. [3] https://youtu.be/CCCCCCCCCCC?t=126",
        ].join("\n"),
        references: [
          {
            citation_number: 3,
            cited_text: "Third citation excerpt",
          },
        ],
      },
    })

    expect(normalized?.result.answerBody).toBe("Answer body with inline reference [3].")
    expect(normalized?.result.citations).toEqual([
      {
        number: 3,
        text: "Third citation excerpt",
        url: "https://youtu.be/CCCCCCCCCCC?t=126",
      },
    ])
  })

  it("prefers explicit reference urls over appendix-derived mappings", () => {
    const normalized = normalizeDownstreamChatResponse({
      ok: true,
      result: {
        answer: [
          "Answer body with inline reference [4].",
          "",
          "[4] https://youtu.be/DDDDDDDDDDD?t=126",
        ].join("\n"),
        references: [
          {
            citation_number: 4,
            cited_text: "Fourth citation excerpt",
            timestamped_url: "https://youtu.be/EEEEEEEEEEE?t=512",
          },
        ],
      },
    })

    expect(normalized?.result.citations).toEqual([
      {
        number: 4,
        text: "Fourth citation excerpt",
        url: "https://youtu.be/EEEEEEEEEEE?t=512",
      },
    ])
  })

  it("preserves prose when the trailing block is ambiguous instead of over-stripping", () => {
    const answer = [
      "Answer body with inline reference [5].",
      "",
      "This closing paragraph includes a helpful video https://youtu.be/FFFFFFFFFFF?t=24",
    ].join("\n")

    const normalized = normalizeDownstreamChatResponse({
      ok: true,
      result: {
        answer,
        references: [
          {
            citation_number: 5,
            cited_text: "Fifth citation excerpt",
          },
        ],
      },
    })

    expect(normalized?.result.answerBody).toBe(answer)
    expect(normalized?.result.citations).toEqual([
      {
        number: 5,
        text: "Fifth citation excerpt",
        url: "",
      },
    ])
  })
})
