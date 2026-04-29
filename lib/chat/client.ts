import type {
  ChatCompletedEvent,
  ChatRouteErrorResponse,
  ChatRouteSuccessResponse,
  ChatStreamEventMap,
  ChatTargetCompletedEvent,
  ChatTargetFailedEvent,
} from "@/lib/chat/shared"
import { getResponseErrorMessage, readResponseBody } from "@/lib/http/response"

export async function askChatQuestion(question: string): Promise<ChatRouteSuccessResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  })

  const data = (await readResponseBody(response)) as
    | ChatRouteSuccessResponse
    | ChatRouteErrorResponse
    | string
    | null

  if (!response.ok) {
    throw new Error(getErrorMessage(data))
  }

  return data as ChatRouteSuccessResponse
}

type StreamChatQuestionCallbacks = {
  onTargetCompleted?: (event: ChatTargetCompletedEvent) => void
  onTargetFailed?: (event: ChatTargetFailedEvent) => void
  onChatCompleted?: (event: ChatCompletedEvent) => void
}

type ParsedChatStreamEvent =
  | { event: "target.completed"; data: ChatTargetCompletedEvent }
  | { event: "target.failed"; data: ChatTargetFailedEvent }
  | { event: "chat.completed"; data: ChatCompletedEvent }

export async function streamChatQuestion(
  question: string,
  callbacks: StreamChatQuestionCallbacks,
): Promise<void> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  })

  if (!response.ok) {
    const data = (await readResponseBody(response)) as ChatRouteErrorResponse | string | null
    throw new Error(getErrorMessage(data))
  }

  if (!response.body) {
    throw new Error("Chat stream is unavailable")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })

    const parsed = extractChatStreamMessages(buffer)
    buffer = parsed.remainder

    for (const message of parsed.messages) {
      const event = parseChatStreamMessage(message)

      if (!event) {
        continue
      }

      dispatchChatStreamEvent(event, callbacks)
    }

    if (done) {
      break
    }
  }

  const trailingEvent = parseChatStreamMessage(buffer.trim())

  if (trailingEvent) {
    dispatchChatStreamEvent(trailingEvent, callbacks)
  }
}

export function extractChatStreamMessages(buffer: string): {
  messages: string[]
  remainder: string
} {
  const normalizedBuffer = buffer.replace(/\r\n/g, "\n")
  const segments = normalizedBuffer.split("\n\n")

  if (normalizedBuffer.endsWith("\n\n")) {
    return {
      messages: segments.filter(Boolean),
      remainder: "",
    }
  }

  const remainder = segments.pop() ?? ""

  return {
    messages: segments.filter(Boolean),
    remainder,
  }
}

export function parseChatStreamMessage(message: string): ParsedChatStreamEvent | null {
  if (!message.trim()) {
    return null
  }

  const lines = message.split("\n")
  let eventName = ""
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim()
      continue
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim())
    }
  }

  if (!eventName || dataLines.length === 0) {
    return null
  }

  let rawData: unknown

  try {
    rawData = JSON.parse(dataLines.join("\n")) as unknown
  } catch {
    return null
  }

  if (eventName === "target.completed" && isTargetCompletedEvent(rawData)) {
    return { event: eventName, data: rawData }
  }

  if (eventName === "target.failed" && isTargetFailedEvent(rawData)) {
    return { event: eventName, data: rawData }
  }

  if (eventName === "chat.completed" && isChatCompletedEvent(rawData)) {
    return { event: eventName, data: rawData }
  }

  return null
}

function dispatchChatStreamEvent(
  event: ParsedChatStreamEvent,
  callbacks: StreamChatQuestionCallbacks,
) {
  if (event.event === "target.completed") {
    callbacks.onTargetCompleted?.(event.data)
    return
  }

  if (event.event === "target.failed") {
    callbacks.onTargetFailed?.(event.data)
    return
  }

  callbacks.onChatCompleted?.(event.data)
}

function getErrorMessage(data: ChatRouteErrorResponse | string | null): string {
  return getResponseErrorMessage(data, "Failed to fetch chat response")
}

function isTargetCompletedEvent(value: unknown): value is ChatStreamEventMap["target.completed"] {
  if (!isRecord(value) || !isChatTarget(value.target) || !isRecord(value.result)) {
    return false
  }

  return (
    typeof value.result.answerBody === "string" &&
    Array.isArray(value.result.citations) &&
    (typeof value.result.conversationId === "string" || value.result.conversationId === null) &&
    (typeof value.result.turnNumber === "number" || value.result.turnNumber === null) &&
    (typeof value.result.isFollowUp === "boolean" || value.result.isFollowUp === null)
  )
}

function isTargetFailedEvent(value: unknown): value is ChatStreamEventMap["target.failed"] {
  return isRecord(value) && isChatTarget(value.target) && typeof value.error === "string"
}

function isChatCompletedEvent(value: unknown): value is ChatStreamEventMap["chat.completed"] {
  return (
    isRecord(value) &&
    typeof value.totalTargets === "number" &&
    typeof value.completedTargets === "number" &&
    typeof value.failedTargets === "number"
  )
}

function isChatTarget(value: unknown): value is ChatStreamEventMap["target.completed"]["target"] {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    value.key.trim().length > 0 &&
    value.label.trim().length > 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
