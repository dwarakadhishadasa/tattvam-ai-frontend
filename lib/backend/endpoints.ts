export const DEFAULT_NOTEBOOK_BACKEND_ORIGIN = "http://127.0.0.1:8000"

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
  const origin = rawOrigin?.trim() || DEFAULT_NOTEBOOK_BACKEND_ORIGIN
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
  return buildNotebookUrl([
    "v1",
    "notebooks",
    getDefaultExtractionChatNotebookId(),
    "chat",
    "ask",
  ])
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

function trimTrailingSlash(pathname: string): string {
  return pathname === "/" ? "" : pathname.replace(/\/+$/u, "")
}
