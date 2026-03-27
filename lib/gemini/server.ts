import "server-only"

import { GoogleGenAI } from "@google/genai"

const GEMINI_MODEL = "gemini-3-flash-preview"

type InlineDataPart = {
  inlineData: {
    data: string
    mimeType: string
  }
}

type TextPart = {
  text: string
}

let cachedClient: GoogleGenAI | null = null

function getGeminiApiKey(): string {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured")
  }

  return apiKey
}

function getGeminiClient(): GoogleGenAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: getGeminiApiKey() })
  }

  return cachedClient
}

export async function generateGeminiJson<T>(prompt: string): Promise<T> {
  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  })

  if (!response.text) {
    throw new Error("Gemini returned an empty JSON response")
  }

  return JSON.parse(response.text) as T
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  })

  return response.text?.trim() || ""
}

export async function generateGeminiTextFromParts(
  parts: Array<InlineDataPart | TextPart>,
): Promise<string> {
  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      parts,
    },
  })

  return response.text?.trim() || ""
}
