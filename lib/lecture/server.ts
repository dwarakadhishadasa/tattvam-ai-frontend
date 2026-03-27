import "server-only"

import { normalizeDownstreamChatResponse } from "@/lib/chat/normalize"
import {
  ChatBackendUnavailableError,
  forwardChatQuestion,
} from "@/lib/chat/server"
import { generateGeminiJson } from "@/lib/gemini/server"
import { parseLectureContextAnswer } from "@/lib/lecture/parse"

export type LectureContextPayload = {
  overview: string
  keyPoints: string[]
}

type LectureKind = "general" | "festival" | "yatra"

const GEMINI_LECTURE_PROMPTS: Record<Extract<LectureKind, "yatra">, (subject: string) => string> = {
  yatra: (location) =>
    `Generate a brief overview and key points for a yatra talk at: "${location}".
Format the response as JSON with:
- "overview": a concise overview paragraph
- "keyPoints": an array of short key talking points`,
}

const NOTEBOOK_LECTURE_PROMPTS: Record<
  Extract<LectureKind, "general" | "festival">,
  (subject: string) => string
> = {
  general: (topic) =>
    [
      `Create concise lecture preparation notes for the topic "${topic}".`,
      "Start with one short overview paragraph.",
      "Then provide 4 to 6 short bullet points with the most important talking points.",
      "Do not return JSON.",
    ].join(" "),
  festival: (festivalName) =>
    [
      `Create concise lecture preparation notes for the festival "${festivalName}".`,
      "Start with one short overview paragraph.",
      "Then provide 4 to 6 short bullet points with the most important talking points.",
      "Do not return JSON.",
    ].join(" "),
}

export async function generateLectureContext(
  kind: LectureKind,
  subject: string,
): Promise<LectureContextPayload> {
  const normalizedSubject = subject.trim()

  if (!normalizedSubject) {
    throw new Error("A lecture subject is required")
  }

  if (kind === "general" || kind === "festival") {
    return generateNotebookLectureContext(kind, normalizedSubject)
  }

  const data = await generateGeminiJson<Partial<LectureContextPayload>>(
    GEMINI_LECTURE_PROMPTS[kind](normalizedSubject),
  )

  return {
    overview: typeof data.overview === "string" ? data.overview : "",
    keyPoints: Array.isArray(data.keyPoints)
      ? data.keyPoints.filter((item): item is string => typeof item === "string")
      : [],
  }
}

async function generateNotebookLectureContext(
  kind: Extract<LectureKind, "general" | "festival">,
  subject: string,
): Promise<LectureContextPayload> {
  let backendResponse: Response

  try {
    backendResponse = await forwardChatQuestion(NOTEBOOK_LECTURE_PROMPTS[kind](subject))
  } catch (error) {
    if (error instanceof ChatBackendUnavailableError) {
      throw error
    }

    throw new Error("Failed to fetch lecture context from the notebook backend")
  }

  const rawText = await backendResponse.text()
  const data = rawText ? (JSON.parse(rawText) as unknown) : null

  if (!backendResponse.ok) {
    const errorPayload =
      typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {}

    throw new Error(getBackendErrorMessage(errorPayload))
  }

  const normalizedResponse = normalizeDownstreamChatResponse(
    data as Parameters<typeof normalizeDownstreamChatResponse>[0],
  )

  if (!normalizedResponse) {
    throw new Error("Malformed chat response from the notebook backend")
  }

  return parseLectureContextAnswer(normalizedResponse.result.answerBody)
}
function getBackendErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error
  }

  if (typeof data.detail === "string" && data.detail.trim()) {
    return data.detail
  }

  return "Failed to fetch lecture context from the notebook backend"
}
