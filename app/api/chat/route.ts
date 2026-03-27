import { NextRequest, NextResponse } from "next/server"

import { ChatBackendUnavailableError, forwardChatQuestion } from "@/lib/chat/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { question?: unknown }
    const question = typeof body.question === "string" ? body.question.trim() : ""

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const backendResponse = await forwardChatQuestion(question)
    const rawText = await backendResponse.text()
    const data = rawText ? JSON.parse(rawText) : null

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            data?.detail ||
            "Failed to fetch chat response from the notebook backend",
        },
        { status: backendResponse.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof ChatBackendUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    const message = error instanceof Error ? error.message : "Unexpected chat proxy failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
