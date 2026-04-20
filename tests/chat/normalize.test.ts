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

  it("normalizes lecture citations by cited number, prunes uncited references, and keeps clean url/content fields", () => {
    const normalized = normalizeDownstreamChatResponse(
      {
        ok: true,
        result: {
          answer: "Lecture answer with citations [7] and [2, 9-10].",
          references: [
            {
              citation_number: 99,
              cited_text:
                "Themes: Leadership\nURL: https://www.youtube.com/watch?v=ZZZZZZZZZZZ&t=15s\nContent: Should be pruned",
            },
            {
              citation_number: 10,
              cited_text:
                "Themes: Service\nURL: https://www.youtube.com/watch?v=AAAAAAAAAAA&t=40s\nContent: Tenth excerpt\nAudience: Youth",
            },
            {
              citation_number: 7,
              cited_text:
                "Themes: Bhakti\nURL: https://www.youtube.com/watch?v=BBBBBBBBBBB&t=50s\nContent-type: Lecture\nContent: Seventh excerpt",
            },
            {
              citation_number: 2,
              cited_text:
                "Themes: Sadhana\nURL: https://www.youtube.com/watch?v=CCCCCCCCCCC&t=60s\nContent: Second excerpt",
            },
          ],
        },
      },
      { targetKey: "ISKCON Bangalore Lectures" },
    )

    expect(normalized?.result.citations).toEqual([
      {
        number: 2,
        text: "Second excerpt",
        url: "https://www.youtube.com/watch?v=CCCCCCCCCCC&t=60s",
      },
      {
        number: 7,
        text: "Seventh excerpt",
        url: "https://www.youtube.com/watch?v=BBBBBBBBBBB&t=50s",
      },
      {
        number: 10,
        text: "Tenth excerpt",
        url: "https://www.youtube.com/watch?v=AAAAAAAAAAA&t=40s",
      },
    ])
  })

  it("keeps lecture citations when content is missing but an explicit url field exists", () => {
    const normalized = normalizeDownstreamChatResponse(
      {
        ok: true,
        result: {
          answer: "Lecture answer with citation [4].",
          references: [
            {
              citation_number: 4,
              cited_text: "Themes: Outreach\nAudience: Temple devotees",
              url: "https://www.youtube.com/watch?v=DDDDDDDDDDD&t=120s",
            },
          ],
        },
      },
      { targetKey: "ISKCON Bangalore Lectures" },
    )

    expect(normalized?.result.citations).toEqual([
      {
        number: 4,
        text: "",
        url: "https://www.youtube.com/watch?v=DDDDDDDDDDD&t=120s",
      },
    ])
  })

  it("keeps lecture citations when url markers are missing but content exists", () => {
    const normalized = normalizeDownstreamChatResponse(
      {
        ok: true,
        result: {
          answer: "Lecture answer with citation [6].",
          references: [
            {
              citation_number: 6,
              cited_text: "Themes: Compassion\nContent: Sixth excerpt",
            },
          ],
        },
      },
      { targetKey: "ISKCON Bangalore Lectures" },
    )

    expect(normalized?.result.citations).toEqual([
      {
        number: 6,
        text: "Sixth excerpt",
        url: "",
      },
    ])
  })

  it("keeps the first valid lecture reference when duplicate citation numbers appear", () => {
    const normalized = normalizeDownstreamChatResponse(
      {
        ok: true,
        result: {
          answer: "Lecture answer with citation [8].",
          references: [
            {
              citation_number: 8,
              cited_text:
                "URL: https://www.youtube.com/watch?v=EEEEEEEEEEE&t=33s\nContent: First winner",
            },
            {
              citation_number: 8,
              cited_text:
                "URL: https://www.youtube.com/watch?v=FFFFFFFFFFF&t=44s\nContent: Duplicate loser",
            },
          ],
        },
      },
      { targetKey: "ISKCON Bangalore Lectures" },
    )

    expect(normalized?.result.citations).toEqual([
      {
        number: 8,
        text: "First winner",
        url: "https://www.youtube.com/watch?v=EEEEEEEEEEE&t=33s",
      },
    ])
  })

  it("does not apply the lecture parser to non-lecture targets", () => {
    const normalized = normalizeDownstreamChatResponse(
      {
        ok: true,
        result: {
          answer: "Answer body with inline reference [3].",
          references: [
            {
              citation_number: 3,
              cited_text:
                "Themes: Bhakti\nURL: https://www.youtube.com/watch?v=GGGGGGGGGGG&t=77s\nContent: Generic path should keep full blob",
            },
          ],
        },
      },
      { targetKey: "Bhaktivedanta NotebookLM" },
    )

    expect(normalized?.result.citations).toEqual([
      {
        number: 3,
        text:
          "Themes: Bhakti\nURL: https://www.youtube.com/watch?v=GGGGGGGGGGG&t=77s\nContent: Generic path should keep full blob",
        url: "https://www.youtube.com/watch?v=GGGGGGGGGGG&t=77s",
      },
    ])
  })
})
