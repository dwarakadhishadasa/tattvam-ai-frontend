import { describe, expect, it } from "vitest"

import {
  DEFAULT_NOTEBOOK_SOURCE_TITLE,
  getNotebookBackendErrorMessage,
  normalizeCreateAndSeedNotebookRequest,
  normalizeCreateNotebookResponse,
} from "../../lib/notebooks/shared"

describe("create and seed notebook request normalization", () => {
  it("trims title and source text while defaulting the source title", () => {
    expect(
      normalizeCreateAndSeedNotebookRequest({
        title: " Lecture Workspace ",
        sourceText: " Seeded text ",
      }),
    ).toEqual({
      title: "Lecture Workspace",
      sourceText: "Seeded text",
      sourceTitle: DEFAULT_NOTEBOOK_SOURCE_TITLE,
    })
  })

  it("rejects blank title or blank source text", () => {
    expect(
      normalizeCreateAndSeedNotebookRequest({
        title: "Lecture Workspace",
        sourceText: "   ",
      }),
    ).toBeNull()

    expect(
      normalizeCreateAndSeedNotebookRequest({
        title: "   ",
        sourceText: "Seeded text",
      }),
    ).toBeNull()
  })
})

describe("create notebook response normalization", () => {
  it("maps the backend success payload into the app contract", () => {
    const normalizedResponse = normalizeCreateNotebookResponse({
      ok: true,
      notebook: {
        id: "87e2c32e-6ca4-4ed7-8268-4905b50469c0",
        title: "Teeessst",
        created_at: null,
        sources_count: 0,
        is_owner: true,
      },
    })

    expect(normalizedResponse).toEqual({
      ok: true,
      notebook: {
        id: "87e2c32e-6ca4-4ed7-8268-4905b50469c0",
        title: "Teeessst",
        createdAt: null,
        sourcesCount: 0,
        isOwner: true,
      },
    })
  })

  it("defaults optional metadata when the backend omits it", () => {
    const normalizedResponse = normalizeCreateNotebookResponse({
      ok: true,
      notebook: {
        id: "notebook-1",
        title: "Lecture Workspace",
      },
    })

    expect(normalizedResponse).toEqual({
      ok: true,
      notebook: {
        id: "notebook-1",
        title: "Lecture Workspace",
        createdAt: null,
        sourcesCount: 0,
        isOwner: false,
      },
    })
  })

  it("rejects malformed success payloads", () => {
    expect(
      normalizeCreateNotebookResponse({
        ok: true,
        notebook: {
          title: "Missing ID",
        },
      }),
    ).toBeNull()
  })
})

describe("create notebook error handling", () => {
  it("prefers explicit backend error messages", () => {
    expect(getNotebookBackendErrorMessage({ error: "Notebook creation failed" })).toBe(
      "Notebook creation failed",
    )
  })

  it("falls back to detail or the provided default message", () => {
    expect(getNotebookBackendErrorMessage({ detail: "Source upload failed" })).toBe(
      "Source upload failed",
    )
    expect(getNotebookBackendErrorMessage({}, "Fallback message")).toBe("Fallback message")
  })
})
