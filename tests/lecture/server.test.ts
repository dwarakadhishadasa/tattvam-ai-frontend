import { describe, expect, it } from "vitest"

import { parseLectureContextAnswer } from "../../lib/lecture/parse"

describe("lecture context parsing", () => {
  it("extracts overview and bullet points from notebook-backed lecture notes", () => {
    const parsed = parseLectureContextAnswer([
      "# The Importance of Sadhu Sanga",
      "",
      "Association with advanced devotees nourishes conviction, steadies practice, and deepens remembrance of Krishna.",
      "",
      "- Sadhu sanga strengthens faith through living example.",
      "- Genuine association clarifies siddhanta and practice.",
      "- Humble service in saintly company transforms the heart.",
      "- Regular hearing protects against distraction and doubt.",
    ].join("\n"))

    expect(parsed).toEqual({
      overview:
        "The Importance of Sadhu Sanga Association with advanced devotees nourishes conviction, steadies practice, and deepens remembrance of Krishna.",
      keyPoints: [
        "Sadhu sanga strengthens faith through living example.",
        "Genuine association clarifies siddhanta and practice.",
        "Humble service in saintly company transforms the heart.",
        "Regular hearing protects against distraction and doubt.",
      ],
    })
  })

  it("falls back to sentence and paragraph parsing when bullets are absent", () => {
    const parsed = parseLectureContextAnswer([
      "Janmashtami celebrates the appearance of Lord Krishna and invites the speaker to connect theology with devotion in practice. It can highlight Krishna's compassion, beauty, and protection for devotees.",
      "",
      "The lecture can then explore the meaning of divine descent for conditioned souls.",
      "",
      "A final section can focus on practical observances such as hearing, kirtana, and remembrance.",
    ].join("\n"))

    expect(parsed).toEqual({
      overview:
        "Janmashtami celebrates the appearance of Lord Krishna and invites the speaker to connect theology with devotion in practice.",
      keyPoints: [
        "The lecture can then explore the meaning of divine descent for conditioned souls.",
        "A final section can focus on practical observances such as hearing, kirtana, and remembrance.",
      ],
    })
  })
})
