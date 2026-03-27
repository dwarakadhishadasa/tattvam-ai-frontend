import { describe, expect, it } from "vitest"

import {
  GEMINI_PROVIDER_UNAVAILABLE_MESSAGE,
  GeminiProviderUnavailableError,
  normalizeGeminiError,
} from "../../lib/gemini/errors"

describe("gemini error normalization", () => {
  it("maps leaked API key failures to a recoverable provider-unavailable error", () => {
    const error = normalizeGeminiError(
      new Error(
        '{"error":{"code":403,"message":"Your API key was reported as leaked. Please use another API key.","status":"PERMISSION_DENIED"}}',
      ),
    )

    expect(error).toBeInstanceOf(GeminiProviderUnavailableError)
    expect(error.message).toBe(GEMINI_PROVIDER_UNAVAILABLE_MESSAGE)
  })

  it("maps missing API key configuration to the same recoverable error", () => {
    const error = normalizeGeminiError(new Error("GEMINI_API_KEY is not configured"))

    expect(error).toBeInstanceOf(GeminiProviderUnavailableError)
    expect(error.message).toBe(GEMINI_PROVIDER_UNAVAILABLE_MESSAGE)
  })

  it("preserves unrelated Gemini failures", () => {
    const error = normalizeGeminiError(new Error("upstream timeout"))

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(GeminiProviderUnavailableError)
    expect(error.message).toBe("upstream timeout")
  })
})
