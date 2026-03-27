import { describe, expect, it } from "vitest"

import {
  appendNotebookEntry,
  buildNotebookCompileSource,
  getNotebookReadiness,
} from "../../components/pipeline/utils"

describe("notebook helpers", () => {
  it("deduplicates initial saves by immutable source content", () => {
    const savedEntries = appendNotebookEntry([], {
      sourceMessageId: "assistant-1",
      sourceType: "response",
      sourceContent: "Immutable source",
    })

    const dedupedEntries = appendNotebookEntry(savedEntries, {
      sourceMessageId: "assistant-2",
      sourceType: "response",
      sourceContent: "Immutable source",
    })

    expect(dedupedEntries).toHaveLength(1)
    expect(dedupedEntries[0]?.sourceMessageId).toBe("assistant-1")
  })

  it("builds compile content from the edited working copy", () => {
    const compileSource = buildNotebookCompileSource([
      {
        id: "entry-1",
        sourceMessageId: "assistant-1",
        sourceType: "response",
        sourceContent: "Original response",
        content: "Trimmed response",
        isEdited: true,
        updatedAt: 100,
      },
    ])

    expect(compileSource).toBe("Trimmed response")
  })

  it("treats readiness as advisory while content is still short", () => {
    const readiness = getNotebookReadiness(
      [
        {
          id: "entry-1",
          sourceMessageId: null,
          sourceType: "context",
          sourceContent: "short note",
          content: "short note",
          isEdited: false,
          updatedAt: 100,
        },
      ],
      15,
    )

    expect(readiness).toBe("insufficient")
  })
})
