const DEFAULT_NOTEBOOKS_API_URL = "http://127.0.0.1:8000/v1/notebooks"

export const NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE =
  "Notebook backend is unavailable. Start the notebook service or set TATTVAM_NOTEBOOKS_API_URL to a reachable endpoint."

export class NotebookBackendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "NotebookBackendUnavailableError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export function normalizeNotebookApiUrl(url: string): string {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    return DEFAULT_NOTEBOOKS_API_URL
  }

  try {
    const parsedUrl = new URL(trimmedUrl)

    if (parsedUrl.hostname === "0.0.0.0") {
      parsedUrl.hostname = "127.0.0.1"
    }

    return parsedUrl.toString()
  } catch {
    return trimmedUrl
  }
}

export function getNotebookApiUrl(rawUrl = process.env.TATTVAM_NOTEBOOKS_API_URL): string {
  return normalizeNotebookApiUrl(rawUrl?.trim() || DEFAULT_NOTEBOOKS_API_URL)
}

export async function requestNotebookCreation(title: string): Promise<Response> {
  try {
    return await fetch(getNotebookApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
      cache: "no-store",
    })
  } catch (error) {
    throw new NotebookBackendUnavailableError(NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE, {
      cause: error,
    })
  }
}
