# Context Routing Simplification

Status: done

## Intent

Align the implemented context-entry flow with the product decision that
`General Lecture` and `Festival Lecture` do not require a fetched reference
before extraction begins.

## Implemented Behavior

- `General Lecture` and `Festival Lecture` now advance directly from context
  setup to extraction.
- No request is issued to `/api/lecture/general` or `/api/lecture/festival`
  during the active UI flow.
- `extractedVerseData` is cleared for those talk types and remains `null`
  unless a fetched reference exists.
- `Verse Specific Lecture` continues to fetch `/api/verse`.
- `Yatra Talk` continues to fetch `/api/lecture/yatra`.
- Extraction-step accessibility now treats `general` and `festival` as valid
  entry modes even without `extractedVerseData`.

## Architectural Rationale

- Removes an unnecessary backend hop for topic-based lecture modes where the
  fetched reference was not required for extraction chat.
- Matches the extraction contract, which already sends only the user's trimmed
  question and does not serialize locally assembled context into `/api/chat`.
- Reduces time-to-extraction for general and festival flows while preserving
  reference behavior for verse and yatra modes.

## Affected Files

- `components/pipeline/PipelinePageClient.tsx`
- `_bmad-output/planning-artifacts/runtime-interfaces.md`
- `_bmad-output/planning-artifacts/data-model.md`
- `_bmad-output/planning-artifacts/research.md`
- `_bmad-output/planning-artifacts/quickstart.md`
- `_bmad-output/planning-artifacts/spec.md`

## Verification

- `npm run lint -- components/pipeline/PipelinePageClient.tsx`
- `npm test -- tests/lecture/server.test.ts tests/chat/normalize.test.ts tests/chat/shared.test.ts`
