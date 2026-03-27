import { stripCitationAppendix } from "@/lib/chat/normalize"

export type Citation = {
  number: number
  text: string
  url: string
}

export type NormalizedChatResult = {
  answerBody: string
  citations: Citation[]
  conversationId: string | null
  turnNumber: number | null
  isFollowUp: boolean | null
}

export type ChatRouteSuccessResponse = {
  ok: true
  result: NormalizedChatResult
}

export type ChatRouteErrorResponse = {
  error?: string
  detail?: unknown
}

export { stripCitationAppendix }

export function formatAssistantAnswer(answerBody: string): string {
  return answerBody.replace(/\[([\d\s,\-]+)\]/g, (fullMatch, rangeText: string) => {
    const numbers = expandCitationRange(rangeText)

    if (numbers.length === 0) {
      return fullMatch
    }

    return numbers.map((number) => `[[${number}]](#citation-${number})`).join("")
  })
}

function expandCitationRange(rangeText: string): number[] {
  const parts = rangeText.split(",").map((part) => part.trim())
  const numbers: number[] = []

  for (const part of parts) {
    if (part.includes("-")) {
      const [startText, endText] = part.split("-")
      const start = Number.parseInt(startText, 10)
      const end = Number.parseInt(endText, 10)

      if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
        for (let current = start; current <= end; current += 1) {
          numbers.push(current)
        }
      }

      continue
    }

    const number = Number.parseInt(part, 10)

    if (!Number.isNaN(number)) {
      numbers.push(number)
    }
  }

  return numbers
}
