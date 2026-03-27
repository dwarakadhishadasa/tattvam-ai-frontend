import { describe, expect, it } from "vitest"

import type { PersistedSessionRecord, SessionState } from "../../components/pipeline/types"
import {
  parseSessionIndex,
  readLegacySessions,
  resolveRestoredSession,
} from "../../lib/persistence/schema"
import {
  readActiveSessionId,
  readLectureDuration,
  readSessionIndex,
  writeActiveSessionId,
  writeLectureDuration,
  writeSessionIndex,
  type BrowserStorage,
} from "../../lib/persistence/localSessionIndex"

describe("browser persistence schema", () => {
  it("filters malformed legacy sessions during migration parsing", () => {
    const validSession = createSession("session-1", "Recovered Session", 100)
    const rawValue = JSON.stringify([
      validSession,
      { id: "broken-session", title: "Broken", updatedAt: "yesterday", state: {} },
    ])

    const result = readLegacySessions(rawValue)

    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0]?.id).toBe("session-1")
    expect(result.skippedCount).toBe(1)
  })

  it("prunes stale pointers and falls back to the next valid session", () => {
    const latestSession = createSession("latest", "Latest Session", 200)
    const olderSession = createSession("older", "Older Session", 100)

    const resolution = resolveRestoredSession(
      "missing-session",
      [
        { id: "missing-session", title: "Missing", updatedAt: 300 },
        { id: latestSession.id, title: latestSession.title, updatedAt: latestSession.updatedAt },
        { id: olderSession.id, title: olderSession.title, updatedAt: olderSession.updatedAt },
      ],
      [latestSession, olderSession],
    )

    expect(resolution.activeSessionId).toBe("latest")
    expect(resolution.activeSession?.id).toBe("latest")
    expect(resolution.sessionIndex.map((entry) => entry.id)).toEqual(["latest", "older"])
    expect(resolution.notices.map((notice) => notice.code)).toContain("stale-active-session")
    expect(resolution.notices.map((notice) => notice.code)).toContain("stale-session-pruned")
  })

  it("drops malformed session-index entries", () => {
    const parsedIndex = parseSessionIndex(
      JSON.stringify([
        { id: "session-1", title: "Valid", updatedAt: 100 },
        { id: "session-2", title: 42, updatedAt: 90 },
      ]),
    )

    expect(parsedIndex).toEqual([{ id: "session-1", title: "Valid", updatedAt: 100 }])
  })
})

describe("local session index helpers", () => {
  it("round-trips lecture duration, active session id, and session index", () => {
    const storage = createMemoryStorage()

    writeLectureDuration(storage, 45)
    writeActiveSessionId(storage, "session-42")
    writeSessionIndex(storage, [{ id: "session-42", title: "Saved Session", updatedAt: 123 }])

    expect(readLectureDuration(storage)).toBe(45)
    expect(readActiveSessionId(storage)).toBe("session-42")
    expect(readSessionIndex(storage)).toEqual([
      { id: "session-42", title: "Saved Session", updatedAt: 123 },
    ])
  })
})

function createSession(id: string, title: string, updatedAt: number): PersistedSessionRecord {
  return {
    id,
    title,
    updatedAt,
    stateVersion: 2,
    state: createState(),
  }
}

function createState(): SessionState {
  return {
    activeStep: 0,
    talkType: null,
    verseDetails: { book: "bg", verse: "" },
    generalTopic: "",
    festivalName: "",
    yatraLocation: "",
    extractedVerseData: null,
    messages: [{ id: "1", role: "assistant", content: "welcome" }],
    savedSnippets: [],
    notebookName: "",
    generatedNotebookId: null,
    generatedSlides: "",
  }
}

function createMemoryStorage(): BrowserStorage {
  const values = new Map<string, string>()

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}
