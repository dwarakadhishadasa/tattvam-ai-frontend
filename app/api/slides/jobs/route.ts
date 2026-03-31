import { NextRequest, NextResponse } from "next/server"

import { isNotebookBackendConfigurationError } from "@/lib/backend/endpoints"
import { normalizeSlideDeckJobRequest } from "@/lib/slides/shared"
import {
  SlidesBackendResponseError,
  SlidesBackendUnavailableError,
  startSlideDeckJob,
} from "@/lib/slides/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const normalizedRequest = normalizeSlideDeckJobRequest(body)

    if (!normalizedRequest) {
      return NextResponse.json(
        { error: "Notebook id and instructions are required" },
        { status: 400 },
      )
    }

    const job = await startSlideDeckJob(
      normalizedRequest.notebookId,
      normalizedRequest.instructions,
    )

    return NextResponse.json({ ok: true, job })
  } catch (error) {
    if (isNotebookBackendConfigurationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (error instanceof SlidesBackendUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }

    if (error instanceof SlidesBackendResponseError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Unexpected slide deck job failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
