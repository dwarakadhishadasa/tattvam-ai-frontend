import { NextResponse } from "next/server"

import { isNotebookBackendConfigurationError } from "@/lib/backend/endpoints"
import { PPTX_CONTENT_TYPE, getSlidesRouteErrorMessage } from "@/lib/slides/shared"
import {
  SlidesBackendUnavailableError,
  downloadSlideDeckJob,
  readSlidesResponseBody,
} from "@/lib/slides/server"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string; taskId: string }> },
) {
  void request

  try {
    const { notebookId, taskId } = await params
    const backendResponse = await downloadSlideDeckJob(notebookId, taskId)

    if (!backendResponse.ok) {
      const data = await readSlidesResponseBody(backendResponse)
      const errorPayload = typeof data === "object" && data !== null ? data : {}

      return NextResponse.json(
        {
          error: getSlidesRouteErrorMessage(
            errorPayload as Record<string, unknown>,
            "Failed to download slide deck",
          ),
        },
        { status: backendResponse.status },
      )
    }

    const headers = new Headers(backendResponse.headers)
    headers.set("Content-Type", headers.get("Content-Type") || PPTX_CONTENT_TYPE)

    if (!headers.get("Content-Disposition")) {
      headers.set("Content-Disposition", `attachment; filename="${taskId.trim()}.pptx"`)
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers,
    })
  } catch (error) {
    if (isNotebookBackendConfigurationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof SlidesBackendUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    const message =
      error instanceof Error ? error.message : "Unexpected slide deck download failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
