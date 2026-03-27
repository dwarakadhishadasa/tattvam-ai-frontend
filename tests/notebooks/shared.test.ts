import { describe, expect, it } from "vitest"

import {
  getNotebookBackendErrorMessage,
  normalizeCreateNotebookResponse,
} from "../../lib/notebooks/shared"

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
})
