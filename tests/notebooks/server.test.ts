import { afterEach, describe, expect, it, vi } from "vitest"

import {
  NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE,
  NotebookBackendUnavailableError,
  requestNotebookCreation,
  requestNotebookTextSourceCreation,
} from "../../lib/notebooks/server"
import * as backendEndpoints from "../../lib/backend/endpoints"

describe("notebook server transport failures", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves notebook creation through the shared collection builder", async () => {
    const notebooksUrlSpy = vi
      .spyOn(backendEndpoints, "getNotebooksUrl")
      .mockReturnValue("http://127.0.0.1:8000/v1/notebooks")
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await requestNotebookCreation("Lecture Workspace")

    expect(notebooksUrlSpy).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/v1/notebooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Lecture Workspace" }),
      cache: "no-store",
    })
  })

  it("posts notebook text sources to the backend text-source endpoint", async () => {
    vi.spyOn(backendEndpoints, "getNotebookSetSourceUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/notebook%20123/sources/text",
    )
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await requestNotebookTextSourceCreation("notebook 123", "Extraction Notes", "Seeded text")

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/notebooks/notebook%20123/sources/text",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Extraction Notes",
          content: "Seeded text",
        }),
        cache: "no-store",
      },
    )
  })

  it("wraps upstream fetch failures in a notebook-backend-unavailable error", async () => {
    vi.spyOn(backendEndpoints, "getNotebooksUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(requestNotebookCreation("Lecture Workspace")).rejects.toMatchObject({
      message: NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE,
      name: "NotebookBackendUnavailableError",
    })
  })

  it("wraps text-source upload failures in a notebook-backend-unavailable error", async () => {
    vi.spyOn(backendEndpoints, "getNotebookSetSourceUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/notebook-123/sources/text",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(
      requestNotebookTextSourceCreation("notebook-123", "Extraction Notes", "Seeded text"),
    ).rejects.toMatchObject({
      message: NOTEBOOK_BACKEND_UNAVAILABLE_MESSAGE,
      name: "NotebookBackendUnavailableError",
    })
  })

  it("exposes the classified error type for the route layer", async () => {
    vi.spyOn(backendEndpoints, "getNotebooksUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    try {
      await requestNotebookCreation("Lecture Workspace")
    } catch (error) {
      expect(error).toBeInstanceOf(NotebookBackendUnavailableError)
    }
  })
})
