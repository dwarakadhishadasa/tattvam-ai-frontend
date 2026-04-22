---
stepsCompleted:
  - 1
  - 2
inputDocuments:
  - _bmad-output/planning-artifacts/spec.md
  - _bmad-output/planning-artifacts/requirements.md
  - _bmad-output/planning-artifacts/plan.md
  - _bmad-output/planning-artifacts/research.md
  - _bmad-output/planning-artifacts/data-model.md
  - _bmad-output/planning-artifacts/runtime-interfaces.md
  - _bmad-output/planning-artifacts/browser-persistence.md
  - _bmad-output/project-context.md
  - docs/codebase-research.md
  - docs/frontend-engineering-principles.md
workflowType: 'architecture'
project_name: 'tattvam-ai-frontend'
user_name: 'Dwaraka'
date: '2026-03-27'
lastStep: 3
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The product remains a guided lecture workflow spanning context setup, extraction,
synthesis, and presentation. Browser-local session history and visual settings are
not incidental implementation details; they materially affect the experience by
driving restore behavior, history browsing, and presentation setup. The workflow
therefore requires a persistence design that can safely carry chat transcripts,
saved snippets, generated slides, lecture settings, and optional visual reference
data without turning storage failure into application failure.

The implementation also depends on a real history-and-resume path. That means the
architecture must support two different data shapes:

- tiny bootstrapping metadata needed early in startup
- full session and visual payloads needed after the UI knows which session to load

**Non-Functional Requirements:**
Reliability, graceful degradation, and module boundaries are the primary drivers.
The project context requires route thinning, separation of rendering from domain
logic, and deliberate client boundaries. Browser persistence must therefore move
behind named hooks and helpers rather than remain embedded in the route-level
feature shell.

The relevant quality attributes are:

- restore safety when stored payloads are stale, partial, or malformed
- bounded storage growth so autosave remains reliable over time
- graceful degradation when quota or parsing failures occur
- fast startup for the recent-history UI without loading large payloads first
- explicit verification of persistence, migration, and session restore behavior

**Scale & Complexity:**
This is a medium-complexity frontend architecture problem. The product is still a
single application, but its persistence needs are large enough that browser
storage must be treated as a subsystem rather than a convenience utility.

- Primary domain: client-heavy web application
- Complexity level: medium
- Estimated persistence-oriented architectural components: 5 to 7

### Technical Constraints & Dependencies

The repository is a Next.js App Router application running React 19 and strict
TypeScript, with the main user journey currently coordinated in
`components/pipeline/PipelinePageClient.tsx`. The app relies on browser APIs such
as `localStorage`, fullscreen mode, `FileReader`, and client-side markdown
rendering. There is no server database or remote persistence layer in this
repository.

These constraints make browser persistence the right place to solve the current
reliability problem, but they also mean the chosen storage mechanism must respect
browser quotas, asynchronous reads, and migration from already-shipped
`localStorage` data.

### Cross-Cutting Concerns Identified

The persistence redesign crosses several parts of the product:

- session history bootstrapping
- autosave behavior
- visual settings recovery
- history rendering and recent-session UX
- stale or corrupt data handling
- route-file and component boundary cleanup

Because these concerns affect restore, save, error handling, and UI startup, they
should be implemented as a shared persistence layer consumed by the pipeline
client, not as ad hoc storage calls in UI components.

## Architecture Decision: Browser Persistence Split

### Decision

Adopt a two-tier browser persistence model:

- `localStorage` contains only `lecture_duration_cache`, the active session id, and
  a lightweight session index containing only `id`, `title`, and `updatedAt`.
- IndexedDB contains all full session bodies and visual payloads, including
  messages, saved snippets, normalized extracted context, generated slides,
  extracted style, and the optional reference slide.

### Why This Decision

This decision directly addresses the identified failure modes without introducing a
backend persistence system the product does not yet need.

- It keeps startup fast because recent-session metadata is tiny and synchronously
  available.
- It removes the largest payloads from `localStorage`, which is where quota and
  malformed-JSON failures currently break autosave and mount.
- It preserves the current single-device session-history UX without expanding the
  architecture into user accounts, server sync, or conflict resolution.
- It aligns with project rules by pushing persistence concerns into hooks and
  `lib/` helpers instead of route-level UI code.

### Approved `localStorage` Contract

| Key | Shape | Purpose |
|-----|-------|---------|
| `lecture_duration_cache` | stringified number | Restore lecture duration quickly |
| `tattvam_active_session_id` | string | Identify the session to reopen on boot |
| `tattvam_session_index` | `SessionIndexEntry[]` JSON | Provide lightweight history metadata without storing full session bodies |

