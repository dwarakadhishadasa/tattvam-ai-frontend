import {
  getNotebookBackendAuthHeaders,
  getNotebookSetSourceUrl,
  getNotebooksUrl,
} from "@/lib/backend/endpoints"

export const NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE =
  "Notebook backend is unavailable. Start the notebook service or set TATTVAM_NOTEBOOK_BACKEND_ORIGIN to a reachable backend origin."

export class NotebookBackendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "NotebookBackendUnavailableError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export async function requestNotebookCreation(title: string): Promise<Response> {
  const notebooksUrl = getNotebooksUrl()

  try {
    return await fetch(notebooksUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getNotebookBackendAuthHeaders(),
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

export async function requestNotebookTextSourceCreation(
  notebookId: string,
  title: string,
  content: string,
): Promise<Response> {
  const notebookSourcesUrl = getNotebookSetSourceUrl(notebookId)

  try {
    return await fetch(notebookSourcesUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getNotebookBackendAuthHeaders(),
      },
      body: JSON.stringify({ title, content }),
      cache: "no-store",
    })
  } catch (error) {
    throw new NotebookBackendUnavailableError(NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE, {
      cause: error,
    })
  }
}
