import { describe, expect, it } from "vitest"

import {
  normalizeBackendArtifactPayload,
  normalizeSlideDeckJobRequest,
} from "../../lib/slides/shared"

describe("slide deck shared helpers", () => {
  it("normalizes trimmed route requests", () => {
    expect(
      normalizeSlideDeckJobRequest({
        notebookId: " notebook-1 ",
        instructions: " visual style ",
      }),
    ).toEqual({
      notebookId: "notebook-1",
      instructions: "visual style",
    })
  })

  it("rejects blank notebook ids or instructions", () => {
    expect(
      normalizeSlideDeckJobRequest({
        notebookId: "   ",
        instructions: "visual style",
      }),
    ).toBeNull()

    expect(
      normalizeSlideDeckJobRequest({
        notebookId: "notebook-1",
        instructions: "   ",
      }),
    ).toBeNull()
  })

  it("maps backend task payloads into the presentation job contract", () => {
    expect(
      normalizeBackendArtifactPayload({
        ok: true,
        status: {
          task_id: " task-123 ",
          status: "in_progress",
          error: null,
          error_code: null,
          metadata: { slideCount: 12 },
        },
      }),
    ).toEqual({
      taskId: "task-123",
      state: "inProgress",
      error: null,
      errorCode: null,
      metadata: { slideCount: 12 },
    })
  })

  it("treats explicit backend errors as failed jobs", () => {
    expect(
      normalizeBackendArtifactPayload({
        ok: true,
        status: {
          task_id: "task-123",
          status: "in_progress",
          error: "Generation failed",
          error_code: "artifact_failed",
          metadata: null,
        },
      }),
    ).toEqual({
      taskId: "task-123",
      state: "failed",
      error: "Generation failed",
      errorCode: "artifact_failed",
      metadata: null,
    })
  })

  it("rejects malformed success payloads instead of leaking partial data", () => {
    expect(
      normalizeBackendArtifactPayload({
        ok: true,
        status: {
          task_id: "",
          status: "pending",
          error: null,
          error_code: null,
          metadata: null,
        },
      }),
    ).toBeNull()

    expect(
      normalizeBackendArtifactPayload({
        ok: true,
        status: {
          task_id: "task-123",
          status: "unknown",
          error: null,
          error_code: null,
          metadata: null,
        },
      }),
    ).toBeNull()
  })
})