`SessionIndexEntry` is defined as:

```ts
type SessionIndexEntry = {
  id: string
  title: string
  updatedAt: number
}
```

`localStorage` is advisory bootstrap metadata only. The source of truth for a full
session is the IndexedDB `sessions` store.

### Approved IndexedDB Contract

Database name: `tattvam-pipeline`

Object stores:

- `sessions`
  - key: `id`
  - value: full versioned session record
- `settings`
  - key: string
  - value: visual-setting record such as extracted style or reference slide data

The following data belongs in IndexedDB rather than `localStorage`:

- `messages`
- `savedSnippets`
- `extractedVerseData`
- `generatedSlides`
- `slide_style_cache` successor value
- `slide_image_cache` successor value
- any future per-session payload larger than lightweight metadata

### Save and Restore Flow

On save:

1. Write the full session record to IndexedDB.
2. Update `tattvam_session_index` in `localStorage` using only `id`, `title`, and
   `updatedAt`.
3. Update `tattvam_active_session_id` in `localStorage`.
4. Persist lecture duration to `lecture_duration_cache`.

On restore:

1. Read `lecture_duration_cache`, `tattvam_active_session_id`, and
   `tattvam_session_index` from `localStorage`.
2. Use the active session id to load the full session body from IndexedDB.
3. Load visual settings from IndexedDB.
4. If the active session is missing, stale, or invalid, prune stale metadata, try
   the most recent remaining valid session, and only then fall back to a fresh
   in-memory session without crashing.
5. Surface recovery state to the user instead of silently starting over.

### User-Facing Recovery Rules

The persistence layer must not fail silently. The implementation should show clear
user-facing recovery signals for:

- stale or missing active session pointers
- partial migration outcomes
- blocked or unavailable IndexedDB
- missing visual settings needed for style-driven presentation features

The intended product behavior is:

- no silent data loss
- no silent fallback
- no broken-looking history screen

### Migration Strategy

Migration from the shipped implementation should:

1. Read legacy `tattvam_sessions` with defensive parsing.
2. Validate and migrate each usable session into the IndexedDB `sessions` store.
3. Derive `tattvam_session_index` from the migrated sessions.
4. Move `slide_style_cache` and `slide_image_cache` into the IndexedDB `settings`
   store.
5. Retain `lecture_duration_cache` in `localStorage`.
6. Clear or ignore deprecated legacy keys after successful migration.

### Implementation Boundaries

To keep the pipeline shell readable and aligned with project standards, the
implementation should be organized roughly as follows:

- `components/pipeline/PipelinePageClient.tsx`
  - consumes persistence hooks
  - does not own raw storage calls
- `hooks/useSessionPersistence.ts`
  - orchestrates bootstrap, autosave, restore, and migration
- `lib/persistence/localSessionIndex.ts`
  - owns `localStorage` reads and writes for lecture duration, active session id,
    and lightweight session index
- `lib/persistence/indexedDbStore.ts`
  - owns IndexedDB session and settings storage
- `lib/persistence/schema.ts`
  - owns validation, versioning, and migration helpers

### Recommended Implementation Sequence

The implementation should proceed in this order:

1. lock the persistence contract in `lib/persistence/schema.ts`
2. implement read-only bootstrap from `localStorage`
3. implement read-only IndexedDB restore
4. add idempotent migration from legacy `localStorage`
5. add autosave writes only after restore and migration are stable

### Consequences

This architecture keeps the current product experience intact while removing the
most failure-prone payloads from `localStorage`. It does add IndexedDB complexity,
but that is the appropriate trade-off here: the product already behaves like it
needs a local database, and IndexedDB is the browser-native tool for that job.

### Architecture Decision Record

#### Status

Approved

#### Context

The current frontend persists large browser-local payloads in `localStorage`,
including full session history, generated slides, extracted context, and visual
settings. This creates three classes of failure:

- quota exhaustion can break autosave and subsequent state changes
- malformed or stale JSON can break mount or session restore
- route-level UI code becomes responsible for storage, migration, validation, and
  failure handling

The product does not currently require user accounts, cross-device sync, or
server-owned draft persistence. It does, however, require reliable same-device
restore, recent-session history, and fast startup.

#### Options Considered

##### Option A: Keep everything in `localStorage` and add guards

Store all session and visual data in `localStorage`, but add defensive parsing,
try/catch, pruning, and fallback behavior.

Advantages:

- smallest implementation change
- simple synchronous API
- minimal migration complexity

Disadvantages:

- still constrained by small synchronous browser storage limits
- still rewrites large blobs on change
- still vulnerable to growth from chat transcripts, generated slides, and image
  payloads
- does not match the app's real need for structured local draft storage

