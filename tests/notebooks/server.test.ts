import { afterEach, describe, expect, it, vi } from "vitest"

import {
  NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE,
  NotebookBackendUnavailableError,
  getNotebookApiUrl,
  normalizeNotebookApiUrl,
  requestNotebookCreation,
} from "../../lib/notebooks/server"

describe("notebook server URL resolution", () => {
  it("uses a client-usable loopback host for the default notebook endpoint", () => {
    expect(getNotebookApiUrl("")).toBe("http://127.0.0.1:8000/v1/notebooks")
  })

  it("normalizes explicit 0.0.0.0 notebook endpoints to 127.0.0.1", () => {
    expect(normalizeNotebookApiUrl("http://0.0.0.0:8000/v1/notebooks")).toBe(
      "http://127.0.0.1:8000/v1/notebooks",
    )
  })

  it("preserves non-loopback notebook endpoints", () => {
    expect(normalizeNotebookApiUrl("https://example.com/v1/notebooks")).toBe(
      "https://example.com/v1/notebooks",
    )
  })
})

describe("notebook server transport failures", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("wraps upstream fetch failures in a notebook-backend-unavailable error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(requestNotebookCreation("Lecture Workspace")).rejects.toMatchObject({
      message: NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE,
      name: "NotebookBackendUnavailableError",
    })
  })

  it("exposes the classified error type for the route layer", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    try {
      await requestNotebookCreation("Lecture Workspace")
    } catch (error) {
      expect(error).toBeInstanceOf(NotebookBackendUnavailableError)
    }
  })
})
