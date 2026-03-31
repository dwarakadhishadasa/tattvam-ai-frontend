import { afterEach, describe, expect, it, vi } from "vitest"

import { POST as startJobRoute } from "../../app/api/slides/jobs/route"
import { GET as getJobRoute } from "../../app/api/slides/jobs/[notebookId]/[taskId]/route"
import { GET as downloadJobRoute } from "../../app/api/slides/jobs/[notebookId]/[taskId]/download/route"

vi.mock("../../lib/slides/server", async () => {
  const actual = await vi.importActual<typeof import("../../lib/slides/server")>(
    "../../lib/slides/server",
  )

  return {
    ...actual,
    SlidesBackendUnavailableError: class SlidesBackendUnavailableError extends Error {},
    SlidesBackendResponseError: class SlidesBackendResponseError extends Error {
      status: number

      constructor(message: string, status: number) {
        super(message)
        this.status = status
      }
    },
    startSlideDeckJob: vi.fn(),
    getSlideDeckJob: vi.fn(),
    downloadSlideDeckJob: vi.fn(),
    readSlidesResponseBody: vi.fn(),
  }
})

import {
  downloadSlideDeckJob,
  getSlideDeckJob,
  readSlidesResponseBody,
  startSlideDeckJob,
} from "../../lib/slides/server"

describe("slide deck job routes", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("starts jobs through the same-origin route and returns the normalized job payload", async () => {
    vi.mocked(startSlideDeckJob).mockResolvedValueOnce({
      taskId: "task-123",
      state: "pending",
      error: null,
      errorCode: null,
      metadata: null,
    })

    const response = await startJobRoute(
      new Request("http://localhost/api/slides/jobs", {
        method: "POST",
        body: JSON.stringify({
          notebookId: " notebook-1 ",
          instructions: " visual style ",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(startSlideDeckJob).toHaveBeenCalledWith("notebook-1", "visual style")
    await expect(response.json()).resolves.toEqual({
      ok: true,
      job: {
        taskId: "task-123",
        state: "pending",
        error: null,
        errorCode: null,
        metadata: null,
      },
    })
  })

  it("rejects blank init parameters before any backend fetch", async () => {
    const response = await startJobRoute(
      new Request("http://localhost/api/slides/jobs", {
        method: "POST",
        body: JSON.stringify({
          notebookId: "  ",
          instructions: "visual style",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Notebook id and instructions are required",
    })
    expect(startSlideDeckJob).not.toHaveBeenCalled()
  })

  it("polls jobs through the normalized same-origin status route", async () => {
    vi.mocked(getSlideDeckJob).mockResolvedValueOnce({
      taskId: "task-123",
      state: "inProgress",
      error: null,
      errorCode: null,
      metadata: null,
    })

    const response = await getJobRoute(new Request("http://localhost") as never, {
      params: Promise.resolve({
        notebookId: " notebook-1 ",
        taskId: " task-123 ",
      }),
    })

    expect(response.status).toBe(200)
    expect(getSlideDeckJob).toHaveBeenCalledWith(" notebook-1 ", " task-123 ")
    await expect(response.json()).resolves.toEqual({
      ok: true,
      job: {
        taskId: "task-123",
        state: "inProgress",
        error: null,
        errorCode: null,
        metadata: null,
      },
    })
  })

  it("proxies pptx downloads with the expected content headers", async () => {
    vi.mocked(downloadSlideDeckJob).mockResolvedValueOnce(
      new Response("pptx-binary", {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        },
      }),
    )

    const response = await downloadJobRoute(new Request("http://localhost") as never, {
      params: Promise.resolve({
        notebookId: " notebook-1 ",
        taskId: " task-123 ",
      }),
    })

    expect(response.status).toBe(200)
    expect(downloadSlideDeckJob).toHaveBeenCalledWith(" notebook-1 ", " task-123 ")
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="task-123.pptx"',
    )
    await expect(response.text()).resolves.toBe("pptx-binary")
  })

  it("returns clear route-level download failures instead of leaking backend payloads", async () => {
    vi.mocked(downloadSlideDeckJob).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Artifact is not ready" }), { status: 409 }),
    )
    vi.mocked(readSlidesResponseBody).mockResolvedValueOnce({ error: "Artifact is not ready" })

    const response = await downloadJobRoute(new Request("http://localhost") as never, {
      params: Promise.resolve({
        notebookId: "notebook-1",
        taskId: "task-123",
      }),
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: "Artifact is not ready",
    })
  })
})
