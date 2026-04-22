export const DEFAULT_LOCAL_NOTEBOOK_BACKEND_ORIGIN = "http://127.0.0.1:8000"
export const DEFAULT_VERCEL_NOTEBOOK_BACKEND_ORIGIN =
  "https://tattvam-ai-backend-two.vercel.app"
export const DEFAULT_NOTEBOOK_BACKEND_ORIGIN = DEFAULT_LOCAL_NOTEBOOK_BACKEND_ORIGIN

export class NotebookBackendConfigurationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "NotebookBackendConfigurationError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export function isNotebookBackendConfigurationError(
  error: unknown,
): error is NotebookBackendConfigurationError {
  return (
    error instanceof NotebookBackendConfigurationError ||
    (error instanceof Error && error.name === "NotebookBackendConfigurationError")
  )
}

export function getNotebookBackendOrigin(
  rawOrigin = process.env.TATTVAM_NOTEBOOK_BACKEND_ORIGIN,
): string {
  const origin = rawOrigin?.trim() || getDefaultNotebookBackendOrigin()
  let parsedOrigin: URL

  try {
    parsedOrigin = new URL(origin)
  } catch (error) {
    throw new NotebookBackendConfigurationError(
      "TATTVAM_NOTEBOOK_BACKEND_ORIGIN must be a valid absolute URL",
      { cause: error },
    )
  }

  if (!parsedOrigin.protocol || !parsedOrigin.hostname) {
    throw new NotebookBackendConfigurationError(
      "TATTVAM_NOTEBOOK_BACKEND_ORIGIN must be a valid absolute URL",
    )
  }

  if (parsedOrigin.hostname === "0.0.0.0") {
    parsedOrigin.hostname = "127.0.0.1"
  }

  const normalizedPathname = trimTrailingSlash(parsedOrigin.pathname)

  return `${parsedOrigin.origin}${normalizedPathname}${parsedOrigin.search}${parsedOrigin.hash}`
}

export function getNotebookBackendAuthHeaders(
  rawApiKey = process.env.TATTVAM_NOTEBOOK_BACKEND_API_KEY,
): Record<string, string> {
  const apiKey = rawApiKey?.trim() || ""

  return apiKey ? { "X-API-Key": apiKey } : {}
}

function getDefaultNotebookBackendOrigin(): string {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
    ? DEFAULT_VERCEL_NOTEBOOK_BACKEND_ORIGIN
    : DEFAULT_LOCAL_NOTEBOOK_BACKEND_ORIGIN
}

export function getNotebooksUrl(): string {
  return buildNotebookUrl(["v1", "notebooks"])
}

export function getNotebookSetSourceUrl(notebookId: string): string {
  return buildNotebookUrl(["v1", "notebooks", getRequiredNotebookId(notebookId), "sources", "text"])
}

export function getDefaultExtractionChatNotebookId(
  rawNotebookId = process.env.TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID,
): string {
  const notebookId = rawNotebookId?.trim() || ""

  if (!notebookId) {
    throw new NotebookBackendConfigurationError("TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID is required")
  }

  return notebookId
}

export function getDefaultExtractionChatUrl(): string {
  return getNotebookChatUrl(getDefaultExtractionChatNotebookId())
}

export function getNotebookChatUrl(notebookId: string): string {
  return buildNotebookUrl(["v1", "notebooks", getRequiredNotebookId(notebookId), "chat", "ask"])
}

export function getNotebookArtifactGenerateUrl(notebookId: string): string {
  return buildNotebookUrl([
    "v1",
    "notebooks",
    getRequiredNotebookId(notebookId),
    "artifacts",
    "generate",
  ])
}

export function getNotebookArtifactTaskUrl(notebookId: string, taskId: string): string {
  const url = new URL(
    buildNotebookUrl([
      "v1",
      "notebooks",
      getRequiredNotebookId(notebookId),
      "artifacts",
      "tasks",
      getRequiredTaskId(taskId),
    ]),
  )

  url.searchParams.set("wait", "false")

  return url.toString()
}

export function getNotebookArtifactDownloadUrl(notebookId: string, taskId: string): string {
  const url = new URL(
    buildNotebookUrl([
      "v1",
      "notebooks",
      getRequiredNotebookId(notebookId),
      "artifacts",
      "download",
    ]),
  )

  url.searchParams.set("type", "slide_deck")
  url.searchParams.set("artifact_id", getRequiredTaskId(taskId))
  url.searchParams.set("output_format", "pptx")

  return url.toString()
}

function buildNotebookUrl(pathSegments: string[]): string {
  const origin = getNotebookBackendOrigin()
  const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/")

  return `${origin}/${encodedPath}`
}

function getRequiredNotebookId(notebookId: string): string {
  const trimmedNotebookId = notebookId.trim()

  if (!trimmedNotebookId) {
    throw new NotebookBackendConfigurationError("Notebook id is required")
  }

  return trimmedNotebookId
}

function getRequiredTaskId(taskId: string): string {
  const trimmedTaskId = taskId.trim()

  if (!trimmedTaskId) {
    throw new NotebookBackendConfigurationError("Task id is required")
  }

  return trimmedTaskId
}

function trimTrailingSlash(pathname: string): string {
  return pathname === "/" ? "" : pathname.replace(/\/+$/u, "")
}
