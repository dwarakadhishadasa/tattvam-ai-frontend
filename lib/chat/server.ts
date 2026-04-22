import {
  getDefaultExtractionChatUrl,
  getNotebookBackendAuthHeaders,
  getNotebookChatUrl,
} from "@/lib/backend/endpoints"
import {
  getCitationContentByUrls,
  isLectureCitationStoreConfigurationError,
} from "@/lib/chat/citation-content-store"
import { normalizeDownstreamChatResponse } from "@/lib/chat/normalize"
import type { NormalizedChatResult } from "@/lib/chat/shared"
import { isLectureExtractionTargetKey } from "@/lib/chat/target-keys"
import type { ExtractionChatTarget } from "@/lib/chat/targets"

export const CHAT_BACKEND_UNAVAILABLE_MESSAGE =
  "Chat backend is unavailable. Start the notebook service or set TATTVAM_NOTEBOOK_BACKEND_ORIGIN to a reachable backend origin."

export class ChatBackendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ChatBackendUnavailableError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export async function forwardChatQuestion(question: string): Promise<Response> {
  return forwardChatRequest(question, getDefaultExtractionChatUrl())
}

export async function forwardChatQuestionToNotebook(
  question: string,
  notebookId: string,
): Promise<Response> {
  return forwardChatRequest(question, getNotebookChatUrl(notebookId))
}

export async function forwardChatQuestionToTarget(
  question: string,
  target: Pick<ExtractionChatTarget, "notebookId">,
): Promise<Response> {
  return forwardChatQuestionToNotebook(question, target.notebookId)
}

export class ChatBackendResponseError extends Error {
  status: number

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message)
    this.name = "ChatBackendResponseError"
    this.status = status

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export async function requestNormalizedChatResult(
  question: string,
  notebookId: string,
  options?: {
    targetKey?: string | null
  },
): Promise<NormalizedChatResult> {
  const backendResponse = await forwardChatQuestionToNotebook(question, notebookId)
  const data = await readChatResponseBody(backendResponse)

  if (!backendResponse.ok) {
    const errorPayload =
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}

    throw new ChatBackendResponseError(
      getDownstreamChatErrorMessage(errorPayload),
      backendResponse.status,
    )
  }

  const normalizedResponse = normalizeDownstreamChatResponse(
    data as Parameters<typeof normalizeDownstreamChatResponse>[0],
    options,
  )

  if (!normalizedResponse) {
    throw new ChatBackendResponseError(
      "Malformed chat response from the notebook backend",
      502,
    )
  }

  return hydrateLectureCitationText(normalizedResponse.result, options?.targetKey)
}

export async function readChatResponseBody(response: Response): Promise<unknown> {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  return JSON.parse(rawText) as unknown
}

export function getDownstreamChatErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail
  }

  return "Failed to fetch chat response from the notebook backend"
}

async function forwardChatRequest(question: string, chatUrl: string): Promise<Response> {
  try {
    return await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getNotebookBackendAuthHeaders(),
      },
      body: JSON.stringify({ question }),
      cache: "no-store",
    })
  } catch (error) {
    throw new ChatBackendUnavailableError(CHAT_BACKEND_UNAVAILABLE_MESSAGE, { cause: error })
  }
}

async function hydrateLectureCitationText(
  result: NormalizedChatResult,
  targetKey: string | null | undefined,
): Promise<NormalizedChatResult> {
  if (!isLectureExtractionTargetKey(targetKey)) {
    return result
  }

  const citationUrls = Array.from(
    new Set(result.citations.map((citation) => citation.url).filter((url) => url.trim())),
  )

  if (citationUrls.length === 0) {
    return result
  }

  let citationContentByUrl: Map<string, string>

  try {
    citationContentByUrl = await getCitationContentByUrls(citationUrls)
  } catch (error) {
    if (isLectureCitationStoreConfigurationError(error)) {
      throw error
    }

    console.error("Lecture citation hydration failed; returning empty citation text.", error)
    return result
  }

  return {
    ...result,
    citations: result.citations.map((citation) => ({
      ...citation,
      text: citation.url ? (citationContentByUrl.get(citation.url) ?? "") : citation.text,
    })),
  }
}
