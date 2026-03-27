---
title: 'Context Title Propagation Across Pipeline'
type: 'feature'
created: '2026-03-27'
status: 'proposed'
context:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/data-model.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-generate-slides-notebook-creation.md'
  - '_bmad-output/implementation-artifacts/spec-extraction-notebook-source-text-seeding.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The pipeline currently derives visible titles differently depending on the surface. Extraction can show `Lecture Context`, history can show `General: ...` or `Festival: ...`, and notebook creation can still fall back to `Untitled Workspace`. That makes one lecture feel like it has multiple identities as it moves through the workflow.

**Approach:** Define one context-derived title rule and reuse it across the pipeline. The title should be derived from the Context phase inputs, not from whichever downstream surface happens to need a label first. That derived title becomes the default notebook title, the session/history title, the extraction header, and the presentation label.

## Boundaries & Constraints

**Always:** Derive the title from Context-phase inputs using one shared helper; use the human-readable book label plus verse number for verse-specific talks; use the raw topic or festival name for general and festival talks; keep title derivation out of JSX-heavy branches and reuse the same helper in state, history, and notebook handoff paths.

**Ask First:** Adding a new manual title-editing UI; preserving `General:` or `Festival:` prefixes in user-facing titles; coupling the canonical title to fetched `extractedVerseData.title` instead of the Context-phase source inputs; widening persistence with a new `contextTitle` field when the title can already be derived from existing state.

**Never:** Let different pipeline surfaces invent their own title rules; use raw book codes such as `bg` or `sb` as the visible verse title; continue defaulting to `Untitled Workspace` when a valid Context title is already available.

## Canonical Title Rules

### Title Matrix

| Talk type | Canonical title |
|-----------|-----------------|
| `verse` | `{Book Label} {Verse Number}` |
| `general` | `{Topic}` |
| `festival` | `{Festival Name}` |
| `yatra` | `{Location}` as the current unchanged fallback to keep the helper total |

### Book Label Mapping

| Book code | Visible label |
|-----------|---------------|
| `bg` | `Bhagavad Gita` |
| `sb` | `Srimad Bhagavatam` |

### Examples

- Verse: `Bhagavad Gita 2.13`
- Verse: `Srimad Bhagavatam 1.2.6`
- General: `The Importance of Sadhu Sanga`
- Festival: `Janmashtami`
- Yatra: `Vrindavan`

## Pipeline Surfaces That Must Reuse the Canonical Title

- Extraction header title
- Session snapshot `title` used in history and restore flows
- Default `notebookName` carried into notebook creation
- `/api/notebooks` request `title`
- Presentation copy that references the active notebook title

The backend source title introduced in the source-text seeding artifact remains separate and out of scope here. This artifact governs the lecture/workspace title, not the per-source label.

## State and Helper Strategy

Use one shared helper instead of adding a new persisted state field:

```ts
deriveContextTitle({
  talkType,
  verseDetails,
  generalTopic,
  festivalName,
  yatraLocation,
})
```

Design rules:

- The helper should return a trimmed string or `null` when the required context input is incomplete.
- Verse titles must be built from the selected book label plus the typed verse number, not from downstream fetched verse metadata.
- `notebookName` should be hydrated from the derived context title when no user override exists.
- `Untitled Workspace` should remain only as a final defensive fallback for invalid or incomplete state, not as the normal path after Context is complete.

## User Flow

1. The user chooses a talk type and fills the Context inputs.
2. The app derives one canonical title from those Context inputs.
3. Extraction shows that title in its header immediately, even when no fetched reference is present.
4. The same title becomes the default notebook/workspace title.
5. The same title is saved into session history.
6. The same title is reused in Presentation and notebook-creation requests.

## Code Map

- `components/pipeline/utils.ts` -- host the canonical context-title helper and book-label mapping
- `components/pipeline/PipelinePageClient.tsx` -- hydrate `notebookName` from the context title and reuse it for notebook creation
- `components/pipeline/PipelineSteps.tsx` -- replace fallback extraction labels with the canonical context title
- `components/pipeline/PipelineModals.tsx` -- reuse the same lecture title when relevant surfaces already depend on `VerseData.title`
- `hooks/useSessionPersistence.ts` and `lib/persistence/schema.ts` -- no schema expansion required unless implementation chooses to persist a manual override later

## Tasks & Acceptance

**Execution:**
- [ ] Add a shared helper for canonical context-title derivation.
- [ ] Replace the current `getSessionTitle(...)` branching with the shared helper.
- [ ] Populate extraction and presentation title surfaces from the canonical context title.
- [ ] Replace the current blank notebook-name default path with the canonical context title when available.
- [ ] Keep `Untitled Workspace` only as a defensive fallback when a valid context title cannot be derived.

**Acceptance Criteria:**
- Given the user selects `Verse Specific Lecture` with book `bg` and verse `2.13`, when the title is shown anywhere across the pipeline, then it is `Bhagavad Gita 2.13`.
- Given the user enters a general topic, when the title is shown across the pipeline, then it is exactly the topic text without `General:` or other prefixes.
- Given the user enters a festival name, when the title is shown across the pipeline, then it is exactly the festival name without `Festival:` or other prefixes.
- Given the user proceeds from Context to Extraction without a fetched reference, when Extraction renders its heading, then it still shows the canonical context title instead of `Lecture Context`.
- Given the user creates a notebook after completing Context, when the notebook request is sent, then the request title uses the canonical context title instead of `Untitled Workspace`.

</frozen-after-approval>

## Design Notes

The important architectural move is to treat title as derived domain data, not as a UI-local string. Once a lecture has a context identity, the rest of the pipeline should consume it rather than re-derive nearby approximations.

I am intentionally not recommending a new persisted `contextTitle` field here. The data needed to derive the title already exists in state, and a helper-based approach keeps the model lean while still making the behavior consistent.

## Spec Change Log

- Supersede the prior default-notebook-title assumption of `Untitled Workspace` for normal flows with a context-derived title.
- Standardize session, extraction, notebook, and presentation titles on one Context-phase rule.

## Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`

**Manual checks:**
- Start a verse-specific lecture and confirm the extraction header, history title, notebook title, and presentation label all show `Book Label + Verse Number`.
- Start a general lecture and confirm all those surfaces use the raw topic text without prefixes.
- Start a festival lecture and confirm all those surfaces use the raw festival name without prefixes.
- Reload a saved session and confirm the history title still matches the canonical context title.
