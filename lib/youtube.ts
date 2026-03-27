const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/
const EMBED_PATH_SEGMENTS = new Set(["embed", "live", "shorts", "v"])

type YouTubeInfo = {
  url: string
  videoId: string
  start: number | null
}

export function getYouTubeInfo(rawUrl: string): YouTubeInfo | null {
  const url = parseExternalUrl(rawUrl)

  if (!url || !isYouTubeHostname(url.hostname)) {
    return null
  }

  const videoId = extractVideoId(url)

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return null
  }

  return {
    url: url.toString(),
    videoId,
    start: extractStartTime(url),
  }
}

export function getYouTubeEmbedUrl(rawUrl: string): string | null {
  const info = getYouTubeInfo(rawUrl)

  if (!info) {
    return null
  }

  return `https://www.youtube.com/embed/${info.videoId}${info.start ? `?start=${info.start}` : ""}`
}

function parseExternalUrl(rawUrl: string): URL | null {
  const candidate = sanitizeUrlCandidate(rawUrl)

  if (!candidate) {
    return null
  }

  try {
    return new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`)
  } catch {
    return null
  }
}

function sanitizeUrlCandidate(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/^[<([{'"`]+/, "")
    .replace(/[>)\]}.,;!?'"`]+$/, "")
}

function isYouTubeHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase()

  return (
    normalized === "youtu.be" ||
    normalized.endsWith(".youtu.be") ||
    normalized === "youtube.com" ||
    normalized.endsWith(".youtube.com") ||
    normalized === "youtube-nocookie.com" ||
    normalized.endsWith(".youtube-nocookie.com")
  )
}

function extractVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase()
  const segments = url.pathname.split("/").filter(Boolean)

  if (hostname === "youtu.be" || hostname.endsWith(".youtu.be")) {
    return segments[0] ?? null
  }

  if (segments[0] === "watch") {
    return url.searchParams.get("v")
  }

  if (segments[0] === "u" && segments.length >= 3) {
    return segments[2]
  }

  if (segments[0] && EMBED_PATH_SEGMENTS.has(segments[0])) {
    return segments[1] ?? null
  }

  return url.searchParams.get("v")
}

function extractStartTime(url: URL): number | null {
  const directParam = url.searchParams.get("start") ?? url.searchParams.get("t")
  const hashParam = url.hash.startsWith("#t=") ? url.hash.slice(3) : null

  return parseTimestamp(directParam) ?? parseTimestamp(hashParam)
}

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null
  }

  const normalized = value.trim()

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10)
  }

  let totalSeconds = 0

  const hours = normalized.match(/(\d+)h/)
  const minutes = normalized.match(/(\d+)m/)
  const seconds = normalized.match(/(\d+)s/)

  if (hours) {
    totalSeconds += Number.parseInt(hours[1], 10) * 3600
  }

  if (minutes) {
    totalSeconds += Number.parseInt(minutes[1], 10) * 60
  }

  if (seconds) {
    totalSeconds += Number.parseInt(seconds[1], 10)
  }

  return totalSeconds > 0 ? totalSeconds : null
}
