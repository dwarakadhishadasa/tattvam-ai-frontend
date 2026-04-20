import { getYouTubeInfo } from "@/lib/youtube"
import { getCitationNumbersFromText } from "@/lib/chat/citation-ranges"
import type { ChatRouteSuccessResponse, Citation, NormalizedChatResult } from "@/lib/chat/shared"
import { isLectureExtractionTargetKey } from "@/lib/chat/target-keys"

type DownstreamReference = {
  citation_number?: number | string
  cited_text?: string
  url?: string
  source_url?: string
  timestamped_url?: string
  link?: string
}

type DownstreamResult = {
  answer?: string
  conversation_id?: string
  turn_number?: number
  is_follow_up?: boolean
  references?: DownstreamReference[]
}

export type DownstreamChatResponse = {
  ok?: boolean
  result?: DownstreamResult
  error?: string
}

type NormalizeDownstreamChatOptions = {
  targetKey?: string | null
}

export function normalizeDownstreamChatResponse(
  data: DownstreamChatResponse | null | undefined,
  options?: NormalizeDownstreamChatOptions,
): ChatRouteSuccessResponse | null {
  if (!data?.ok || !data.result?.answer) {
    return null
  }

  return {
    ok: true,
    result: normalizeDownstreamResult(data.result, options),
  }
}

export function normalizeDownstreamResult(
  result: DownstreamResult,
  options?: NormalizeDownstreamChatOptions,
): NormalizedChatResult {
  const answer = result.answer ?? ""
  const answerBody = stripCitationAppendix(answer)
  const appendixStart = findCitationAppendixStart(answer)
  const appendixText = appendixStart === -1 ? "" : answer.slice(appendixStart)
  const appendixUrls = extractCitationUrls(appendixText)
  const references = Array.isArray(result.references) ? result.references : []
  const citations = isLectureExtractionTargetKey(options?.targetKey)
    ? normalizeLectureCitations(answerBody, references)
    : normalizeGenericCitations(references, appendixUrls)

  return {
    answerBody,
    citations,
    conversationId: normalizeString(result.conversation_id),
    turnNumber: normalizeFiniteNumber(result.turn_number),
    isFollowUp: typeof result.is_follow_up === "boolean" ? result.is_follow_up : null,
  }
}

function normalizeGenericCitations(
  references: DownstreamReference[],
  appendixUrls: Record<number, string>,
): Citation[] {
  return references
    .map((reference) => {
      const number = normalizeCitationNumber(reference.citation_number)

      if (number <= 0) {
        return null
      }

      const text = typeof reference.cited_text === "string" ? reference.cited_text : ""

      if (!text || text.includes("---")) {
        return null
      }

      return {
        number,
        text,
        url:
          getReferenceUrl(reference) ||
          appendixUrls[number] ||
          getYouTubeUrlFromText(reference.cited_text),
      }
    })
    .filter((citation): citation is Citation => citation !== null)
}

function normalizeLectureCitations(
  answerBody: string,
  references: DownstreamReference[],
): Citation[] {
  const citedNumbers = new Set(getCitationNumbersFromText(answerBody))

  if (citedNumbers.size === 0) {
    return []
  }

  const citationsByNumber = new Map<number, Citation>()

  for (const reference of references) {
    const citation = normalizeLectureCitation(reference, citedNumbers)

    if (!citation || citationsByNumber.has(citation.number)) {
      continue
    }

    citationsByNumber.set(citation.number, citation)
  }

  return Array.from(citationsByNumber.values()).sort((left, right) => left.number - right.number)
}

function normalizeLectureCitation(
  reference: DownstreamReference,
  citedNumbers: Set<number>,
): Citation | null {
  const number = normalizeCitationNumber(reference.citation_number)

  if (number <= 0 || !citedNumbers.has(number)) {
    return null
  }

  const citedText = typeof reference.cited_text === "string" ? reference.cited_text : ""
  const sections = extractLectureSections(citedText)
  const url =
    normalizeExternalUrl(getReferenceUrlCandidate(reference)) ||
    normalizeExternalUrl(sections.url) ||
    getYouTubeUrlFromText(citedText)
  const text = sections.content

  if (!url && !text) {
    return null
  }

  return {
    number,
    text,
    url,
  }
}

function extractLectureSections(text: string): { url: string; content: string } {
  if (!text) {
    return { url: "", content: "" }
  }

  const sections = new Map<string, string>()
  const matches = Array.from(
    text.matchAll(/\b(Themes|URL|Content-type|Audience|Content)\s*:/gi),
  )

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const label = match[1].toLowerCase()
    const valueStart = (match.index ?? 0) + match[0].length
    const valueEnd = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length
    const value = text.slice(valueStart, valueEnd).trim()

    if (value) {
      sections.set(label, value)
    }
  }

  return {
    url: sections.get("url") ?? "",
    content: sections.get("content") ?? "",
  }
}

