const MAX_ERROR_TEXT_LENGTH = 280

export async function readResponseBody(response: Response): Promise<unknown> {
  const rawText = await response.text()

  if (!rawText) {
    return null
  }

  const trimmedText = rawText.trim()

  if (!trimmedText) {
    return null
  }

  if (!shouldAttemptJsonParse(trimmedText, response.headers.get("Content-Type"))) {
    return rawText
  }

  try {
    return JSON.parse(rawText) as unknown
  } catch {
    return rawText
  }
}

export function getResponseErrorMessage(data: unknown, fallbackMessage: string): string {
  if (isRecord(data)) {
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error
    }

    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail
    }

    if (
      isRecord(data.detail) &&
      typeof data.detail.message === "string" &&
      data.detail.message.trim()
    ) {
      return data.detail.message
    }
  }

  const textErrorMessage = getPlainTextErrorMessage(data)

  if (textErrorMessage) {
    return textErrorMessage
  }

  return fallbackMessage
}

function shouldAttemptJsonParse(
  trimmedText: string,
  contentTypeHeader: string | null,
): boolean {
  const normalizedContentType = contentTypeHeader?.toLowerCase() ?? ""

  if (normalizedContentType.includes("application/json") || normalizedContentType.includes("+json")) {
    return true
  }

  const firstCharacter = trimmedText[0]

  return firstCharacter === "{" || firstCharacter === "[" || firstCharacter === '"'
}

function getPlainTextErrorMessage(data: unknown): string | null {
  if (typeof data !== "string") {
    return null
  }

  const trimmed = data.trim()

  if (!trimmed || looksLikeHtml(trimmed)) {
    return null
  }

  return trimmed.length > MAX_ERROR_TEXT_LENGTH
    ? `${trimmed.slice(0, MAX_ERROR_TEXT_LENGTH - 3)}...`
    : trimmed
}

function looksLikeHtml(value: string): boolean {
  const normalized = value.trim().toLowerCase()

  return normalized.startsWith("<!doctype html") || normalized.startsWith("<html")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
