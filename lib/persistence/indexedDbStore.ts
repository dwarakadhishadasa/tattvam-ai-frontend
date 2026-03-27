import type {
  PersistedSessionRecord,
  PersistedVisualSettingRecord,
  PersistedVisualSettings,
  VisualSettingKey,
} from "../../components/pipeline/types"
import {
  isValidVisualSettingRecord,
  normalizePersistedSessionRecord,
} from "./schema"

export const PERSISTENCE_DATABASE_NAME = "tattvam-pipeline"
const PERSISTENCE_DATABASE_VERSION = 1
const SESSION_STORE_NAME = "sessions"
const SETTINGS_STORE_NAME = "settings"

export class PersistenceStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PersistenceStoreError"
  }
}

export function isIndexedDbSupported(indexedDb: IDBFactory | undefined = globalThis.indexedDB): boolean {
  return typeof indexedDb !== "undefined"
}

export async function getAllSessions(indexedDb?: IDBFactory): Promise<PersistedSessionRecord[]> {
  const database = await openPersistenceDatabase(indexedDb)
  const result = await runRequest<unknown[]>(database.transaction(SESSION_STORE_NAME, "readonly").objectStore(SESSION_STORE_NAME).getAll())
  database.close()
  return result
    .map((session) => normalizePersistedSessionRecord(session))
    .filter((session): session is PersistedSessionRecord => session !== null)
    .sort((left, right) => right.updatedAt - left.updatedAt)
}

export async function getSession(
  sessionId: string,
  indexedDb?: IDBFactory,
): Promise<PersistedSessionRecord | null> {
  const database = await openPersistenceDatabase(indexedDb)
  const result = await runRequest<unknown>(database.transaction(SESSION_STORE_NAME, "readonly").objectStore(SESSION_STORE_NAME).get(sessionId))
  database.close()
  return normalizePersistedSessionRecord(result)
}

export async function putSession(
  session: PersistedSessionRecord,
  indexedDb?: IDBFactory,
): Promise<PersistedSessionRecord> {
  const database = await openPersistenceDatabase(indexedDb)
  await runRequest(
    database.transaction(SESSION_STORE_NAME, "readwrite").objectStore(SESSION_STORE_NAME).put(session),
  )
  database.close()
  return session
}

export async function putSessions(
  sessions: PersistedSessionRecord[],
  indexedDb?: IDBFactory,
): Promise<PersistedSessionRecord[]> {
  if (sessions.length === 0) {
    return []
  }

  const database = await openPersistenceDatabase(indexedDb)
  const transaction = database.transaction(SESSION_STORE_NAME, "readwrite")
  const store = transaction.objectStore(SESSION_STORE_NAME)

  for (const session of sessions) {
    store.put(session)
  }

  await waitForTransaction(transaction)
  database.close()
  return sessions
}

export async function putSetting(
  setting: PersistedVisualSettingRecord,
  indexedDb?: IDBFactory,
): Promise<PersistedVisualSettingRecord> {
  const database = await openPersistenceDatabase(indexedDb)
  await runRequest(
    database.transaction(SETTINGS_STORE_NAME, "readwrite").objectStore(SETTINGS_STORE_NAME).put(setting),
  )
  database.close()
  return setting
}

export async function getSetting(
  key: VisualSettingKey,
  indexedDb?: IDBFactory,
): Promise<PersistedVisualSettingRecord | null> {
  const database = await openPersistenceDatabase(indexedDb)
  const result = await runRequest<unknown>(database.transaction(SETTINGS_STORE_NAME, "readonly").objectStore(SETTINGS_STORE_NAME).get(key))
  database.close()
  return isValidVisualSettingRecord(result) ? result : null
}

export async function deleteSetting(key: VisualSettingKey, indexedDb?: IDBFactory): Promise<void> {
  const database = await openPersistenceDatabase(indexedDb)
  await runRequest(
    database.transaction(SETTINGS_STORE_NAME, "readwrite").objectStore(SETTINGS_STORE_NAME).delete(key),
  )
  database.close()
}

export async function getVisualSettings(indexedDb?: IDBFactory): Promise<PersistedVisualSettings> {
  const [slideImage, extractedStyle] = await Promise.all([
    getSetting("slide_image_cache", indexedDb),
    getSetting("slide_style_cache", indexedDb),
  ])

  return {
    slideImage: slideImage?.value ?? null,
    extractedStyle: extractedStyle?.value ?? "",
  }
}

async function openPersistenceDatabase(indexedDb: IDBFactory | undefined = globalThis.indexedDB): Promise<IDBDatabase> {
  if (!indexedDb) {
    throw new PersistenceStoreError("IndexedDB is unavailable in this browser.")
  }

  return new Promise((resolve, reject) => {
    const request = indexedDb.open(PERSISTENCE_DATABASE_NAME, PERSISTENCE_DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(SESSION_STORE_NAME)) {
        database.createObjectStore(SESSION_STORE_NAME, { keyPath: "id" })
      }

      if (!database.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        database.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "key" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new PersistenceStoreError(request.error?.message ?? "Failed to open IndexedDB."))
    request.onblocked = () =>
      reject(new PersistenceStoreError("IndexedDB open request was blocked by another tab."))
  })
}

function runRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(new PersistenceStoreError(request.error?.message ?? "IndexedDB request failed."))
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(new PersistenceStoreError(transaction.error?.message ?? "IndexedDB transaction failed."))
    transaction.onabort = () =>
      reject(new PersistenceStoreError(transaction.error?.message ?? "IndexedDB transaction was aborted."))
  })
}
