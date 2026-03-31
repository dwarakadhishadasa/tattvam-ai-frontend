import { NextRequest } from "next/server"

import { isNotebookBackendConfigurationError } from "@/lib/backend/endpoints"
import { streamChatTargets } from "@/lib/chat/stream"
import {
  getExtractionChatTargets,
  isExtractionChatTargetsConfigurationError,
} from "@/lib/chat/targets"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { question?: unknown }
    const question = typeof body.question === "string" ? body.question.trim() : ""

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const targets = getExtractionChatTargets()

    return new Response(streamChatTargets(question, targets), {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    })
  } catch (error) {
    if (
      isNotebookBackendConfigurationError(error) ||
      isExtractionChatTargetsConfigurationError(error)
    ) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const message = error instanceof Error ? error.message : "Unexpected chat stream failure"

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}
