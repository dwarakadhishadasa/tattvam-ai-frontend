const DEFAULT_CHAT_API_URL =
  "http://127.0.0.1:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask"

export const CHAT_BACKEND_UNAVAILABLE_MESSAGE =
  "Chat backend is unavailable. Start the notebook service or set TATTVAM_CHAT_API_URL to a reachable endpoint."

export class ChatBackendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ChatBackendUnavailableError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export function normalizeChatApiUrl(url: string): string {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    return DEFAULT_CHAT_API_URL
  }

  try {
    const parsedUrl = new URL(trimmedUrl)

    if (parsedUrl.hostname === "0.0.0.0") {
      parsedUrl.hostname = "127.0.0.1"
    }

    return parsedUrl.toString()
  } catch {
    return trimmedUrl
  }
}

export function getChatApiUrl(rawUrl = process.env.TATTVAM_CHAT_API_URL): string {
  return normalizeChatApiUrl(rawUrl?.trim() || DEFAULT_CHAT_API_URL)
}

export async function forwardChatQuestion(question: string): Promise<Response> {
  try {
    return await fetch(getChatApiUrl(), {
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
