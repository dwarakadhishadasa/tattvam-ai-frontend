const DEFAULT_LECTURE_CITATIONS_TABLE = "lecture_citations"

type CitationContentRow = {
  url?: unknown
  content?: unknown
}

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
  const requestUrl = new URL(`/rest/v1/${encodeURIComponent(config.table)}`, config.supabaseUrl)
  requestUrl.searchParams.set("select", "url,content")
  requestUrl.searchParams.set("url", `in.(${uniqueUrls.map(quoteSupabaseValue).join(",")})`)

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Supabase lecture citation lookup failed (${response.status}): ${
        detail.trim() || response.statusText || "Unknown error"
      }`,
    )
  }

  const data = (await response.json()) as unknown
  const rows = Array.isArray(data) ? (data as CitationContentRow[]) : []
  const contentByUrl = new Map<string, string>()

  for (const row of rows) {
    if (typeof row.url !== "string" || !row.url.trim()) {
      continue
    }

    contentByUrl.set(row.url, typeof row.content === "string" ? row.content : "")
  }

  return contentByUrl
}

function readCitationStoreConfig(): {
  supabaseUrl: string
  serviceRoleKey: string
  table: string
} {
  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const table =
    process.env.TATTVAM_LECTURE_CITATIONS_TABLE?.trim() || DEFAULT_LECTURE_CITATIONS_TABLE

  if (!supabaseUrl) {
    throw new LectureCitationStoreConfigurationError("SUPABASE_URL is not configured")
  }

  if (!serviceRoleKey) {
    throw new LectureCitationStoreConfigurationError(
      "SUPABASE_SERVICE_ROLE_KEY is not configured",
    )
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    table,
  }
}

function quoteSupabaseValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}
