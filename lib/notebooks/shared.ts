import { getResponseErrorMessage } from "@/lib/http/response"

export type NotebookSummary = {
  id: string
  title: string
  createdAt: string | null
  sourcesCount: number
  isOwner: boolean
}

export const DEFAULT_NOTEBOOK_SOURCE_TITLE = "Extraction Notes"

export type CreateNotebookResponse = {
  ok: true
  notebook: NotebookSummary
}

export type CreateAndSeedNotebookRequest = {
  title: string
  sourceText: string
  sourceTitle: string
}

const DEFAULT_NOTEBOOK_BACKEND_ERROR_MESSAGE = "Failed to create notebook from the notebook backend"

export function normalizeCreateAndSeedNotebookRequest(
  value: unknown,
): CreateAndSeedNotebookRequest | null {
  if (!isRecord(value)) {
    return null
  }

  const title = typeof value.title === "string" ? value.title.trim() : ""
  const sourceText = typeof value.sourceText === "string" ? value.sourceText.trim() : ""
  const rawSourceTitle = typeof value.sourceTitle === "string" ? value.sourceTitle.trim() : ""

  if (!title || !sourceText) {
    return null
  }

  return {
    title,
    sourceText,
    sourceTitle: rawSourceTitle || DEFAULT_NOTEBOOK_SOURCE_TITLE,
  }
}

export function normalizeCreateNotebookResponse(
  value: unknown,
): CreateNotebookResponse | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.notebook)) {
    return null
  }

  if (typeof value.notebook.id !== "string" || typeof value.notebook.title !== "string") {
    return null
  }

  return {
    ok: true,
    notebook: {
      id: value.notebook.id,
      title: value.notebook.title,
      createdAt: typeof value.notebook.created_at === "string" ? value.notebook.created_at : null,
      sourcesCount:
        typeof value.notebook.sources_count === "number" &&
        Number.isFinite(value.notebook.sources_count)
          ? value.notebook.sources_count
          : 0,
      isOwner: typeof value.notebook.is_owner === "boolean" ? value.notebook.is_owner : false,
    },
  }
}

export function getNotebookBackendErrorMessage(
  data: unknown,
  fallbackMessage = DEFAULT_NOTEBOOK_BACKEND_ERROR_MESSAGE,
): string {
  return getResponseErrorMessage(data, fallbackMessage)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
