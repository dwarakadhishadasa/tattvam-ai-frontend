import { afterEach, describe, expect, it, vi } from "vitest"

import {
  SLIDES_BACKEND_UNAVAILABLE_MESSAGE,
  SlidesBackendUnavailableError,
  getSlideDeckJob,
  startSlideDeckJob,
} from "../../lib/slides/server"
import * as backendEndpoints from "../../lib/backend/endpoints"

describe("slides server helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("starts artifact jobs through the shared endpoint builder", async () => {
    const endpointSpy = vi
      .spyOn(backendEndpoints, "getNotebookArtifactGenerateUrl")
      .mockReturnValue("http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/generate")
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          status: {
            task_id: "task-123",
            status: "pending",
            error: null,
            error_code: null,
            metadata: null,
          },
        }),
        { status: 200 },
      ),
    )

    await expect(startSlideDeckJob(" notebook-1 ", "visual style")).resolves.toEqual({
      taskId: "task-123",
      state: "pending",
      error: null,
      errorCode: null,
      metadata: null,
    })

    expect(endpointSpy).toHaveBeenCalledWith(" notebook-1 ")
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "slide_deck",
          options: {
            instructions: "visual style",
          },
        }),
        cache: "no-store",
      },
    )
  })

  it("polls artifact status through the shared task endpoint", async () => {
    const endpointSpy = vi
      .spyOn(backendEndpoints, "getNotebookArtifactTaskUrl")
      .mockReturnValue(
        "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/tasks/task-123?wait=false",
      )
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          status: {
            task_id: "task-123",
            status: "completed",
            error: null,
            error_code: null,
            metadata: { pages: 10 },
          },
        }),
        { status: 200 },
      ),
    )

    await expect(getSlideDeckJob(" notebook-1 ", " task-123 ")).resolves.toEqual({
      taskId: "task-123",
      state: "completed",
      error: null,
      errorCode: null,
      metadata: { pages: 10 },
    })

    expect(endpointSpy).toHaveBeenCalledWith(" notebook-1 ", " task-123 ")
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/tasks/task-123?wait=false",
      {
        cache: "no-store",
      },
    )
  })

  it("classifies upstream fetch failures separately from configuration errors", async () => {
    vi.spyOn(backendEndpoints, "getNotebookArtifactGenerateUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/generate",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    await expect(startSlideDeckJob("notebook-1", "visual style")).rejects.toMatchObject({
      message: SLIDES_BACKEND_UNAVAILABLE_MESSAGE,
      name: "SlidesBackendUnavailableError",
    })
  })

  it("includes the notebook backend API key header when configured", async () => {
    vi.stubEnv("TATTVAM_NOTEBOOK_BACKEND_API_KEY", "secret-key")
    vi.spyOn(backendEndpoints, "getNotebookArtifactGenerateUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/generate",
    )
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          status: {
            task_id: "task-123",
            status: "pending",
            error: null,
            error_code: null,
            metadata: null,
          },
        }),
        { status: 200 },
      ),
    )

    await startSlideDeckJob("notebook-1", "visual style")

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "secret-key",
        },
        body: JSON.stringify({
          type: "slide_deck",
          options: {
            instructions: "visual style",
          },
        }),
        cache: "no-store",
      },
    )
  })

  it("exposes the transport error type to the route layer", async () => {
    vi.spyOn(backendEndpoints, "getNotebookArtifactGenerateUrl").mockReturnValue(
      "http://127.0.0.1:8000/v1/notebooks/notebook-1/artifacts/generate",
    )
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("fetch failed"))

    try {
      await startSlideDeckJob("notebook-1", "visual style")
    } catch (error) {
      expect(error).toBeInstanceOf(SlidesBackendUnavailableError)
    }
  })
})
