"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type {
  PersistedSessionRecord,
  RecoveryNotice,
  SessionIndexEntry,
  SessionState,
} from "../components/pipeline/types"
import {
  clearLegacyPersistenceKeys,
  readActiveSessionId,
  readLectureDuration,
  readSessionIndex,
  writeActiveSessionId,
  writeLectureDuration,
  writeSessionIndex,
} from "../lib/persistence/localSessionIndex"
import {
  deleteSetting,
  getAllSessions,
  getSession,
  getSetting,
  getVisualSettings,
  isIndexedDbSupported,
  PersistenceStoreError,
  putSession,
  putSessions,
  putSetting,
} from "../lib/persistence/indexedDbStore"
import {
  createMigrationOutcome,
  createPersistedSessionRecord,
  createRecoveryNotice,
  deriveSessionIndex,
  LEGACY_IMAGE_STORAGE_KEY,
  LEGACY_SESSION_STORAGE_KEY,
  LEGACY_STYLE_STORAGE_KEY,
  readLegacySessions,
  readLegacyVisualSetting,
  resolveRestoredSession,
} from "../lib/persistence/schema"

type UseSessionPersistenceArgs = {
  currentSessionState: SessionState
  lectureDuration: number
  slideImage: string | null
  extractedStyle: string
  createSessionId: () => string
  createEmptySessionState: () => SessionState
  createSessionSnapshot: (id: string, state: SessionState) => PersistedSessionRecord | Omit<PersistedSessionRecord, "stateVersion">
  hasMeaningfulSessionData: (state: SessionState) => boolean
  onRestoreSessionState: (state: SessionState) => void
  onRestoreLectureDuration: (value: number) => void
  onRestoreSlideImage: (value: string | null) => void
  onRestoreExtractedStyle: (value: string) => void
}

type UseSessionPersistenceResult = {
  currentSessionId: string
  sessionIndex: SessionIndexEntry[]
  notices: RecoveryNotice[]
  isHydrated: boolean
  loadSession: (sessionId: string) => Promise<void>
  startNewSession: () => void
  clearVisualCache: () => Promise<void>
}

