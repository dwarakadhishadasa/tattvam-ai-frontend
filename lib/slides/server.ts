import {
  getNotebookArtifactDownloadUrl,
  getNotebookArtifactGenerateUrl,
  getNotebookArtifactTaskUrl,
} from "@/lib/backend/endpoints"
import {
  type SlideDeckJob,
  normalizeBackendArtifactPayload,
  getSlidesRouteErrorMessage,
} from "@/lib/slides/shared"

export const SLIDES_BACKEND_UNAVAILABLE_MESSAGE =
  "Slide deck backend is unavailable. Start the notebook service or set TATTVAM_NOTEBOOK_BACKEND_ORIGIN to a reachable backend origin."

export class SlidesBackendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "SlidesBackendUnavailableError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export class SlidesBackendResponseError extends Error {
  status: number

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message)
    this.name = "SlidesBackendResponseError"
    this.status = status

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export async function startSlideDeckJob(
  notebookId: string,
  instructions: string,
): Promise<SlideDeckJob> {
  const response = await requestSlideDeckJob(notebookId, instructions)
  const data = await readSlidesResponseBody(response)

  if (!response.ok) {
    const errorPayload = typeof data === "object" && data !== null ? data : {}
    throw new SlidesBackendResponseError(
      getSlidesRouteErrorMessage(
        errorPayload as Record<string, unknown>,
        "Failed to start slide deck job",
      ),
      response.status,
    )
  }

  const job = normalizeBackendArtifactPayload(data)

  if (!job) {
    throw new SlidesBackendResponseError(
      "Malformed slide deck job response from the notebook backend",
      502,
    )
  }

  return job
}

export async function getSlideDeckJob(
  notebookId: string,
  taskId: string,
): Promise<SlideDeckJob> {
  const response = await requestSlideDeckJobStatus(notebookId, taskId)
  const data = await readSlidesResponseBody(response)

  if (!response.ok) {
    const errorPayload = typeof data === "object" && data !== null ? data : {}
    throw new SlidesBackendResponseError(
      getSlidesRouteErrorMessage(
        errorPayload as Record<string, unknown>,
        "Failed to fetch slide deck job status",
      ),
      response.status,
    )
  }

  const job = normalizeBackendArtifactPayload(data)

  if (!job) {
    throw new SlidesBackendResponseError(
      "Malformed slide deck status response from the notebook backend",
      502,
    )
  }

  return job
}

export async function downloadSlideDeckJob(
  notebookId: string,
  taskId: string,
): Promise<Response> {
  try {
    return await fetch(getNotebookArtifactDownloadUrl(notebookId, taskId), {
      cache: "no-store",
    })
  } catch (error) {
    throw new SlidesBackendUnavailableError(SLIDES_BACKEND_UNAVAILABLE_MESSAGE, { cause: error })
  }
}

export async function requestSlideDeckJob(
  notebookId: string,
  instructions: string,
): Promise<Response> {
  try {
    return await fetch(getNotebookArtifactGenerateUrl(notebookId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "slide_deck",
        options: {
          instructions,
        },
      }),
      cache: "no-store",
    })
  } catch (error) {
    throw new SlidesBackendUnavailableError(SLIDES_BACKEND_UNAVAILABLE_MESSAGE, { cause: error })
  }
}

export async function requestSlideDeckJobStatus(
  notebookId: string,
  taskId: string,
): Promise<Response> {
  try {
    return await fetch(getNotebookArtifactTaskUrl(notebookId, taskId), {
      cache: "no-store",
    })
  } catch (error) {
    throw new SlidesBackendUnavailableError(SLIDES_BACKEND_UNAVAILABLE_MESSAGE, { cause: error })
  }
}

export async function readSlidesResponseBody(response: Response): Promise<unknown> {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  return JSON.parse(rawText) as unknown
}
