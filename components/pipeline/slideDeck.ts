import type { SessionState } from "@/components/pipeline/types"
import type { SlideDeckJob } from "@/lib/slides/shared"

export const SLIDE_DECK_POLL_INTERVAL_MS = 60_000

export type SlideDeckSessionFields = Pick<
  SessionState,
  | "slideDeckTaskId"
  | "slideDeckState"
  | "slideDeckError"
  | "slideDeckErrorCode"
  | "slideDeckRequestedAt"
  | "slideDeckLastCheckedAt"
  | "slideDeckCompletedAt"
>

export function createEmptySlideDeckState(): SlideDeckSessionFields {
  return {
    slideDeckTaskId: null,
    slideDeckState: "idle",
    slideDeckError: null,
    slideDeckErrorCode: null,
    slideDeckRequestedAt: null,
    slideDeckLastCheckedAt: null,
    slideDeckCompletedAt: null,
  }
}

export function mergeSlideDeckJobIntoSessionState(
  currentState: SlideDeckSessionFields,
  job: SlideDeckJob,
  checkedAt: number,
): SlideDeckSessionFields {
  const requestedAt = currentState.slideDeckRequestedAt ?? checkedAt

  return {
    slideDeckTaskId: job.taskId,
    slideDeckState: job.state,
    slideDeckError: job.error,
    slideDeckErrorCode: job.errorCode,
    slideDeckRequestedAt: requestedAt,
    slideDeckLastCheckedAt: checkedAt,
    slideDeckCompletedAt:
      job.state === "completed"
        ? currentState.slideDeckCompletedAt ?? checkedAt
        : null,
  }
}

export function createFailedSlideDeckState(
  message: string,
  errorCode: string | null,
  requestedAt: number | null,
  checkedAt: number,
  taskId: string | null,
): SlideDeckSessionFields {
  return {
    slideDeckTaskId: taskId,
    slideDeckState: "failed",
    slideDeckError: message,
    slideDeckErrorCode: errorCode,
    slideDeckRequestedAt: requestedAt,
    slideDeckLastCheckedAt: checkedAt,
    slideDeckCompletedAt: null,
  }
}

export function isSlideDeckJobActive(state: SlideDeckSessionFields["slideDeckState"]): boolean {
  return state === "pending" || state === "inProgress"
}

export function getNextSlideDeckPollAt(
  requestedAt: number | null,
  lastCheckedAt: number | null,
): number | null {
  const anchor = lastCheckedAt ?? requestedAt

  return anchor === null ? null : anchor + SLIDE_DECK_POLL_INTERVAL_MS
}
