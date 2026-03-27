import { NextRequest, NextResponse } from "next/server"

import {
  getNotebookBackendErrorMessage,
  normalizeCreateNotebookResponse,
} from "@/lib/notebooks/shared"
import {
  NotebookBackendUnavailableError,
  requestNotebookCreation,
} from "@/lib/notebooks/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { title?: unknown }
    const title = typeof body.title === "string" ? body.title.trim() : ""

    if (!title) {
      return NextResponse.json({ error: "Notebook title is required" }, { status: 400 })
    }

    const backendResponse = await requestNotebookCreation(title)
    const rawText = await backendResponse.text()
    const data = rawText ? (JSON.parse(rawText) as unknown) : null

    if (!backendResponse.ok) {
      const errorPayload =
        typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}

      return NextResponse.json(
        {
          error: getNotebookBackendErrorMessage(errorPayload),
        },
        { status: backendResponse.status },
      )
    }

    const normalizedResponse = normalizeCreateNotebookResponse(data)

    if (!normalizedResponse) {
      return NextResponse.json(
        { error: "Malformed notebook response from the notebook backend" },
        { status: 502 },
      )
    }

    return NextResponse.json(normalizedResponse)
  } catch (error) {
    if (error instanceof NotebookBackendUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    const message = error instanceof Error ? error.message : "Unexpected notebook proxy failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
