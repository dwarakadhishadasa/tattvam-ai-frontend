import { afterEach, describe, expect, it, vi } from "vitest"

import {
  GEMINI_PROVIDER_UNAVAILABLE_MESSAGE,
  GeminiProviderUnavailableError,
  normalizeGeminiError,
} from "../../lib/gemini/errors"

const { googleGenAiConstructorSpy, generateContentSpy } = vi.hoisted(() => ({
  googleGenAiConstructorSpy: vi.fn(),
  generateContentSpy: vi.fn(),
}))

vi.mock("@google/genai", () => ({
  GoogleGenAI: class GoogleGenAI {
    models = {
      generateContent: generateContentSpy,
    }

    constructor(options: unknown) {
      googleGenAiConstructorSpy(options)
    }
  },
}))

vi.mock("server-only", () => ({}))

describe("gemini error normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
    googleGenAiConstructorSpy.mockReset()
    generateContentSpy.mockReset()
  })

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

  it("initializes the server client from GEMINI_API_KEY without needing NEXT_PUBLIC_GEMINI_API_KEY", async () => {
    vi.stubEnv("GEMINI_API_KEY", "server-only-key")
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "")
    generateContentSpy.mockResolvedValueOnce({ text: "generated text" })

    const { generateGeminiText } = await import("../../lib/gemini/server")
    const text = await generateGeminiText("hello")

    expect(text).toBe("generated text")
    expect(googleGenAiConstructorSpy).toHaveBeenCalledWith({ apiKey: "server-only-key" })
    expect(generateContentSpy).toHaveBeenCalledWith({
      model: "gemini-3-flash-preview",
      contents: "hello",
    })
  })

  it("rejects public-only Gemini key fallback and preserves recoverable normalization", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", "public-key")

    const { generateGeminiText } = await import("../../lib/gemini/server")

    await expect(generateGeminiText("hello")).rejects.toMatchObject({
      name: "GeminiProviderUnavailableError",
      message: GEMINI_PROVIDER_UNAVAILABLE_MESSAGE,
    })
    expect(googleGenAiConstructorSpy).not.toHaveBeenCalled()
  })
})
