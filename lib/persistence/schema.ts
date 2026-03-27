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
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt) &&
    typeof value.stateVersion === "number" &&
    isValidSessionState(value.state)
  )
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
      const session = normalizeLegacySession(candidate)
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
    !Number.isFinite(value.updatedAt) ||
    !isValidSessionState(value.state)
  ) {
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
    state: value.state,
  }
}

function isValidSessionState(value: unknown): value is SessionState {
  if (!isRecord(value)) {
    return false
  }

  return (
    isPipelineStep(value.activeStep) &&
    isTalkType(value.talkType) &&
    isValidVerseDetails(value.verseDetails) &&
    typeof value.generalTopic === "string" &&
    typeof value.festivalName === "string" &&
    typeof value.yatraLocation === "string" &&
    (value.extractedVerseData === null || isValidVerseData(value.extractedVerseData)) &&
    Array.isArray(value.messages) &&
    value.messages.every(isValidMessage) &&
    Array.isArray(value.savedSnippets) &&
    value.savedSnippets.every(isValidSavedSnippet) &&
    typeof value.notebookName === "string" &&
    (typeof value.generatedNotebookId === "string" || value.generatedNotebookId === null) &&
    typeof value.generatedSlides === "string"
  )
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
  if (!isRecord(value)) {
    return false
  }

  return typeof value.id === "string" && typeof value.content === "string"
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

function isPipelineStep(value: unknown): value is SessionState["activeStep"] {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function isTalkType(value: unknown): value is TalkType {
  return value === null || value === "verse" || value === "general" || value === "festival" || value === "yatra"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
