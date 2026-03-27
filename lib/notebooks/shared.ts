export type NotebookSummary = {
  id: string
  title: string
  createdAt: string | null
  sourcesCount: number
  isOwner: boolean
}

export type CreateNotebookResponse = {
  ok: true
  notebook: NotebookSummary
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

export function getNotebookBackendErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail
  }

  return "Failed to create notebook from the notebook backend"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
