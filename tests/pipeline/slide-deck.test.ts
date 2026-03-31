import { describe, expect, it } from "vitest"

import {
  createEmptySlideDeckState,
  createFailedSlideDeckState,
  getNextSlideDeckPollAt,
  isSlideDeckJobActive,
  mergeSlideDeckJobIntoSessionState,
  SLIDE_DECK_POLL_INTERVAL_MS,
} from "../../components/pipeline/slideDeck"

describe("slide deck state helpers", () => {
  it("creates the idle pptx job state shape", () => {
    expect(createEmptySlideDeckState()).toEqual({
      slideDeckTaskId: null,
      slideDeckState: "idle",
      slideDeckError: null,
      slideDeckErrorCode: null,
      slideDeckRequestedAt: null,
      slideDeckLastCheckedAt: null,
      slideDeckCompletedAt: null,
    })
  })

  it("merges active job updates while preserving the original requested timestamp", () => {
    expect(
      mergeSlideDeckJobIntoSessionState(
        {
          ...createEmptySlideDeckState(),
          slideDeckRequestedAt: 100,
        },
        {
          taskId: "task-123",
          state: "inProgress",
          error: null,
          errorCode: null,
          metadata: null,
        },
        160,
      ),
    ).toEqual({
      slideDeckTaskId: "task-123",
      slideDeckState: "inProgress",
      slideDeckError: null,
      slideDeckErrorCode: null,
      slideDeckRequestedAt: 100,
      slideDeckLastCheckedAt: 160,
      slideDeckCompletedAt: null,
    })
  })

  it("stamps completion the first time a job becomes ready", () => {
    expect(
      mergeSlideDeckJobIntoSessionState(createEmptySlideDeckState(), {
        taskId: "task-123",
        state: "completed",
        error: null,
        errorCode: null,
        metadata: null,
      }, 250),
    ).toEqual({
      slideDeckTaskId: "task-123",
      slideDeckState: "completed",
      slideDeckError: null,
      slideDeckErrorCode: null,
      slideDeckRequestedAt: 250,
      slideDeckLastCheckedAt: 250,
      slideDeckCompletedAt: 250,
    })
  })

  it("creates retryable failed state snapshots", () => {
    expect(createFailedSlideDeckState("Backend failed", "artifact_failed", 100, 160, "task-123"))
      .toEqual({
        slideDeckTaskId: "task-123",
        slideDeckState: "failed",
        slideDeckError: "Backend failed",
        slideDeckErrorCode: "artifact_failed",
        slideDeckRequestedAt: 100,
        slideDeckLastCheckedAt: 160,
        slideDeckCompletedAt: null,
      })
  })

  it("tracks which states keep polling alive", () => {
    expect(isSlideDeckJobActive("pending")).toBe(true)
    expect(isSlideDeckJobActive("inProgress")).toBe(true)
    expect(isSlideDeckJobActive("completed")).toBe(false)
  })

  it("computes the next poll time from the freshest known check", () => {
    expect(getNextSlideDeckPollAt(100, null)).toBe(100 + SLIDE_DECK_POLL_INTERVAL_MS)
    expect(getNextSlideDeckPollAt(100, 160)).toBe(160 + SLIDE_DECK_POLL_INTERVAL_MS)
    expect(getNextSlideDeckPollAt(null, null)).toBeNull()
  })
})
