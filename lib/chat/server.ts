import { getDefaultExtractionChatUrl } from "@/lib/backend/endpoints"

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
  const chatUrl = getDefaultExtractionChatUrl()

  try {
    return await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
      cache: "no-store",
    })
  } catch (error) {
    throw new ChatBackendUnavailableError(CHAT_BACKEND_UNAVAILABLE_MESSAGE, { cause: error })
  }
}
