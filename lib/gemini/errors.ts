export const GEMINI_PROVIDER_UNAVAILABLE_MESSAGE =
  "Visual style extraction is temporarily unavailable. Add a valid Gemini API key to re-enable it, or enter the style prompt manually."

export class GeminiProviderUnavailableError extends Error {
  constructor(
    message = GEMINI_PROVIDER_UNAVAILABLE_MESSAGE,
    readonly statusCode = 503,
  ) {
    super(message)
    this.name = "GeminiProviderUnavailableError"
  }
}

export function normalizeGeminiError(error: unknown): Error {
  if (error instanceof GeminiProviderUnavailableError) {
    return error
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase()

    if (
      normalizedMessage.includes("api key was reported as leaked") ||
      normalizedMessage.includes("permission_denied") ||
      normalizedMessage.includes("api key not valid") ||
      normalizedMessage.includes("invalid api key")
    ) {
      return new GeminiProviderUnavailableError()
    }

    if (normalizedMessage.includes("gemini_api_key is not configured")) {
      return new GeminiProviderUnavailableError()
    }
  }

  return error instanceof Error ? error : new Error("Gemini request failed")
}
