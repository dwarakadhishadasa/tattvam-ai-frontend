import { NextResponse } from "next/server"

import { isNotebookBackendConfigurationError } from "@/lib/backend/endpoints"
import {
  SlidesBackendResponseError,
  SlidesBackendUnavailableError,
  getSlideDeckJob,
} from "@/lib/slides/server"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ notebookId: string; taskId: string }> },
) {
  void request

  try {
    const { notebookId, taskId } = await params
    const job = await getSlideDeckJob(notebookId, taskId)

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

    const message =
      error instanceof Error ? error.message : "Unexpected slide deck status failure"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
