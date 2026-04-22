import "server-only"

import { Pool, type PoolConfig } from "pg"

const DEFAULT_LECTURE_CITATIONS_TABLE = "lecture_citations"
const DEFAULT_POOL_MAX_CONNECTIONS = 3
const DEFAULT_CONNECTION_TIMEOUT_MS = 5_000
const DEFAULT_IDLE_TIMEOUT_MS = 10_000

type CitationContentRow = {
  url?: unknown
  content?: unknown
}

let cachedPool: Pool | null = null
let cachedPoolConnectionString: string | null = null

export class LectureCitationStoreConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LectureCitationStoreConfigurationError"
  }
}

export function isLectureCitationStoreConfigurationError(
  error: unknown,
): error is LectureCitationStoreConfigurationError {
  return error instanceof LectureCitationStoreConfigurationError
}

export async function getCitationContentByUrls(urls: string[]): Promise<Map<string, string>> {
  const uniqueUrls = Array.from(new Set(urls.filter((url) => typeof url === "string" && url.trim())))

  if (uniqueUrls.length === 0) {
    return new Map()
  }

  const config = readCitationStoreConfig()
  const queryText = `select url, content from ${quoteQualifiedIdentifier(config.table)} where url = any($1::text[])`

  try {
    const result = await getCitationStorePool(config.databaseUrl).query<CitationContentRow>(queryText, [
      uniqueUrls,
    ])
    const contentByUrl = new Map<string, string>()

    for (const row of result.rows) {
      if (typeof row.url !== "string" || !row.url.trim()) {
        continue
      }

      contentByUrl.set(row.url, typeof row.content === "string" ? row.content : "")
    }

    return contentByUrl
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Lecture citation database lookup failed: ${message}`, { cause: error })
  }
}

function getCitationStorePool(databaseUrl: string): Pool {
  if (!cachedPool || cachedPoolConnectionString !== databaseUrl) {
    cachedPool = new Pool({
      connectionString: databaseUrl,
      max: DEFAULT_POOL_MAX_CONNECTIONS,
      idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
      allowExitOnIdle: true,
      ...getOptionalSslConfig(databaseUrl),
    })
    cachedPoolConnectionString = databaseUrl
  }

  return cachedPool
}

function readCitationStoreConfig(): {
  databaseUrl: string
  table: string
} {
  const databaseUrl =
    normalizeEnvValue(process.env.TATTVAM_LECTURE_CITATIONS_DATABASE_URL) ||
    normalizeEnvValue(process.env.POSTGRES_URL) ||
    normalizeEnvValue(process.env.POSTGRES_URL_NON_POOLING)
  const table =
    normalizeEnvValue(process.env.TATTVAM_LECTURE_CITATIONS_TABLE) ||
    DEFAULT_LECTURE_CITATIONS_TABLE

  if (!databaseUrl) {
    throw new LectureCitationStoreConfigurationError(
      "TATTVAM_LECTURE_CITATIONS_DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING is not configured",
    )
  }

  if (!table.trim()) {
    throw new LectureCitationStoreConfigurationError(
      "TATTVAM_LECTURE_CITATIONS_TABLE must not be empty",
    )
  }

  return {
    databaseUrl,
    table,
  }
}

function normalizeEnvValue(value: string | undefined): string {
  const trimmed = value?.trim()

  if (!trimmed) {
    return ""
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function getOptionalSslConfig(databaseUrl: string): Pick<PoolConfig, "ssl"> | object {
  try {
    const sslMode = new URL(databaseUrl).searchParams.get("sslmode")?.toLowerCase()

    if (sslMode === "no-verify") {
      // Supabase pooler URLs can be provisioned with sslmode=no-verify when the runtime
      // cannot validate the managed certificate chain.
      return { ssl: { rejectUnauthorized: false } }
    }
  } catch {
    // Ignore invalid URLs here; the pg client will surface a connection error later.
  }

  return {}
}

function quoteQualifiedIdentifier(identifier: string): string {
  const parts = identifier
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0 || !parts.every((part) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))) {
    throw new LectureCitationStoreConfigurationError(
      "TATTVAM_LECTURE_CITATIONS_TABLE must be a simple SQL identifier or schema-qualified identifier",
    )
  }

  return parts.map((part) => `"${part}"`).join(".")
}
