import type {
  Message,
  MigrationOutcome,
  PersistedSessionRecord,
  PersistedVisualSettingRecord,
  RecoveryNotice,
  Session,
  SessionIndexEntry,
  SessionState,
  TalkType,
  VerseData,
  VerseDetails,
  VisualSettingKey,
} from "../../components/pipeline/types"

export const PERSISTENCE_STATE_VERSION = 2

export const LEGACY_SESSION_STORAGE_KEY = "tattvam_sessions"
export const LEGACY_STYLE_STORAGE_KEY = "slide_style_cache"
export const LEGACY_IMAGE_STORAGE_KEY = "slide_image_cache"

type LegacySessionParseResult = {
  sessions: PersistedSessionRecord[]
  skippedCount: number
}

type RestoreResolutionResult = {
  activeSessionId: string | null
  activeSession: PersistedSessionRecord | null
  sessionIndex: SessionIndexEntry[]
  notices: RecoveryNotice[]
}

export function createRecoveryNotice(
  code: RecoveryNotice["code"],
  title: string,
  message: string,
  level: RecoveryNotice["level"] = "warning",
): RecoveryNotice {
  return {
    id: `${code}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code,
    title,
    message,
    level,
  }
}

export function deriveSessionIndex(sessions: PersistedSessionRecord[]): SessionIndexEntry[] {
  return [...sessions]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
    }))
}

export function createPersistedSessionRecord(session: Session): PersistedSessionRecord {
  return {
    ...session,
    stateVersion: PERSISTENCE_STATE_VERSION,
  }
}

export function isValidSessionIndexEntry(value: unknown): value is SessionIndexEntry {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  )
}

export function isValidPersistedSessionRecord(value: unknown): value is PersistedSessionRecord {
  return normalizePersistedSessionRecord(value) !== null
}

export function isValidVisualSettingRecord(value: unknown): value is PersistedVisualSettingRecord {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value.key === LEGACY_IMAGE_STORAGE_KEY || value.key === LEGACY_STYLE_STORAGE_KEY) &&
    typeof value.value === "string" &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  )
}

export function parseSessionIndex(rawValue: string | null): SessionIndexEntry[] {
  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isValidSessionIndexEntry)
  } catch {
    return []
  }
}

export function readLegacySessions(rawValue: string | null): LegacySessionParseResult {
  if (!rawValue) {
    return { sessions: [], skippedCount: 0 }
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!Array.isArray(parsed)) {
      return { sessions: [], skippedCount: 0 }
    }

    const sessions = parsed.reduce<PersistedSessionRecord[]>((accumulator, candidate) => {
      const session = normalizePersistedSessionRecord(candidate)
      if (session) {
        accumulator.push(session)
      }
      return accumulator
    }, [])

    return {
      sessions: sessions.sort((left, right) => right.updatedAt - left.updatedAt),
      skippedCount: parsed.length - sessions.length,
    }
  } catch {
    return { sessions: [], skippedCount: 0 }
  }
}

export function readLegacyVisualSetting(
  key: VisualSettingKey,
  rawValue: string | null,
): PersistedVisualSettingRecord | null {
  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return null
  }

  return {
    key,
    value: rawValue,
    updatedAt: Date.now(),
  }
}

export function resolveRestoredSession(
  preferredSessionId: string | null,
  storedIndex: SessionIndexEntry[],
  storedSessions: PersistedSessionRecord[],
): RestoreResolutionResult {
  const notices: RecoveryNotice[] = []
  const sessionMap = new Map(storedSessions.map((session) => [session.id, session]))

  const indexSource = storedIndex.length > 0 ? storedIndex : deriveSessionIndex(storedSessions)
  const prunedIndex: SessionIndexEntry[] = []

  for (const entry of indexSource) {
    const matchingSession = sessionMap.get(entry.id)

    if (!matchingSession || !isValidPersistedSessionRecord(matchingSession)) {
      notices.push(
        createRecoveryNotice(
          "stale-session-pruned",
          "Session history was repaired",
          `A stale history entry for "${entry.title}" was removed because its saved data was unavailable.`,
        ),
      )
      continue
    }

    prunedIndex.push({
      id: matchingSession.id,
      title: matchingSession.title,
      updatedAt: matchingSession.updatedAt,
    })
  }

  let activeSessionId = preferredSessionId
  let activeSession =
    activeSessionId && sessionMap.has(activeSessionId) ? sessionMap.get(activeSessionId) ?? null : null

  if (activeSessionId && !activeSession) {
    notices.push(
      createRecoveryNotice(
        "stale-active-session",
        "The last session could not be reopened",
        "We removed a stale active-session pointer and reopened the next available draft instead.",
      ),
    )
    activeSessionId = null
  }

  if (!activeSession && prunedIndex.length > 0) {
    activeSessionId = prunedIndex[0].id
    activeSession = sessionMap.get(activeSessionId) ?? null
  }

  return {
    activeSessionId,
    activeSession,
    sessionIndex: prunedIndex,
    notices,
  }
}

export function createMigrationOutcome(
  migratedSessionIds: string[],
  migratedSettings: VisualSettingKey[],
  skippedLegacySessions: number,
): MigrationOutcome {
  const notices: RecoveryNotice[] = []

  if (migratedSessionIds.length > 0 || migratedSettings.length > 0) {
    notices.push(
      createRecoveryNotice(
        "migration-complete",
        "Browser data upgraded",
        "Saved browser data was moved into the new persistence format for more reliable restores.",
        "info",
      ),
    )
  }

  if (skippedLegacySessions > 0) {
    notices.push(
      createRecoveryNotice(
        "migration-partial",
        "Some cached sessions could not be recovered",
        `${skippedLegacySessions} malformed legacy session${skippedLegacySessions === 1 ? "" : "s"} were skipped during migration.`,
      ),
    )
  }

  return {
    migratedSessionIds,
    migratedSettings,
    skippedLegacySessions,
    notices,
  }
}

function normalizeLegacySession(value: unknown): PersistedSessionRecord | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt)
  ) {
    return null
  }

  const state = normalizeSessionState(value.state, value.updatedAt)

  if (!state) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    updatedAt: value.updatedAt,
    stateVersion:
      typeof value.stateVersion === "number" && Number.isFinite(value.stateVersion)
        ? value.stateVersion
        : PERSISTENCE_STATE_VERSION,
    state,
  }
}

export function normalizePersistedSessionRecord(
  value: unknown,
): PersistedSessionRecord | null {
  return normalizeLegacySession(value)
}

function normalizeSessionState(
  value: unknown,
  fallbackTimestamp = Date.now(),
): SessionState | null {
  if (!isRecord(value)) {
    return null
  }

  const generatedNotebookId =
    typeof value.generatedNotebookId === "string" ? value.generatedNotebookId : null
  const activeStep = normalizePipelineStep(value.activeStep, generatedNotebookId)

  if (
    activeStep === null ||
    !isTalkType(value.talkType) ||
    !isValidVerseDetails(value.verseDetails) ||
    typeof value.generalTopic !== "string" ||
    typeof value.festivalName !== "string" ||
    typeof value.yatraLocation !== "string" ||
    (value.extractedVerseData !== null && !isValidVerseData(value.extractedVerseData)) ||
    !Array.isArray(value.messages) ||
    !value.messages.every(isValidMessage) ||
    !Array.isArray(value.savedSnippets) ||
    typeof value.notebookName !== "string" ||
    typeof value.generatedSlides !== "string"
  ) {
    return null
  }

  const savedSnippets = value.savedSnippets.reduce<SessionState["savedSnippets"]>(
    (accumulator, candidate) => {
      const snippet = normalizeSavedSnippet(candidate, fallbackTimestamp)
      if (snippet) {
        accumulator.push(snippet)
      }
      return accumulator
    },
    [],
  )

  const activeNotebookEntryId =
    typeof value.activeNotebookEntryId === "string" &&
    savedSnippets.some((snippet) => snippet.id === value.activeNotebookEntryId)
      ? value.activeNotebookEntryId
      : null

  return {
    activeStep,
    talkType: value.talkType,
    verseDetails: value.verseDetails,
    generalTopic: value.generalTopic,
    festivalName: value.festivalName,
    yatraLocation: value.yatraLocation,
    extractedVerseData: value.extractedVerseData,
    messages: value.messages,
    savedSnippets,
    notebookName: value.notebookName,
    activeNotebookEntryId,
    generatedNotebookId,
    generatedSlides: value.generatedSlides,
  }
}

function isValidSessionState(value: unknown): value is SessionState {
  return normalizeSessionState(value) !== null
}

function isValidMessage(value: unknown): value is Message {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    (value.citations === undefined || Array.isArray(value.citations))
  )
}

function isValidSavedSnippet(value: unknown): value is SessionState["savedSnippets"][number] {
  return normalizeSavedSnippet(value) !== null
}

function normalizeSavedSnippet(
  value: unknown,
  fallbackTimestamp = Date.now(),
): SessionState["savedSnippets"][number] | null {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.id !== "string") {
    return null
  }

  if (typeof value.sourceContent === "string" && typeof value.content === "string") {
    return {
      id: value.id,
      sourceMessageId: typeof value.sourceMessageId === "string" ? value.sourceMessageId : null,
      sourceType: isNotebookSourceType(value.sourceType) ? value.sourceType : "response",
      sourceContent: value.sourceContent,
      content: value.content,
      isEdited:
        typeof value.isEdited === "boolean"
          ? value.isEdited
          : value.content !== value.sourceContent,
      updatedAt:
        typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
          ? value.updatedAt
          : fallbackTimestamp,
    }
  }

  if (typeof value.content !== "string") {
    return null
  }

  return {
    id: value.id,
    sourceMessageId: null,
    sourceType: "response",
    sourceContent: value.content,
    content: value.content,
    isEdited: false,
    updatedAt: fallbackTimestamp,
  }
}

function isValidVerseData(value: unknown): value is VerseData {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.title === "string" &&
    typeof value.verseText === "string" &&
    typeof value.translation === "string" &&
    typeof value.purport === "string" &&
    typeof value.url === "string"
  )
}

function isValidVerseDetails(value: unknown): value is VerseDetails {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.book === "string" && typeof value.verse === "string"
}

function normalizePipelineStep(
  value: unknown,
  generatedNotebookId: string | null,
): SessionState["activeStep"] | null {
  if (value === 0 || value === 1) {
    return value
  }

  if (value === 2) {
    return generatedNotebookId ? 2 : 1
  }

  if (value === 3) {
    return 2
  }

  return null
}

function isTalkType(value: unknown): value is TalkType {
  return value === null || value === "verse" || value === "general" || value === "festival" || value === "yatra"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNotebookSourceType(
  value: unknown,
): value is SessionState["savedSnippets"][number]["sourceType"] {
  return value === "response" || value === "citation" || value === "context"
}
