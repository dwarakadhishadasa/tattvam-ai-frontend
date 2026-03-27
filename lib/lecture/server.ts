import "server-only"

import { generateGeminiJson } from "@/lib/gemini/server"

export type LectureContextPayload = {
  overview: string
  keyPoints: string[]
}

type LectureKind = "general" | "festival" | "yatra"

const LECTURE_PROMPTS: Record<LectureKind, (subject: string) => string> = {
  general: (topic) =>
    `Generate a brief overview and key points for a general lecture on the topic: "${topic}".
Format the response as JSON with:
- "overview": a concise overview paragraph
- "keyPoints": an array of short key talking points`,
  festival: (festivalName) =>
    `Generate a brief overview and key points for a festival lecture on the topic: "${festivalName}".
Format the response as JSON with:
- "overview": a concise overview paragraph
- "keyPoints": an array of short key talking points`,
  yatra: (location) =>
    `Generate a brief overview and key points for a yatra talk at: "${location}".
Format the response as JSON with:
- "overview": a concise overview paragraph
- "keyPoints": an array of short key talking points`,
}

export async function generateLectureContext(
  kind: LectureKind,
  subject: string,
): Promise<LectureContextPayload> {
  const normalizedSubject = subject.trim()

  if (!normalizedSubject) {
    throw new Error("A lecture subject is required")
  }

  const data = await generateGeminiJson<Partial<LectureContextPayload>>(LECTURE_PROMPTS[kind](normalizedSubject))

  return {
    overview: typeof data.overview === "string" ? data.overview : "",
    keyPoints: Array.isArray(data.keyPoints)
      ? data.keyPoints.filter((item): item is string => typeof item === "string")
      : [],
  }
}
