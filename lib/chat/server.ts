const DEFAULT_CHAT_API_URL =
  "http://0.0.0.0:8000/v1/notebooks/da406743-a373-47f9-9275-6c2e1e86c2b6/chat/ask"

export function getChatApiUrl(): string {
  return process.env.TATTVAM_CHAT_API_URL?.trim() || DEFAULT_CHAT_API_URL
}

export async function forwardChatQuestion(question: string): Promise<Response> {
  return fetch(getChatApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
    cache: "no-store",
  })
}
