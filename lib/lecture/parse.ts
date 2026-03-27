import type { LectureContextPayload } from "@/lib/lecture/server"

export function parseLectureContextAnswer(answerBody: string): LectureContextPayload {
  const normalizedText = answerBody.replace(/\r\n/g, "\n").trim()

  if (!normalizedText) {
    return {
      overview: "",
      keyPoints: [],
    }
  }

  const bulletPattern = /^(?:[-*+]|\d+\.)\s+.+$/gm
  const bulletMatches = normalizedText.match(bulletPattern) ?? []

  if (bulletMatches.length > 0) {
    const firstBullet = bulletMatches[0]
    const overviewBoundary = firstBullet ? normalizedText.indexOf(firstBullet) : normalizedText.length
    const overview = collapseLectureText(normalizedText.slice(0, overviewBoundary))

    return {
      overview,
      keyPoints: bulletMatches.map((line) => line.replace(/^(?:[-*+]|\d+\.)\s+/, "").trim()),
    }
  }

  const paragraphs = normalizedText
    .split(/\n\s*\n/)
    .map((paragraph) => collapseLectureText(paragraph))
    .filter(Boolean)

  const [overviewParagraph = "", ...remainingParagraphs] = paragraphs
  const overviewSentences = splitIntoSentences(overviewParagraph)

  return {
    overview: overviewSentences[0] ?? overviewParagraph,
    keyPoints:
      remainingParagraphs.length > 0
        ? remainingParagraphs
        : overviewSentences.slice(1, 5),
  }
}

function collapseLectureText(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function splitIntoSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}
