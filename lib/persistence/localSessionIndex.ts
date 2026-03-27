import type { SessionIndexEntry } from "../../components/pipeline/types"
import {
  LEGACY_IMAGE_STORAGE_KEY,
  LEGACY_SESSION_STORAGE_KEY,
  LEGACY_STYLE_STORAGE_KEY,
  parseSessionIndex,
} from "./schema"

export const LECTURE_DURATION_STORAGE_KEY = "lecture_duration_cache"
export const ACTIVE_SESSION_STORAGE_KEY = "tattvam_active_session_id"
export const SESSION_INDEX_STORAGE_KEY = "tattvam_session_index"

export type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function readLectureDuration(storage: BrowserStorage | null): number | null {
  const rawValue = storage?.getItem(LECTURE_DURATION_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export function writeLectureDuration(storage: BrowserStorage | null, value: number): void {
  storage?.setItem(LECTURE_DURATION_STORAGE_KEY, value.toString())
}

export function readActiveSessionId(storage: BrowserStorage | null): string | null {
  const rawValue = storage?.getItem(ACTIVE_SESSION_STORAGE_KEY)
  return typeof rawValue === "string" && rawValue.length > 0 ? rawValue : null
}

export function writeActiveSessionId(storage: BrowserStorage | null, sessionId: string | null): void {
  if (!storage) {
    return
  }

  if (!sessionId) {
    storage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
    return
  }

  storage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId)
}

export function readSessionIndex(storage: BrowserStorage | null): SessionIndexEntry[] {
  return parseSessionIndex(storage?.getItem(SESSION_INDEX_STORAGE_KEY) ?? null)
}

export function writeSessionIndex(storage: BrowserStorage | null, entries: SessionIndexEntry[]): void {
  storage?.setItem(SESSION_INDEX_STORAGE_KEY, JSON.stringify(entries))
}

export function pruneSessionIndex(
  storage: BrowserStorage | null,
  validSessionIds: Set<string>,
): SessionIndexEntry[] {
  const nextIndex = readSessionIndex(storage).filter((entry) => validSessionIds.has(entry.id))
  writeSessionIndex(storage, nextIndex)
  return nextIndex
}

export function clearLegacyPersistenceKeys(storage: BrowserStorage | null): void {
  storage?.removeItem(LEGACY_SESSION_STORAGE_KEY)
  storage?.removeItem(LEGACY_STYLE_STORAGE_KEY)
  storage?.removeItem(LEGACY_IMAGE_STORAGE_KEY)
}
