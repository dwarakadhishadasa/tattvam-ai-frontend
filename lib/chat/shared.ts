import { getYouTubeInfo } from "@/lib/youtube"

export type Citation = {
  number: number
  text: string
  url: string
}

type BackendReference = {
  citation_number?: number | string
  cited_text?: string
  url?: string
  source_url?: string
  timestamped_url?: string
  link?: string
}

type BackendResult = {
  answer?: string
  references?: BackendReference[]
}

export type BackendChatResponse = {
  ok?: boolean
  result?: BackendResult
  error?: string
}

export type ParsedChatResponse = {
  cleanAnswer: string
  citations: Citation[]
}

export function parseBackendChatResponse(data: BackendChatResponse | null | undefined): ParsedChatResponse | null {
  if (!data?.ok || !data.result?.answer) {
    return null
  }

  const { answer, references = [] } = data.result

  const citationSectionStart = findCitationSectionStart(answer)
  const cleanAnswer =
    citationSectionStart !== -1 ? answer.substring(0, citationSectionStart).trim() : answer.trim()
  const citationSearchText = citationSectionStart !== -1 ? answer.substring(citationSectionStart) : answer
  const { byNumber: urlMap, ordered: orderedUrls } = extractCitationUrls(citationSearchText)

  const citations: Citation[] = references
    .map((ref, index) => {
      const citationNumber = normalizeCitationNumber(ref.citation_number)
      const explicitReferenceUrl = getReferenceUrl(ref)
      const mappedUrl = citationNumber > 0 ? urlMap[citationNumber] || "" : ""
      const mappedByOrderUrl = orderedUrls[index] || ""
      const fallbackCitedTextUrl = getYouTubeUrlFromText(ref.cited_text)

      return {
        number: citationNumber,
        text: ref.cited_text ?? "",
        url: explicitReferenceUrl || mappedUrl || mappedByOrderUrl || fallbackCitedTextUrl,
      }
    })
    .filter((citation) => citation.number > 0 && citation.text && !citation.text.includes("---"))

  const linkifiedAnswer = cleanAnswer.replace(/\[([\d\s,\-]+)\]/g, (fullMatch, rangeText: string) => {
    const parts = rangeText.split(",").map((part) => part.trim())
    const numbers: number[] = []

    for (const part of parts) {
      if (part.includes("-")) {
        const [startText, endText] = part.split("-")
        const start = Number.parseInt(startText, 10)
        const end = Number.parseInt(endText, 10)

        if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end) {
          for (let current = start; current <= end; current += 1) {
            numbers.push(current)
          }
        }
      } else {
        const number = Number.parseInt(part, 10)
        if (!Number.isNaN(number)) {
          numbers.push(number)
        }
      }
    }

    if (numbers.length === 0) {
      return fullMatch
    }

    return numbers.map((number) => `[[${number}]](#citation-${number})`).join("")
  })

  return { cleanAnswer: linkifiedAnswer, citations }
}

function findCitationSectionStart(answer: string): number {
  const headingPatterns = [
    /^#{2,4}\s*Citations and Timestamped URLs\b/im,
    /^#{2,4}\s*Cited YouTube URLs\b/im,
    /^#{2,4}\s*Cited Source URLs\b/im,
    /^#{2,4}\s*Citations?\b/im,
  ]

  let bestIndex = -1

  for (const pattern of headingPatterns) {
    const match = pattern.exec(answer)

    if (!match || typeof match.index !== "number") {
      continue
    }

    if (bestIndex === -1 || match.index < bestIndex) {
      bestIndex = match.index
    }
  }

  return bestIndex
}

function extractCitationUrls(citationText: string): { byNumber: Record<number, string>; ordered: string[] } {
  const byNumber: Record<number, string> = {}
  const ordered: string[] = []

  for (const line of citationText.split(/\r?\n/)) {
    const url = getYouTubeUrlFromText(line)

    if (!url) {
      continue
    }

    ordered.push(url)
    const citationNumbers = getCitationNumbersFromLine(line)

    if (citationNumbers.length === 0) {
      continue
    }

    for (const citationNumber of citationNumbers) {
      byNumber[citationNumber] = url
    }
  }

  return { byNumber, ordered }
}

function getCitationNumbersFromLine(line: string): number[] {
  const numbers = new Set<number>()

  for (const match of line.matchAll(/\[(\d+)\]/g)) {
    const parsed = Number.parseInt(match[1], 10)

    if (!Number.isNaN(parsed) && parsed > 0) {
      numbers.add(parsed)
    }
  }

  if (numbers.size === 0) {
    const listNumber = line.match(/^\s*(\d+)\./)

    if (listNumber) {
      const parsed = Number.parseInt(listNumber[1], 10)

      if (!Number.isNaN(parsed) && parsed > 0) {
        numbers.add(parsed)
      }
    }
  }

  return Array.from(numbers)
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

function getReferenceUrl(ref: BackendReference): string {
  const candidates = [ref.url, ref.source_url, ref.timestamped_url, ref.link]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    const youtubeInfo = getYouTubeInfo(candidate)

    if (youtubeInfo) {
      return youtubeInfo.url
    }
  }

  return ""
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