##### Option B: Split persistence between `localStorage` and IndexedDB

Keep only tiny bootstrap metadata in `localStorage` and move full session bodies
and visual payloads to IndexedDB.

Advantages:

- startup remains fast because recent-session metadata is tiny
- large payloads move out of quota-sensitive synchronous storage
- preserves current single-device workflow without requiring backend persistence
- matches the browser's intended storage model for structured draft data

Disadvantages:

- more implementation complexity than `localStorage` only
- requires migration from already-shipped keys
- requires async restore flow and validation layer

##### Option C: Use IndexedDB for everything

Move all persisted values, including lecture duration and active session pointer,
into IndexedDB.

Advantages:

- one persistence system
- avoids split-brain concerns across storage types

Disadvantages:

- slightly slower and more complex boot path
- loses the convenience of tiny synchronous bootstrap values
- history and active-session resolution become heavier than needed

##### Option D: Introduce a server database now

Move session history and visual settings to a server-owned persistence layer.

Advantages:

- enables future cross-device sync and account-backed history
- centralizes persistence outside the browser

Disadvantages:

- adds backend APIs, auth, identity, and sync concerns the product does not yet
  need
- significantly expands delivery scope
- introduces network dependency into a workflow that currently succeeds offline
  once loaded

#### Decision

Adopt Option B: Split persistence between `localStorage` and IndexedDB.

#### Decision Details

`localStorage` is limited to:

- `lecture_duration_cache`
- `tattvam_active_session_id`
- `tattvam_session_index`

`tattvam_session_index` may contain only:

- `id`
- `title`
- `updatedAt`

IndexedDB stores:

- full session records
- messages
- saved snippets
- extracted verse/context data
- generated slides
- extracted style
- optional reference slide payload

#### Failure Mode Analysis

This persistence design depends on two browser storage layers with different
failure characteristics. To keep restore and autosave reliable, the architecture
must define how each likely failure is handled.

| Component | Failure Mode | User Impact | Required Handling |
|-----------|--------------|-------------|-------------------|
| `tattvam_session_index` in `localStorage` | malformed JSON | history boot can fail | safe parse, reset invalid index, continue with empty history |
| `tattvam_active_session_id` in `localStorage` | points to missing session | app tries to restore stale session | clear pointer, prune stale index entry, start fresh session |
| `lecture_duration_cache` in `localStorage` | invalid or missing number | duration falls back incorrectly | coerce safely, use default duration if invalid |
| IndexedDB `sessions` store | record missing or partially migrated | selected session cannot hydrate | skip broken record, surface non-blocking warning, preserve remaining sessions |
| IndexedDB `sessions` store | schema mismatch or stale version | restore writes invalid runtime state | validate and migrate before hydrate, discard irreparable records |
| IndexedDB `settings` store | extracted style or slide image missing | presentation settings partially restored | restore only valid settings, keep app usable without visual cache |
| Migration from `tattvam_sessions` | partial success | some sessions appear, others vanish unexpectedly | migrate per record, commit index only after successful writes, keep migration idempotent |
| Autosave write | IndexedDB transaction failure | latest edits may not persist | keep in-memory state authoritative, retry later, do not break interaction flow |
| Browser storage environment | IndexedDB unavailable or blocked | persistence layer degrades unexpectedly | fall back to in-memory mode with clear warning; keep app functional for current session |
| Session growth | payload becomes too large or expensive to save frequently | save latency or write failure increases | debounce autosave, keep index minimal, avoid storing duplicated blobs |

#### Required Reliability Rules

The implementation should explicitly guarantee the following:

- no persistence read failure may crash initial page mount
- no autosave write failure may break the active in-memory editing session
- `localStorage` is advisory bootstrap storage, not the source of truth for full
  session bodies
- IndexedDB session records must be validated before hydration into React state
- migration must be idempotent so interrupted upgrades can safely retry
- missing visual settings must degrade presentation features, not the whole app
- missing or corrupt session records must be pruned individually, not cause total
  history loss
- blocked IndexedDB or partial migration must surface as visible recovery states,
  not silent fallback

#### Rationale

This option is the smallest architecture change that meaningfully fixes the
current failure modes. It keeps bootstrapping simple, preserves the existing
same-device history UX, and avoids introducing backend persistence complexity
before the product actually needs it.

It also fits the project's architectural rules: persistence becomes a dedicated
subsystem instead of route-level incidental logic.

#### Follow-on Requirements

Implementation should include:

- versioned session schema
- safe parsing for `localStorage`
- validation for IndexedDB session reads
- migration from legacy `tattvam_sessions`
- pruning of stale session-index entries
- graceful fallback to a fresh in-memory session on restore failure
