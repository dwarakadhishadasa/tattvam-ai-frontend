import { stripCitationAppendix } from "@/lib/chat/normalize"
import { expandCitationRange } from "@/lib/chat/citation-ranges"

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

export type ChatTargetDescriptor = {
  key: string
  label: string
}

export type ChatTargetCompletedEvent = {
  target: ChatTargetDescriptor
  result: NormalizedChatResult
}

export type ChatTargetFailedEvent = {
  target: ChatTargetDescriptor
  error: string
}

export type ChatCompletedEvent = {
  totalTargets: number
  completedTargets: number
  failedTargets: number
}

export type ChatStreamEventMap = {
  "target.completed": ChatTargetCompletedEvent
  "target.failed": ChatTargetFailedEvent
  "chat.completed": ChatCompletedEvent
}

export { stripCitationAppendix }
export { expandCitationRange }

export function formatAssistantAnswer(answerBody: string): string {
  return answerBody.replace(/\[([\d\s,\-]+)\]/g, (fullMatch, rangeText: string) => {
    const numbers = expandCitationRange(rangeText)

    if (numbers.length === 0) {
      return fullMatch
    }

    return numbers.map((number) => `[[${number}]](#citation-${number})`).join("")
  })
}
