import {
  ChatBackendResponseError,
  ChatBackendUnavailableError,
  requestNormalizedChatResult,
} from "@/lib/chat/server"
import type { ChatCompletedEvent, ChatStreamEventMap } from "@/lib/chat/shared"
import type { ExtractionChatTarget } from "@/lib/chat/targets"

const encoder = new TextEncoder()

export function streamChatTargets(
  question: string,
  targets: ExtractionChatTarget[],
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let writeChain = Promise.resolve()
      let completedTargets = 0
      let failedTargets = 0

      const enqueueEvent = <TEventName extends keyof ChatStreamEventMap>(
        eventName: TEventName,
        data: ChatStreamEventMap[TEventName],
      ) => {
        writeChain = writeChain.then(() => {
          controller.enqueue(encoder.encode(serializeChatStreamEvent(eventName, data)))
        })

        return writeChain
      }

      const run = async () => {
        const tasks = targets.map(async (target) => {
          try {
            const result = await requestNormalizedChatResult(question, target.notebookId, {
              targetKey: target.key,
            })
            completedTargets += 1

            await enqueueEvent("target.completed", {
              target: {
                key: target.key,
                label: target.label,
              },
              result,
            })
          } catch (error) {
            failedTargets += 1

            await enqueueEvent("target.failed", {
              target: {
                key: target.key,
                label: target.label,
              },
              error: getTargetFailureMessage(error),
            })
          }
        })

        await Promise.all(tasks)

        await enqueueEvent("chat.completed", createChatCompletedEvent(targets.length, completedTargets, failedTargets))
        await writeChain
        controller.close()
      }

      void run().catch((error) => {
        controller.error(error)
      })
    },
  })
}

export function serializeChatStreamEvent<TEventName extends keyof ChatStreamEventMap>(
  eventName: TEventName,
  data: ChatStreamEventMap[TEventName],
): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
}

function createChatCompletedEvent(
  totalTargets: number,
  completedTargets: number,
  failedTargets: number,
): ChatCompletedEvent {
  return {
    totalTargets,
    completedTargets,
    failedTargets,
  }
}

function getTargetFailureMessage(error: unknown): string {
  if (error instanceof ChatBackendResponseError) {
    return error.message
  }

  if (error instanceof ChatBackendUnavailableError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "Unexpected chat target failure"
}
