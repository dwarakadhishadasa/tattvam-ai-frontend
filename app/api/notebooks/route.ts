import { NextRequest, NextResponse } from "next/server"

import { isNotebookBackendConfigurationError } from "@/lib/backend/endpoints"
import {
  getNotebookBackendErrorMessage,
  normalizeCreateAndSeedNotebookRequest,
  normalizeCreateNotebookResponse,
} from "@/lib/notebooks/shared"
import {
  NotebookBackendUnavailableError,
  requestNotebookCreation,
  requestNotebookTextSourceCreation,
} from "@/lib/notebooks/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const normalizedRequest = normalizeCreateAndSeedNotebookRequest(await request.json())

    if (!normalizedRequest) {
      return NextResponse.json(
        { error: "Notebook title and source text are required" },
        { status: 400 },
      )
    }

    const backendResponse = await requestNotebookCreation(normalizedRequest.title)
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

    const textSourceResponse = await requestNotebookTextSourceCreation(
      normalizedResponse.notebook.id,
      normalizedRequest.sourceTitle,
      normalizedRequest.sourceText,
    )
    const rawSourceText = await textSourceResponse.text()
    const sourceData = rawSourceText ? (JSON.parse(rawSourceText) as unknown) : null

    if (!textSourceResponse.ok) {
      const errorPayload =
        typeof sourceData === "object" && sourceData !== null
          ? (sourceData as Record<string, unknown>)
          : {}

      return NextResponse.json(
        {
          error: getNotebookBackendErrorMessage(
            errorPayload,
            "Failed to seed notebook source text from the notebook backend",
          ),
        },
        { status: textSourceResponse.status },
      )
    }

    return NextResponse.json(normalizedResponse)
  } catch (error) {
    if (isNotebookBackendConfigurationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof NotebookBackendUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    const message = error instanceof Error ? error.message : "Unexpected notebook proxy failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
