import { createWelcomeMessage, INITIAL_VERSE_DETAILS } from "@/components/pipeline/constants"
import type {
  Message,
  SavedSnippet,
  Session,
  SessionState,
  TalkType,
  VerseData,
} from "@/components/pipeline/types"

type LectureOverviewPayload = {
  overview: string
  keyPoints: string[]
}

export function createSessionId(): string {
  return Date.now().toString()
}

export function createInitialMessages(): Message[] {
  return [createWelcomeMessage()]
}

export function createEmptySessionState(): SessionState {
  return {
    activeStep: 0,
    talkType: null,
    verseDetails: { ...INITIAL_VERSE_DETAILS },
    generalTopic: "",
    festivalName: "",
    yatraLocation: "",
    extractedVerseData: null,
    messages: createInitialMessages(),
    savedSnippets: [],
    notebookName: "",
    generatedNotebookId: null,
    generatedSlides: "",
  }
}

export function createSessionSnapshot(id: string, state: SessionState): Session {
  return {
    id,
    title: getSessionTitle(state),
    updatedAt: Date.now(),
    state,
  }
}

export function getSessionTitle(state: SessionState): string {
  if (state.extractedVerseData?.title) {
    return state.extractedVerseData.title
  }

  if (state.talkType === "general" && state.generalTopic) {
    return `General: ${state.generalTopic}`
  }

  if (state.talkType === "festival" && state.festivalName) {
    return `Festival: ${state.festivalName}`
  }

  if (state.talkType === "yatra" && state.yatraLocation) {
    return `Yatra: ${state.yatraLocation}`
  }

  if (state.messages.length > 1) {
    return `${state.messages[1].content.substring(0, 30)}...`
  }

  return "New Session"
}

export function hasMeaningfulSessionData(state: SessionState): boolean {
  return Boolean(state.talkType || state.messages.length > 1 || state.savedSnippets.length > 0)
}

export function upsertSession(sessions: Session[], nextSession: Session): Session[] {
  const existingIndex = sessions.findIndex((session) => session.id === nextSession.id)

  if (existingIndex >= 0) {
    const updatedSessions = [...sessions]
    updatedSessions[existingIndex] = nextSession
    return updatedSessions
  }

  return [nextSession, ...sessions]
}

export function readStoredSessions(rawValue: string | null): Session[] {
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return Array.isArray(parsed) ? (parsed as Session[]) : []
  } catch {
    return []
  }
}

export function splitSlides(markdown: string): string[] {
  return markdown
    .split("---")
    .map((slide) => slide.trim())
    .filter(Boolean)
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function countSnippetWords(snippets: SavedSnippet[]): number {
  return snippets.reduce((total, snippet) => total + countWords(snippet.content), 0)
}

export function getRequiredWordCount(lectureDuration: number): number {
  return lectureDuration * 140
}

export function buildLectureVerseData(
  talkType: Exclude<TalkType, "verse" | null>,
  subject: string,
  data: LectureOverviewPayload,
): VerseData {
  const titlePrefix = {
    general: "General Lecture",
    festival: "Festival Lecture",
    yatra: "Yatra Talk",
  }[talkType]

  return {
    title: `${titlePrefix}: ${subject}`,
    verseText: "",
    translation: data.overview,
    purport: data.keyPoints.join("\n\n"),
    url: "",
  }
}
