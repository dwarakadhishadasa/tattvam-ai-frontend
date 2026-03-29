import { describe, expect, it, vi, afterEach } from "vitest"

import { POST } from "../../app/api/notebooks/route"

vi.mock("../../lib/notebooks/server", () => ({
  NotebookBackendUnavailableError: class NotebookBackendUnavailableError extends Error {},
  requestNotebookCreation: vi.fn(),
  requestNotebookTextSourceCreation: vi.fn(),
}))

import {
  requestNotebookCreation,
  requestNotebookTextSourceCreation,
} from "../../lib/notebooks/server"

describe("POST /api/notebooks", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("creates the notebook, seeds source text, and returns the normalized summary", async () => {
    vi.mocked(requestNotebookCreation).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          notebook: {
            id: "notebook-123",
            title: "Lecture Workspace",
            created_at: null,
            sources_count: 0,
            is_owner: true,
          },
        }),
        { status: 200 },
      ),
    )
    vi.mocked(requestNotebookTextSourceCreation).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    const response = await POST(
      new Request("http://localhost/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          title: " Lecture Workspace ",
          sourceText: " First paragraph ",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      notebook: {
        id: "notebook-123",
        title: "Lecture Workspace",
        createdAt: null,
        sourcesCount: 0,
        isOwner: true,
      },
    })
    expect(requestNotebookCreation).toHaveBeenCalledWith("Lecture Workspace")
    expect(requestNotebookTextSourceCreation).toHaveBeenCalledWith(
      "notebook-123",
      "Extraction Notes",
      "First paragraph",
    )
  })

  it("rejects blank compiled source text before notebook creation", async () => {
    const response = await POST(
      new Request("http://localhost/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          title: "Lecture Workspace",
          sourceText: "   ",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Notebook title and source text are required",
    })
    expect(requestNotebookCreation).not.toHaveBeenCalled()
    expect(requestNotebookTextSourceCreation).not.toHaveBeenCalled()
  })

  it("preserves notebook creation failures without attempting source upload", async () => {
    vi.mocked(requestNotebookCreation).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Notebook creation failed" }), { status: 502 }),
    )

    const response = await POST(
      new Request("http://localhost/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          title: "Lecture Workspace",
          sourceText: "Compiled extraction text",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: "Notebook creation failed",
    })
    expect(requestNotebookTextSourceCreation).not.toHaveBeenCalled()
  })

  it("treats source seeding failure as an overall handoff failure", async () => {
    vi.mocked(requestNotebookCreation).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          notebook: {
            id: "notebook-123",
            title: "Lecture Workspace",
            created_at: null,
            sources_count: 0,
            is_owner: true,
          },
        }),
        { status: 200 },
      ),
    )
    vi.mocked(requestNotebookTextSourceCreation).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Source upload failed" }), { status: 502 }),
    )

    const response = await POST(
      new Request("http://localhost/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          title: "Lecture Workspace",
          sourceText: "Compiled extraction text",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: "Source upload failed",
    })
    expect(requestNotebookTextSourceCreation).toHaveBeenCalledTimes(1)
  })

  it("returns a clear misconfiguration response before any backend fetch when endpoint resolution is invalid", async () => {
    vi.mocked(requestNotebookCreation).mockRejectedValueOnce(
      new Error("TATTVAM_NOTEBOOK_BACKEND_ORIGIN must be a valid absolute URL"),
    )

    const response = await POST(
      new Request("http://localhost/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          title: "Lecture Workspace",
          sourceText: "Compiled extraction text",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }) as never,
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: "TATTVAM_NOTEBOOK_BACKEND_ORIGIN must be a valid absolute URL",
    })
    expect(requestNotebookTextSourceCreation).not.toHaveBeenCalled()
  })
})
