import { describe, expect, it } from "vitest"

import {
  expandCitationRange,
  formatAssistantAnswer,
  stripCitationAppendix,
} from "../../lib/chat/shared"

describe("chat shared helpers", () => {
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

  it("keeps legacy content intact when the tail is not structurally citation shaped", () => {
    const content = [
      "Answer body with a real closing URL.",
      "",
      "Watch here: https://youtu.be/dQw4w9WgXcQ?t=42",
    ].join("\n")

    expect(stripCitationAppendix(content)).toBe(content)
  })

  it("linkifies normalized answer-body citations for the browser contract", () => {
    expect(formatAssistantAnswer("Answer body with inline references [1] and [2-3].")).toBe(
      "Answer body with inline references [[1]](#citation-1) and [[2]](#citation-2)[[3]](#citation-3).",
    )
  })

  it("expands mixed list-and-range citations into per-number links", () => {
    expect(expandCitationRange("2, 7-10")).toEqual([2, 7, 8, 9, 10])
    expect(formatAssistantAnswer("Answer body with inline references [2, 7-10].")).toBe(
      "Answer body with inline references [[2]](#citation-2)[[7]](#citation-7)[[8]](#citation-8)[[9]](#citation-9)[[10]](#citation-10).",
    )
  })
})
