import type { Citation } from "@/lib/chat/shared"

export type PipelineStep = 0 | 1 | 2 | 3

export type TalkType = "verse" | "general" | "festival" | "yatra" | null

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
}

export type SavedSnippet = {
  id: string
  content: string
}

export type VerseData = {
  title: string
  verseText: string
  translation: string
  purport: string
  url: string
}

export type VerseDetails = {
  book: string
  verse: string
}

export type SessionState = {
  activeStep: PipelineStep
  talkType: TalkType
  verseDetails: VerseDetails
  generalTopic: string
  festivalName: string
  yatraLocation: string
  extractedVerseData: VerseData | null
  messages: Message[]
  savedSnippets: SavedSnippet[]
  notebookName: string
  generatedNotebookId: string | null
  generatedSlides: string
}

export type Session = {
  id: string
  title: string
  updatedAt: number
  state: SessionState
}
