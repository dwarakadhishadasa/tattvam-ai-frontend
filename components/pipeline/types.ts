import type { Citation } from "@/lib/chat/shared"
import type { SlideDeckJobState } from "@/lib/slides/shared"

export type PipelineStep = 0 | 1 | 2

export type TalkType = "verse" | "general" | "festival" | "yatra" | null

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  targetKey?: string
  targetLabel?: string
  status?: "complete" | "error"
}

export type NotebookEntrySourceType = "response" | "citation" | "context"

export type NotebookReadiness = "insufficient" | "ready"

export type SavedSnippet = {
  id: string
  sourceMessageId: string | null
  sourceType: NotebookEntrySourceType
  sourceContent: string
  content: string
  isEdited: boolean
  updatedAt: number
}

export type NotebookEntrySaveInput = {
  sourceMessageId: string | null
  sourceType: NotebookEntrySourceType
  sourceContent: string
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
  activeNotebookEntryId: string | null
  generatedNotebookId: string | null
  generatedSlides: string
  slideDeckTaskId: string | null
  slideDeckState: SlideDeckJobState
  slideDeckError: string | null
  slideDeckErrorCode: string | null
  slideDeckRequestedAt: number | null
  slideDeckLastCheckedAt: number | null
  slideDeckCompletedAt: number | null
}

export type Session = {
  id: string
  title: string
  updatedAt: number
  state: SessionState
}

export type SessionIndexEntry = {
  id: string
  title: string
  updatedAt: number
}

export type PersistedSessionRecord = Session & {
  stateVersion: number
}

export type VisualSettingKey = "slide_image_cache" | "slide_style_cache"

export type PersistedVisualSettingRecord = {
  key: VisualSettingKey
  value: string
  updatedAt: number
}

export type PersistedVisualSettings = {
  slideImage: string | null
  extractedStyle: string
}

export type RecoveryNoticeLevel = "info" | "warning"

export type RecoveryNoticeCode =
  | "migration-complete"
  | "migration-partial"
  | "stale-active-session"
  | "stale-session-pruned"
  | "visual-settings-missing"
  | "persistence-degraded"
  | "visual-cache-cleared"
  | "session-restore-failed"

export type RecoveryNotice = {
  id: string
  code: RecoveryNoticeCode
  title: string
  message: string
  level: RecoveryNoticeLevel
}

export type MigrationOutcome = {
  migratedSessionIds: string[]
  migratedSettings: VisualSettingKey[]
  skippedLegacySessions: number
  notices: RecoveryNotice[]
}
