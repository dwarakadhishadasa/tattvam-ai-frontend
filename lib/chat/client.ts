import type { ChatRouteErrorResponse, ChatRouteSuccessResponse } from "@/lib/chat/shared"

export async function askChatQuestion(question: string): Promise<ChatRouteSuccessResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  })

  const data = (await response.json()) as ChatRouteSuccessResponse | ChatRouteErrorResponse

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ChatRouteErrorResponse))
  }

  return data as ChatRouteSuccessResponse
}

function getErrorMessage(data: ChatRouteErrorResponse): string {
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
