import { NextRequest, NextResponse } from "next/server"

import { isNotebookBackendConfigurationError } from "@/lib/backend/endpoints"
import {
  ChatBackendResponseError,
  ChatBackendUnavailableError,
  forwardChatQuestion,
  getDownstreamChatErrorMessage,
  readChatResponseBody,
} from "@/lib/chat/server"
import { normalizeDownstreamChatResponse } from "@/lib/chat/normalize"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { question?: unknown }
    const question = typeof body.question === "string" ? body.question.trim() : ""

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const backendResponse = await forwardChatQuestion(question)
    const data = await readChatResponseBody(backendResponse)

    if (!backendResponse.ok) {
      const errorPayload =
        typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}

      return NextResponse.json(
        {
          error: getDownstreamChatErrorMessage(errorPayload),
        },
        { status: backendResponse.status },
      )
    }

    const normalizedResponse = normalizeDownstreamChatResponse(
      data as Parameters<typeof normalizeDownstreamChatResponse>[0],
    )

    if (!normalizedResponse) {
      return NextResponse.json(
        { error: "Malformed chat response from the notebook backend" },
        { status: 502 },
      )
    }

    return NextResponse.json(normalizedResponse)
  } catch (error) {
    if (isNotebookBackendConfigurationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof ChatBackendUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    if (error instanceof ChatBackendResponseError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Unexpected chat proxy failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