export function useSessionPersistence({
  currentSessionState,
  lectureDuration,
  slideImage,
  extractedStyle,
  createSessionId,
  createEmptySessionState,
  createSessionSnapshot,
  hasMeaningfulSessionData,
  onRestoreSessionState,
  onRestoreLectureDuration,
  onRestoreSlideImage,
  onRestoreExtractedStyle,
}: UseSessionPersistenceArgs): UseSessionPersistenceResult {
  const storageRef = useRef<Storage | null>(null)
  const fallbackSessionsRef = useRef<PersistedSessionRecord[]>([])
  const degradedModeRef = useRef(false)
  const [currentSessionId, setCurrentSessionId] = useState("")
  const [sessionIndex, setSessionIndex] = useState<SessionIndexEntry[]>([])
  const [notices, setNotices] = useState<RecoveryNotice[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  const pushNotice = useCallback((notice: RecoveryNotice) => {
    setNotices((previousNotices) => {
      const hasMatch = previousNotices.some(
        (existingNotice) =>
          existingNotice.code === notice.code && existingNotice.message === notice.message,
      )

      if (hasMatch) {
        return previousNotices
      }

      return [notice, ...previousNotices]
    })
  }, [])

  const restoreFallbackState = useCallback((
    storage: Storage | null,
    preferredSessionId: string | null,
    degradedMessage: string,
  ) => {
    const legacySessionResult = readLegacySessions(storage?.getItem(LEGACY_SESSION_STORAGE_KEY) ?? null)
    const resolvedLegacy = resolveRestoredSession(
      preferredSessionId,
      deriveSessionIndex(legacySessionResult.sessions),
      legacySessionResult.sessions,
    )
    const legacyImage = storage?.getItem(LEGACY_IMAGE_STORAGE_KEY) ?? null
    const legacyStyle = storage?.getItem(LEGACY_STYLE_STORAGE_KEY) ?? ""

    fallbackSessionsRef.current = legacySessionResult.sessions
    degradedModeRef.current = true
    setSessionIndex(resolvedLegacy.sessionIndex)
    setCurrentSessionId(resolvedLegacy.activeSessionId ?? createSessionId())
    onRestoreSessionState(resolvedLegacy.activeSession?.state ?? createEmptySessionState())
    onRestoreSlideImage(legacyImage)
    onRestoreExtractedStyle(legacyStyle)
    setNotices([
      ...resolvedLegacy.notices,
      ...createMigrationOutcome([], [], legacySessionResult.skippedCount).notices,
      createRecoveryNotice(
        "persistence-degraded",
        "Browser persistence is degraded",
        degradedMessage,
      ),
    ])
  }, [
    createEmptySessionState,
    createSessionId,
    onRestoreExtractedStyle,
    onRestoreSessionState,
    onRestoreSlideImage,
  ])

  const migrateLegacyPersistence = useCallback(async (storage: Storage | null): Promise<RecoveryNotice[]> => {
    if (!storage) {
      return []
    }

    const legacySessionRaw = storage.getItem(LEGACY_SESSION_STORAGE_KEY)
    const legacyStyleRaw = storage.getItem(LEGACY_STYLE_STORAGE_KEY)
    const legacyImageRaw = storage.getItem(LEGACY_IMAGE_STORAGE_KEY)

    if (!legacySessionRaw && !legacyStyleRaw && !legacyImageRaw) {
      return []
    }

    const parsedLegacySessions = readLegacySessions(legacySessionRaw)
    const existingSessions = await getAllSessions()
    const existingSessionMap = new Map(existingSessions.map((session) => [session.id, session]))
    const sessionsToWrite = parsedLegacySessions.sessions.filter((legacySession) => {
      const existingSession = existingSessionMap.get(legacySession.id)
      return !existingSession || existingSession.updatedAt < legacySession.updatedAt
    })

    if (sessionsToWrite.length > 0) {
      await putSessions(sessionsToWrite)
    }

    const migratedSettings: Array<"slide_image_cache" | "slide_style_cache"> = []
    const legacySettings = [
      readLegacyVisualSetting("slide_style_cache", legacyStyleRaw),
      readLegacyVisualSetting("slide_image_cache", legacyImageRaw),
    ].filter((setting): setting is NonNullable<typeof setting> => setting !== null)

    for (const legacySetting of legacySettings) {
      const existingSetting = await getSetting(legacySetting.key)

      if (!existingSetting || existingSetting.value !== legacySetting.value) {
        await putSetting(legacySetting)
        migratedSettings.push(legacySetting.key)
      }
    }

    const migratedSessionIds = sessionsToWrite.map((session) => session.id)
    const migrationOutcome = createMigrationOutcome(
      migratedSessionIds,
      migratedSettings,
      parsedLegacySessions.skippedCount,
    )

    if (migratedSessionIds.length > 0 || migratedSettings.length > 0) {
      const nextSessions = upsertManySessions(existingSessions, sessionsToWrite)
      const nextIndex = deriveSessionIndex(nextSessions)
      writeSessionIndex(storage, nextIndex)

      if (!readActiveSessionId(storage) && nextIndex[0]) {
        writeActiveSessionId(storage, nextIndex[0].id)
      }

      clearLegacyPersistenceKeys(storage)
    }

    return migrationOutcome.notices
  }, [])

  useEffect(() => {
    storageRef.current = window.localStorage

    let isCancelled = false

    async function restorePersistenceState() {
      const storage = storageRef.current
      const preferredSessionId = readActiveSessionId(storage)
      const storedLectureDuration = readLectureDuration(storage)

      if (storedLectureDuration !== null) {
        onRestoreLectureDuration(storedLectureDuration)
      }

      if (!isIndexedDbSupported()) {
        restoreFallbackState(
          storage,
          preferredSessionId,
          "IndexedDB is unavailable, so browser history will open in read-only recovery mode.",
        )
        if (!isCancelled) {
          setIsHydrated(true)
        }
        return
      }

      try {
        const migrationNotices = await migrateLegacyPersistence(storage)
        const storedSessions = await getAllSessions()
        const resolution = resolveRestoredSession(
          readActiveSessionId(storage) ?? preferredSessionId,
          readSessionIndex(storage),
          storedSessions,
        )
        const visualSettings = await getVisualSettings()

        fallbackSessionsRef.current = storedSessions
        degradedModeRef.current = false

        writeSessionIndex(storage, resolution.sessionIndex)
        writeActiveSessionId(storage, resolution.activeSessionId)

        if (!isCancelled) {
          setSessionIndex(resolution.sessionIndex)
          setCurrentSessionId(resolution.activeSessionId ?? createSessionId())
          onRestoreSessionState(resolution.activeSession?.state ?? createEmptySessionState())
          onRestoreSlideImage(visualSettings.slideImage)
          onRestoreExtractedStyle(visualSettings.extractedStyle)
          setNotices([
            ...buildMissingVisualNotices(visualSettings),
            ...resolution.notices,
            ...migrationNotices,
          ])
          setIsHydrated(true)
        }
      } catch (error) {
        const fallbackMessage =
          error instanceof PersistenceStoreError
            ? error.message
            : "Browser persistence failed to initialize."

        restoreFallbackState(storage, preferredSessionId, fallbackMessage)

        if (!isCancelled) {
          setIsHydrated(true)
        }
      }
    }

    void restorePersistenceState()

    return () => {
      isCancelled = true
    }
  }, [
    createEmptySessionState,
    createSessionId,
    restoreFallbackState,
    migrateLegacyPersistence,
    onRestoreExtractedStyle,
    onRestoreLectureDuration,
    onRestoreSessionState,
    onRestoreSlideImage,
  ])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    writeLectureDuration(storageRef.current, lectureDuration)
  }, [isHydrated, lectureDuration])

  useEffect(() => {
    if (!isHydrated || degradedModeRef.current || !isIndexedDbSupported()) {
      return
    }

    let isCancelled = false

    async function persistVisualSettings() {
      try {
        if (slideImage) {
          await putSetting({
            key: "slide_image_cache",
            value: slideImage,
            updatedAt: Date.now(),
          })
        } else {
          await deleteSetting("slide_image_cache")
        }

        if (extractedStyle) {
          await putSetting({
            key: "slide_style_cache",
            value: extractedStyle,
            updatedAt: Date.now(),
          })
        } else {
          await deleteSetting("slide_style_cache")
        }
      } catch (error) {
        if (!isCancelled) {
          degradedModeRef.current = true
          pushNotice(
            createRecoveryNotice(
              "persistence-degraded",
              "Visual settings are in temporary recovery mode",
              error instanceof Error
                ? error.message
                : "Visual settings could not be saved to browser storage.",
            ),
          )
        }
      }
    }

    void persistVisualSettings()

    return () => {
      isCancelled = true
    }
  }, [extractedStyle, isHydrated, pushNotice, slideImage])

  useEffect(() => {
    if (!isHydrated || degradedModeRef.current || !currentSessionId || !isIndexedDbSupported()) {
      return
    }

    if (!hasMeaningfulSessionData(currentSessionState)) {
      return
    }

    let isCancelled = false

    async function persistSession() {
      try {
        const snapshot = createSessionSnapshot(currentSessionId, currentSessionState)
        const sessionRecord = createPersistedSessionRecord(snapshot)
        const savedSession = await putSession(sessionRecord)

        if (isCancelled) {
          return
        }

        fallbackSessionsRef.current = upsertPersistedSession(fallbackSessionsRef.current, savedSession)

        const nextIndex = deriveSessionIndex(fallbackSessionsRef.current)
        setSessionIndex(nextIndex)
        writeSessionIndex(storageRef.current, nextIndex)
        writeActiveSessionId(storageRef.current, currentSessionId)
      } catch (error) {
        if (!isCancelled) {
          degradedModeRef.current = true
          pushNotice(
            createRecoveryNotice(
              "persistence-degraded",
              "Autosave paused",
              error instanceof Error
                ? error.message
                : "The current session could not be written to browser storage.",
            ),
          )
        }
      }
    }

    void persistSession()

    return () => {
      isCancelled = true
    }
  }, [
    createSessionSnapshot,
    currentSessionId,
    currentSessionState,
    hasMeaningfulSessionData,
    isHydrated,
    pushNotice,
  ])

  async function loadSession(sessionId: string) {
    const storage = storageRef.current

    const restoredSession = degradedModeRef.current
      ? fallbackSessionsRef.current.find((session) => session.id === sessionId) ?? null
      : await getSession(sessionId).catch(() => null)

    if (!restoredSession) {
      const nextIndex = sessionIndex.filter((entry) => entry.id !== sessionId)
      fallbackSessionsRef.current = fallbackSessionsRef.current.filter((session) => session.id !== sessionId)
      setSessionIndex(nextIndex)
      writeSessionIndex(storage, nextIndex)
      writeActiveSessionId(storage, nextIndex[0]?.id ?? null)
      pushNotice(
        createRecoveryNotice(
          "session-restore-failed",
          "That session is no longer available",
          "We removed the stale history entry and kept the workspace usable.",
        ),
      )

      if (nextIndex[0]) {
        const fallbackSession = fallbackSessionsRef.current.find(
          (session) => session.id === nextIndex[0].id,
        )
        setCurrentSessionId(nextIndex[0].id)
        onRestoreSessionState(fallbackSession?.state ?? createEmptySessionState())
        return
      }

      const draftSessionId = createSessionId()
      setCurrentSessionId(draftSessionId)
      onRestoreSessionState(createEmptySessionState())
      return
    }

    setCurrentSessionId(restoredSession.id)
    onRestoreSessionState(restoredSession.state)
    writeActiveSessionId(storage, restoredSession.id)
  }

  function startNewSession() {
    setCurrentSessionId(createSessionId())
    onRestoreSessionState(createEmptySessionState())
    writeActiveSessionId(storageRef.current, null)
  }

  async function clearVisualCache() {
    onRestoreSlideImage(null)
    onRestoreExtractedStyle("")

    if (degradedModeRef.current || !isIndexedDbSupported()) {
      storageRef.current?.removeItem(LEGACY_IMAGE_STORAGE_KEY)
      storageRef.current?.removeItem(LEGACY_STYLE_STORAGE_KEY)
      pushNotice(
        createRecoveryNotice(
          "visual-cache-cleared",
          "Visual cache cleared",
          "Saved style and reference-slide data were cleared from recovery storage.",
          "info",
        ),
      )
      return
    }

    try {
      await Promise.all([deleteSetting("slide_image_cache"), deleteSetting("slide_style_cache")])
      pushNotice(
        createRecoveryNotice(
          "visual-cache-cleared",
          "Visual cache cleared",
          "Saved style and reference-slide data were removed. Slide generation will stay blocked until you add a style again.",
          "info",
        ),
      )
    } catch (error) {
      degradedModeRef.current = true
      pushNotice(
        createRecoveryNotice(
          "persistence-degraded",
          "Visual cache could not be cleared cleanly",
          error instanceof Error ? error.message : "Browser storage failed while clearing visual settings.",
        ),
      )
    }
  }

  return {
    currentSessionId,
    sessionIndex,
    notices,
    isHydrated,
    loadSession,
    startNewSession,
    clearVisualCache,
  }
}

function buildMissingVisualNotices(visualSettings: {
  slideImage: string | null
  extractedStyle: string
}): RecoveryNotice[] {
  if (!visualSettings.slideImage && !visualSettings.extractedStyle) {
    return []
  }

  if (visualSettings.slideImage && visualSettings.extractedStyle) {
    return []
  }

  return [
    createRecoveryNotice(
      "visual-settings-missing",
      "Visual settings were only partially restored",
      "Some cached visual settings were missing, so slide generation will remain blocked until the style prompt is available again.",
    ),
  ]
}

function upsertPersistedSession(
  sessions: PersistedSessionRecord[],
  nextSession: PersistedSessionRecord,
): PersistedSessionRecord[] {
  const existingIndex = sessions.findIndex((session) => session.id === nextSession.id)

  if (existingIndex === -1) {
    return [nextSession, ...sessions]
  }

  const nextSessions = [...sessions]
  nextSessions[existingIndex] = nextSession
  return nextSessions
}

function upsertManySessions(
  sessions: PersistedSessionRecord[],
  nextSessions: PersistedSessionRecord[],
): PersistedSessionRecord[] {
  return nextSessions.reduce(upsertPersistedSession, sessions)
}
