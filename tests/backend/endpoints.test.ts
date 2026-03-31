import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_NOTEBOOK_BACKEND_ORIGIN,
  NotebookBackendConfigurationError,
  getDefaultExtractionChatNotebookId,
  getDefaultExtractionChatUrl,
  getNotebookArtifactDownloadUrl,
  getNotebookArtifactGenerateUrl,
  getNotebookArtifactTaskUrl,
  getNotebookBackendOrigin,
  getNotebookChatUrl,
  getNotebookSetSourceUrl,
  getNotebooksUrl,
} from "../../lib/backend/endpoints"

describe("backend endpoint builders", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses a client-usable loopback host for the default backend origin", () => {
    vi.stubEnv("TATTVAM_NOTEBOOK_BACKEND_ORIGIN", "")

    expect(getNotebookBackendOrigin()).toBe(DEFAULT_NOTEBOOK_BACKEND_ORIGIN)
    expect(getNotebooksUrl()).toBe("http://127.0.0.1:8000/v1/notebooks")
  })

  it("normalizes 0.0.0.0 to 127.0.0.1 before building notebook URLs", () => {
    vi.stubEnv("TATTVAM_NOTEBOOK_BACKEND_ORIGIN", " http://0.0.0.0:8000/base/ ")

    expect(getNotebookBackendOrigin()).toBe("http://127.0.0.1:8000/base")
    expect(getNotebooksUrl()).toBe("http://127.0.0.1:8000/base/v1/notebooks")
    expect(getNotebookSetSourceUrl(" notebook 123 ")).toBe(
      "http://127.0.0.1:8000/base/v1/notebooks/notebook%20123/sources/text",
    )
  })

  it("resolves the default extraction chat URL from origin plus configured notebook id", () => {
    vi.stubEnv("TATTVAM_NOTEBOOK_BACKEND_ORIGIN", "http://backend.internal:9000")
    vi.stubEnv("TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID", " extraction-chat ")

    expect(getDefaultExtractionChatNotebookId()).toBe("extraction-chat")
    expect(getDefaultExtractionChatUrl()).toBe(
      "http://backend.internal:9000/v1/notebooks/extraction-chat/chat/ask",
    )
    expect(getNotebookChatUrl(" notebook target ")).toBe(
      "http://backend.internal:9000/v1/notebooks/notebook%20target/chat/ask",
    )
    expect(getNotebookArtifactGenerateUrl(" notebook target ")).toBe(
      "http://backend.internal:9000/v1/notebooks/notebook%20target/artifacts/generate",
    )
    expect(getNotebookArtifactTaskUrl(" notebook target ", " task-123 ")).toBe(
      "http://backend.internal:9000/v1/notebooks/notebook%20target/artifacts/tasks/task-123?wait=false",
    )
    expect(getNotebookArtifactDownloadUrl(" notebook target ", " task-123 ")).toBe(
      "http://backend.internal:9000/v1/notebooks/notebook%20target/artifacts/download?type=slide_deck&artifact_id=task-123&output_format=pptx",
    )
  })

  it("rejects malformed backend origins before any fetch can occur", () => {
    vi.stubEnv("TATTVAM_NOTEBOOK_BACKEND_ORIGIN", "not a url")

    expect(() => getNotebooksUrl()).toThrowError(NotebookBackendConfigurationError)
    expect(() => getNotebooksUrl()).toThrowError(
      "TATTVAM_NOTEBOOK_BACKEND_ORIGIN must be a valid absolute URL",
    )
  })

  it("rejects blank per-call notebook ids after trimming", () => {
    expect(() => getNotebookSetSourceUrl("   ")).toThrowError(NotebookBackendConfigurationError)
    expect(() => getNotebookSetSourceUrl("   ")).toThrowError("Notebook id is required")
    expect(() => getNotebookChatUrl("   ")).toThrowError("Notebook id is required")
    expect(() => getNotebookArtifactGenerateUrl("   ")).toThrowError("Notebook id is required")
  })

  it("rejects blank per-call task ids after trimming", () => {
    expect(() => getNotebookArtifactTaskUrl("notebook-1", "   ")).toThrowError(
      NotebookBackendConfigurationError,
    )
    expect(() => getNotebookArtifactDownloadUrl("notebook-1", "   ")).toThrowError(
      "Task id is required",
    )
  })

  it("rejects missing extraction chat notebook ids after trimming", () => {
    vi.stubEnv("TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID", "   ")

    expect(() => getDefaultExtractionChatNotebookId()).toThrowError(
      NotebookBackendConfigurationError,
    )
    expect(() => getDefaultExtractionChatUrl()).toThrowError(
      "TATTVAM_EXTRACTION_CHAT_NOTEBOOK_ID is required",
    )
  })
})
