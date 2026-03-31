export const PPTX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"

export type SlideDeckJobState = "idle" | "pending" | "inProgress" | "completed" | "failed"

export type SlideDeckJobMetadata = Record<string, unknown> | null

export type SlideDeckJob = {
  taskId: string
  state: SlideDeckJobState
  error: string | null
  errorCode: string | null
  metadata: SlideDeckJobMetadata
}

export type SlideDeckJobRequest = {
  notebookId: string
  instructions: string
}

export type SlideDeckJobResponse = {
  ok: true
  job: SlideDeckJob
}

type BackendArtifactStatus = "pending" | "in_progress" | "completed" | "failed"

type BackendArtifactTaskPayload = {
  task_id: string
  status: BackendArtifactStatus
  error: string | null
  error_code: string | null
  metadata: SlideDeckJobMetadata
}

type BackendArtifactResponse = {
  ok: true
  status: BackendArtifactTaskPayload
}

export function normalizeSlideDeckJobRequest(value: unknown): SlideDeckJobRequest | null {
  if (!isRecord(value)) {
    return null
  }

  const notebookId = typeof value.notebookId === "string" ? value.notebookId.trim() : ""
  const instructions =
    typeof value.instructions === "string" ? value.instructions.trim() : ""

  if (!notebookId || !instructions) {
    return null
  }

  return {
    notebookId,
    instructions,
  }
}

export function normalizeSlideDeckJobResponse(value: unknown): SlideDeckJobResponse | null {
  if (!isRecord(value) || value.ok !== true) {
    return null
  }

  const job = normalizeBackendArtifactPayload(value)

  if (!job) {
    return null
  }

  return {
    ok: true,
    job,
  }
}

export function normalizeBackendArtifactPayload(value: unknown): SlideDeckJob | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.status)) {
    return null
  }

  const taskId = typeof value.status.task_id === "string" ? value.status.task_id.trim() : ""
  const state = normalizeSlideDeckJobState(value.status.status, value.status.error)

  if (!taskId || !state) {
    return null
  }

  return {
    taskId,
    state,
    error: typeof value.status.error === "string" ? value.status.error : null,
    errorCode: typeof value.status.error_code === "string" ? value.status.error_code : null,
    metadata: isRecord(value.status.metadata)
      ? value.status.metadata
      : value.status.metadata === null
        ? null
        : null,
  }
}

export function normalizeSlideDeckJobState(
  status: unknown,
  error: unknown,
): Exclude<SlideDeckJobState, "idle"> | null {
  if (typeof error === "string" && error.trim()) {
    return "failed"
  }

  if (status === "pending") {
    return "pending"
  }

  if (status === "in_progress") {
    return "inProgress"
  }

  if (status === "completed") {
    return "completed"
  }

  if (status === "failed") {
    return "failed"
  }

  return null
}

export function getSlidesRouteErrorMessage(
  data: Record<string, unknown>,
  fallbackMessage = "Failed to process slide deck job",
): string {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail
  }

  return fallbackMessage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
