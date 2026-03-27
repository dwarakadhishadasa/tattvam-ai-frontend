import type { BackendChatResponse } from "@/lib/chat/shared"

export async function askChatQuestion(question: string): Promise<BackendChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  })

  const data = (await response.json()) as BackendChatResponse & { detail?: unknown }

  if (!response.ok) {
    throw new Error(getErrorMessage(data))
  }

  return data
}

function getErrorMessage(data: BackendChatResponse & { detail?: unknown }): string {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail
  }

  if (
    data.detail &&
    typeof data.detail === "object" &&
    "message" in data.detail &&
    typeof data.detail.message === "string"
  ) {
    return data.detail.message
  }

  return "Failed to fetch chat response"
}
