export const ISKCON_BANGALORE_LECTURES_TARGET_KEY = "ISKCON Bangalore Lectures"

export function isLectureExtractionTargetKey(targetKey: string | null | undefined): boolean {
  return targetKey === ISKCON_BANGALORE_LECTURES_TARGET_KEY
}
