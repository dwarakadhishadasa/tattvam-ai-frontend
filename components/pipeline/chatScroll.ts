import type { Message } from "@/components/pipeline/types"

export function shouldAutoScrollToLatestMessage(
  previousMessageCount: number,
  messages: Message[],
): boolean {
  if (messages.length <= previousMessageCount) {
    return false
  }

  const latestMessage = messages[messages.length - 1]
  return latestMessage?.role === "user"
}
