---
title: 'Browser Persistence Split and Migration'
type: 'feature'
created: '2026-03-27'
status: 'ready-for-dev'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/browser-persistence.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The pipeline currently persists full session history, generated content, and visual cache directly from `PipelinePageClient.tsx` into `localStorage`. That couples storage logic to the page shell, risks quota and stale JSON failures, and has no versioned migration or recovery path for already-shipped browser data.

**Approach:** Ship the approved split contract: keep only bootstrap metadata in `localStorage`, move full sessions and visual settings into IndexedDB, and route restore, migration, autosave, and recovery through a dedicated persistence layer consumed by the pipeline UI.

## Boundaries & Constraints

**Always:** Keep raw storage access out of `components/pipeline/PipelinePageClient.tsx`; treat IndexedDB `sessions` as the source of truth; limit `localStorage` to `lecture_duration_cache`, `tattvam_active_session_id`, and `tattvam_session_index`; make migration idempotent; skip autosave until the session has meaningful activity; keep history and lecture duration when starting a new session; clear only visual-setting records when the user clears visual cache; keep the page usable with visible recovery messaging when persistence fails.

**Ask First:** Expanding the contract beyond the approved keys and stores; introducing a third-party persistence library; deleting legacy keys before a successful migration path exists.

**Never:** Keep full sessions or base64 slide payloads in `localStorage`; bury new persistence logic inside JSX effects; add server persistence or cross-device sync; silently drop corrupted or missing data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bootstrap restore | Bootstrap keys and matching IndexedDB records exist | Lecture duration, active session, history, and valid visual settings restore | Missing visual settings restore partially and explain why slide generation stays blocked |
| Legacy migration | Legacy `tattvam_sessions`, `slide_style_cache`, or `slide_image_cache` exists | Valid sessions and settings move into IndexedDB and the lightweight index becomes authoritative | Ignore malformed entries, keep usable data, and show upgrade or partial-recovery copy |
| Stale active pointer | Active session id points to a missing or invalid IndexedDB record | Stale metadata is pruned and the next valid session or a fresh draft loads | Show a visible recovery message instead of crashing |
| Meaningless draft | Current session only contains defaults and the welcome message | No session record is written | No-op without placeholder writes |
| IndexedDB unavailable | IndexedDB is blocked or a write fails | The current in-memory workflow stays usable | Fall back to degraded persistence mode with a clear warning |

</frozen-after-approval>

## Code Map

- `components/pipeline/PipelinePageClient.tsx` -- swap raw storage effects for hook-driven orchestration
- `components/pipeline/PipelineModals.tsx` -- render session history and recovery copy
- `components/SettingsModal.tsx` -- align clear-visual-cache behavior with persisted settings removal
- `components/pipeline/types.ts` -- host shared persistence types
- `hooks/useSessionPersistence.ts` -- own bootstrap, migration, restore, autosave, reset, and warnings
- `lib/persistence/schema.ts` -- define record shapes, validators, and legacy readers
- `lib/persistence/localSessionIndex.ts` -- own `localStorage` bootstrap metadata
- `lib/persistence/indexedDbStore.ts` -- own IndexedDB `sessions` and `settings`
- `tests/persistence/browser-persistence.test.ts` -- cover migration and restore edge cases if a lightweight harness is added

## Tasks & Acceptance

**Execution:**
- [ ] `components/pipeline/types.ts` -- add shared types for session index entries, persisted session records, visual settings, migration outcomes, and recovery notices -- gives the hook and adapters one contract
- [ ] `lib/persistence/schema.ts` -- define the persistence version, validators, and legacy readers for `tattvam_sessions`, `slide_style_cache`, and `slide_image_cache` -- centralizes defensive parsing
- [ ] `lib/persistence/localSessionIndex.ts` -- implement guarded helpers for lecture duration, active session id, lightweight index writes, and stale-entry pruning -- keeps bootstrap metadata tiny
- [ ] `lib/persistence/indexedDbStore.ts` -- implement database open/upgrade logic plus session/settings CRUD helpers that return typed results -- moves large payloads into structured browser storage
- [ ] `hooks/useSessionPersistence.ts` -- orchestrate restore, migration, meaningful-state autosave, active-session switching, new-session reset, clear-visual-cache persistence, and degraded-mode warnings -- extracts storage logic out of the page shell
- [ ] `components/pipeline/PipelinePageClient.tsx` -- hydrate state from the persistence hook, keep history driven by the lightweight index, and wire recovery notices -- satisfies the route-thinning requirement
- [ ] `components/pipeline/PipelineModals.tsx` and `components/SettingsModal.tsx` -- surface stale-session, missing-style, and clear-cache behaviors using the new persistence results -- makes degraded states explicit
- [ ] `tests/persistence/browser-persistence.test.ts` -- cover validator, migration, and stale-pointer edge cases if a lightweight harness is introduced in scope -- protects the brittle logic

**Acceptance Criteria:**
- Given legacy persistence keys exist, when the pipeline boots after this change, then valid legacy sessions and visual settings migrate into IndexedDB, the lightweight index is published, and unusable entries do not crash the page.
- Given a lightweight index entry points to a missing or invalid IndexedDB record, when restore runs, then stale metadata is pruned, the next valid session or a fresh draft loads, and the user sees a recovery notice.
- Given the active session still contains only default state plus the welcome message, when autosave runs, then no session record is persisted and history does not grow with empty drafts.
- Given a user starts a new session, when reset completes, then workflow state returns to a fresh draft while lecture duration, history, and saved visual settings remain available.
- Given a user clears visual cache, when the action completes, then style/image records are removed from IndexedDB, `lecture_duration_cache` and session history remain intact, and style-dependent presentation actions explain why they are blocked.
- Given IndexedDB is blocked or a persistence write fails, when restore or autosave runs, then the page remains interactive, degraded persistence is communicated visibly, and mount does not crash.

## Spec Change Log

## Design Notes

Restore and migration must finish before autosave becomes authoritative, or the new write path can mask legacy data. Treat bootstrap as a small state machine: read tiny `localStorage` metadata, open IndexedDB, migrate if needed, restore active state, then enable autosave.

## Verification

**Commands:**
- `npm run lint` -- expected: new persistence modules and UI wiring pass ESLint with no new errors
- `npm run build` -- expected: the app compiles successfully with the new client-side persistence boundary and no type errors

**Manual checks (if no CLI):**
- Seed legacy keys, reload, and confirm valid data migrates while bootstrap metadata switches to the approved keys
- Corrupt the active session pointer or remove a matching IndexedDB session, reload, and confirm stale metadata is pruned and a recovery message appears
- Start a fresh session with no meaningful activity, reload, and confirm no empty draft appears in history
- Save a real session, reload, and confirm history boots from the lightweight index while the full session body restores from IndexedDB
- Clear visual cache and confirm only style/image settings are removed while lecture duration and session history remain available
