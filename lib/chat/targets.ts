export type ExtractionChatTarget = {
  key: string
  label: string
  notebookId: string
}

type ApprovedExtractionChatTarget = Pick<ExtractionChatTarget, "key" | "label">

const APPROVED_EXTRACTION_CHAT_TARGETS: ApprovedExtractionChatTarget[] = [
  {
    key: "ISKCON Bangalore Lectures",
    label: "From Senior devotees lectures",
  },
  {
    key: "Bhaktivedanta NotebookLM",
    label: "From Srila Prabhupad's books",
  },
  {
    key: "Srila Prabhupada Letters & Correspondence",
    label: "From Srila Prabhupad's letters and correspondence",
  },
  {
    key: "Srila Prabhupada Audio Transcripts",
    label: "From Srila Prabhupad's audio transcripts",
  },
]

export class ExtractionChatTargetsConfigurationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ExtractionChatTargetsConfigurationError"

    if (options && "cause" in options) {
      this.cause = options.cause
    }
  }
}

export function isExtractionChatTargetsConfigurationError(
  error: unknown,
): error is ExtractionChatTargetsConfigurationError {
  return (
    error instanceof ExtractionChatTargetsConfigurationError ||
    (error instanceof Error && error.name === "ExtractionChatTargetsConfigurationError")
  )
}

export function getExtractionChatTargets(
  rawTargetsJson = process.env.TATTVAM_EXTRACTION_CHAT_TARGETS_JSON,
): ExtractionChatTarget[] {
  const trimmedJson = rawTargetsJson?.trim() || ""

  if (!trimmedJson) {
    throw new ExtractionChatTargetsConfigurationError(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON is required",
    )
  }

  let parsedTargets: unknown

  try {
    parsedTargets = JSON.parse(trimmedJson)
  } catch (error) {
    throw new ExtractionChatTargetsConfigurationError(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON must be valid JSON",
      { cause: error },
    )
  }

  if (!Array.isArray(parsedTargets) || parsedTargets.length !== APPROVED_EXTRACTION_CHAT_TARGETS.length) {
    throw new ExtractionChatTargetsConfigurationError(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON must contain exactly four approved targets",
    )
  }

  const approvedByKey = new Map(
    APPROVED_EXTRACTION_CHAT_TARGETS.map((target) => [target.key, target]),
  )
  const seenKeys = new Set<string>()

  const normalizedTargets = parsedTargets.map<ExtractionChatTarget>((candidate) => {
    if (!isRecord(candidate)) {
      throw new ExtractionChatTargetsConfigurationError(
        "Each extraction chat target must be an object with key, label, and notebookId",
      )
    }

    const key = normalizeRequiredString(candidate.key, "Target key is required")
    const label = normalizeRequiredString(candidate.label, `Target label is required for ${key}`)
    const notebookId = normalizeRequiredString(
      candidate.notebookId,
      `Notebook id is required for ${key}`,
    )

    const approvedTarget = approvedByKey.get(key)

    if (!approvedTarget || !labelsMatchApprovedRegistry(label, approvedTarget.label)) {
      throw new ExtractionChatTargetsConfigurationError(
        `Target ${key} does not match the approved extraction target registry`,
      )
    }

    if (seenKeys.has(key)) {
      throw new ExtractionChatTargetsConfigurationError(
        "Extraction chat target keys must be unique",
      )
    }

    seenKeys.add(key)

    return {
      key: approvedTarget.key,
      label: approvedTarget.label,
      notebookId,
    }
  })

  if (seenKeys.size !== APPROVED_EXTRACTION_CHAT_TARGETS.length) {
    throw new ExtractionChatTargetsConfigurationError(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON must contain the approved four extraction targets",
    )
  }

  return normalizedTargets
}

function normalizeRequiredString(value: unknown, message: string): string {
  const normalized = typeof value === "string" ? value.trim() : ""

  if (!normalized) {
    throw new ExtractionChatTargetsConfigurationError(message)
  }

  return normalized
}

function labelsMatchApprovedRegistry(candidateLabel: string, approvedLabel: string): boolean {
  return normalizeRegistryLabel(candidateLabel) === normalizeRegistryLabel(approvedLabel)
}

function normalizeRegistryLabel(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