export function stripCitationAppendix(answer: string): string {
  const appendixStart = findCitationAppendixStart(answer)
  const answerBody =
    appendixStart === -1 ? answer.trim() : answer.slice(0, appendixStart).trimEnd()

  return answerBody.replace(/\n\s*(?:\*{3,}|-{3,}|_{3,})\s*$/u, "").trim()
}

export function findCitationAppendixStart(answer: string): number {
  const lines = answer.split(/\r?\n/)

  if (lines.length === 0) {
    return -1
  }

  let lastContentIndex = lines.length - 1

  while (lastContentIndex >= 0 && lines[lastContentIndex].trim() === "") {
    lastContentIndex -= 1
  }

  if (lastContentIndex < 0) {
    return -1
  }

  let cursor = lastContentIndex
  let citationLineCount = 0

  while (cursor >= 0) {
    const trimmedLine = lines[cursor].trim()

    if (!trimmedLine) {
      cursor -= 1
      continue
    }

    if (isCitationAppendixLine(trimmedLine)) {
      citationLineCount += 1
      cursor -= 1
      continue
    }

    if (citationLineCount > 0 && isAppendixPreambleLine(trimmedLine)) {
      cursor -= 1
      continue
    }

    break
  }

  if (citationLineCount === 0) {
    return -1
  }

  return answerLineIndexToOffset(lines, cursor + 1)
}

function extractCitationUrls(appendixText: string): Record<number, string> {
  const byNumber: Record<number, string> = {}

  for (const rawLine of appendixText.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!isCitationAppendixLine(line)) {
      continue
    }

    const url = getYouTubeUrlFromText(line)

    if (!url) {
      continue
    }

    for (const citationNumber of getCitationNumbersFromLine(line)) {
      byNumber[citationNumber] = url
    }
  }

  return byNumber
}

function isCitationAppendixLine(line: string): boolean {
  return getCitationNumbersFromLine(line).length > 0 && Boolean(getYouTubeUrlFromText(line))
}

function isAppendixPreambleLine(line: string): boolean {
  return (
    /^(?:#{1,6}\s+.+|\*{1,2}.+\*{1,2}:?|_{3,}|-{3,}|\*{3,})$/u.test(line) ||
    /^references?\s*:?\s*$/iu.test(line) ||
    /^citations?\s*:?\s*$/iu.test(line) ||
    /^sources?\s*:?\s*$/iu.test(line)
  )
}

function getCitationNumbersFromLine(line: string): number[] {
  const numbers = new Set<number>()

  for (const match of line.matchAll(/\[(\d+)\]/g)) {
    const parsed = Number.parseInt(match[1], 10)

    if (!Number.isNaN(parsed) && parsed > 0) {
      numbers.add(parsed)
    }
  }

  const listNumber = line.match(/^\s*(\d+)\./u)

  if (listNumber && numbers.size === 0) {
    const parsed = Number.parseInt(listNumber[1], 10)

    if (!Number.isNaN(parsed) && parsed > 0) {
      numbers.add(parsed)
    }
  }

  return Array.from(numbers)
}

function getReferenceUrl(reference: DownstreamReference): string {
  const candidate = getReferenceUrlCandidate(reference)

  if (!candidate) {
    return ""
  }

  const youtubeInfo = getYouTubeInfo(candidate)
  return youtubeInfo ? youtubeInfo.url : ""
}

function getReferenceUrlCandidate(reference: DownstreamReference): string {
  const candidates = [reference.url, reference.source_url, reference.timestamped_url, reference.link]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return ""
}

function getYouTubeUrlFromText(text: string | undefined): string {
  if (!text) {
    return ""
  }

  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    const youtubeInfo = getYouTubeInfo(match[0])

    if (youtubeInfo) {
      return youtubeInfo.url
    }
  }

  return ""
}

function normalizeExternalUrl(value: string): string {
  if (!value) {
    return ""
  }

  try {
    const normalized = new URL(value.trim())
    return /^https?:$/u.test(normalized.protocol) ? normalized.toString() : ""
  } catch {
    return ""
  }
}

function normalizeCitationNumber(value: number | string | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  return 0
}

function normalizeString(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeFiniteNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function answerLineIndexToOffset(lines: string[], targetLineIndex: number): number {
  let offset = 0

  for (let index = 0; index < targetLineIndex; index += 1) {
    offset += lines[index].length + 1
  }

  return offset
}
