import { describe, expect, it } from "vitest"

import { parseBackendChatResponse, stripCitationAppendix } from "../../lib/chat/shared"

describe("chat response parsing", () => {
  it("strips a persisted citations appendix from restored assistant content", () => {
    const content = [
      "Answer body with inline reference [1].",
      "",
      "***",
      "",
      "**Citations and Timestamped Sources:**",
      "",
      "[1] https://youtu.be/dQw4w9WgXcQ?t=42",
    ].join("\n")

    expect(stripCitationAppendix(content)).toBe("Answer body with inline reference [1].")
  })

  it("removes bold citations-and-sources appendix from the displayed answer", () => {
    const parsed = parseBackendChatResponse({
      ok: true,
      result: {
        answer:
          "Answer body with inline reference [1].\n\n***\n\n**Citations and Timestamped Sources:**\n\n[1] https://youtu.be/dQw4w9WgXcQ?t=42",
        references: [
          {
            citation_number: 1,
            cited_text: "Citation excerpt",
          },
        ],
      },
    })

    expect(parsed).not.toBeNull()
    expect(parsed?.cleanAnswer).toContain("Answer body with inline reference")
    expect(parsed?.cleanAnswer).not.toContain("Citations and Timestamped Sources")
    expect(parsed?.cleanAnswer).not.toContain("youtu.be")
    expect(parsed?.citations).toEqual([
      {
        number: 1,
        text: "Citation excerpt",
        url: "https://youtu.be/dQw4w9WgXcQ?t=42",
      },
    ])
  })
})
