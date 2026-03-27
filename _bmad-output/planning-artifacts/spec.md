# Feature Specification: Tattvam AI Lecture Synthesis Workflow

**Feature Branch**: `001-short-name-tattvam`  
**Created**: 2026-03-25  
**Status**: Draft  
**Input**: User description: "Update the frontend so extraction chat queries use the NotebookLM backend chat endpoint, while preserving citation review, notebook synthesis defaults, visual-style configuration, deck preview, fullscreen presentation, and current export limitations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore lecture material and capture reusable insights (Priority: P1)

A presenter starts in a guided chat workspace, asks questions about lecture material, sends those questions to the configured notebook chat backend, reads structured assistant answers, reviews any linked source citations, and saves useful full responses or cited source excerpts into a working notebook of insights.

**Why this priority**: This is the entry point to the product and the source of all content that powers synthesis and presentation.

**Independent Test**: Start from a fresh session, send one or more lecture questions, confirm assistant answers appear in the conversation, open at least one available citation, save either a full answer or a cited excerpt, and verify the saved insight appears in the knowledge base without relying on later workflow stages.

**Verification Plan**: Run `npm run lint`, run `npm run build`, then manually confirm the seeded welcome message, prompt submission, assistant response rendering, citation link behavior, citation detail viewing, full-response saving, citation excerpt saving, duplicate-save prevention, snippet removal, and disabled progression when no insights are saved.

**Acceptance Scenarios**:

1. **Given** the user opens the app for the first time, **When** the chat workspace loads, **Then** they see a welcome message and a prompt field inviting them to ask about lecture material.
2. **Given** the user submits a non-empty lecture question, **When** the notebook chat backend completes its response, **Then** the answer is appended to the conversation and shown in readable rich text.
3. **Given** an assistant answer includes source references, **When** the user selects a citation, **Then** the app shows the cited excerpt and any linked media source in a dedicated detail view.
4. **Given** the user saves either a full assistant response or a cited excerpt, **When** the save action completes, **Then** that insight appears in the notebook and can be used in later stages.
5. **Given** the user tries to save the exact same insight again, **When** the save action is triggered, **Then** the notebook keeps a single copy of that insight.

---

### User Story 2 - Review notebook readiness and compile a workspace (Priority: P2)

After curating insights, the presenter reviews a synthesis screen that summarizes saved content, estimates whether it is sufficient for the intended lecture length, optionally names the workspace, and compiles the notebook for presentation preparation.

**Why this priority**: Users need confidence that their saved material is substantial enough before investing effort in slide generation, and they need a compiled workspace to unlock presentation mode.

**Independent Test**: With saved insights already present, move to synthesis, review the content preview and sufficiency indicator, compile the workspace with and without manually naming it, and confirm the experience advances to presentation mode.

**Verification Plan**: Run `npm run lint`, run `npm run build`, then manually confirm step gating, workspace naming, automatic fallback naming, content preview, lecture-duration-based sufficiency feedback, loading feedback during compilation, and automatic handoff to the next step.

**Acceptance Scenarios**:

1. **Given** the user has saved at least one insight, **When** they proceed to synthesis, **Then** they can review a preview of the saved content and see whether the content estimate appears sufficient for the selected lecture duration.
2. **Given** the user has entered a workspace name, **When** they compile the notebook, **Then** the system shows a temporary in-progress state, creates a workspace identifier, and advances to presentation mode.
3. **Given** the user leaves the workspace name blank, **When** they compile the notebook, **Then** the system assigns a default workspace name and still advances when compilation completes.

---

### User Story 3 - Configure presentation style and present the generated deck (Priority: P3)

The presenter configures lecture duration and visual style settings, optionally uploads a reference slide to extract a reusable style prompt, manually edits or clears style guidance, generates a markdown-based deck preview from the compiled notebook, and can review that deck either as preview cards or in fullscreen presentation mode.

**Why this priority**: This step turns curated lecture insights into a presentable artifact and gives users a way to review the generated deck in both editing and presenting contexts.

**Independent Test**: Open visual settings, set lecture duration, upload a slide image, confirm style extraction or manual style entry, clear and reconfigure style data, generate slides from a compiled notebook, verify the deck appears as separate preview slides, enter fullscreen mode, and move between slides with keyboard navigation.

**Verification Plan**: Run `npm run lint`, run `npm run build`, then manually confirm settings persistence, image upload, style extraction feedback, manual style editing, cache clearing, warning when style is missing, slide generation, slide splitting, regeneration, fullscreen presentation, keyboard navigation, and the current non-functional export affordance.

**Acceptance Scenarios**:

1. **Given** the user opens visual settings, **When** they upload a single reference slide, **Then** the app previews that slide, extracts a reusable style description, and stores the style for later generation.
2. **Given** the user wants different style guidance, **When** they edit the style prompt manually or clear the visual cache, **Then** later deck generation uses the updated guidance or reflects that no style guidance is currently available.
3. **Given** the user has a compiled notebook and style guidance, **When** they generate a slide deck, **Then** the app produces markdown slides separated into individual preview cards.
4. **Given** the user has generated a deck, **When** they open fullscreen presentation mode, **Then** they can move through slides one at a time and see the current slide position.

---

### Edge Cases

- If the user submits an empty chat prompt, the app does not send a request or add a new message.
- If the notebook chat backend is unavailable or returns a malformed payload, the app shows the existing chat failure fallback instead of appending a partial assistant response.
- If the assistant request, style-analysis request, or slide-generation request fails, the app surfaces an error message instead of silently succeeding.
- If the user removes all saved insights, progression into synthesis is blocked until at least one insight is saved again.
- If the saved insights appear too short for the selected lecture duration, the app warns that more content is recommended rather than blocking compilation outright.
- If the user reaches presentation mode without style guidance, the app shows a warning and does not produce a slide deck until guidance is available.
- If a citation does not include a usable media link, the citation detail view still shows the cited excerpt without embedded media.
- If the user exits fullscreen presentation, slide navigation resets to the first generated slide for the next fullscreen session.
- The current product stops at in-app deck preview and fullscreen presentation: notebook compilation is a simulated handoff and the visible PPTX export control does not produce a presentation file in this codebase.

## Constitution Alignment *(mandatory)*

- **Route Surface Impact**: The current user-facing workflow still lives on a single route and is documented as one continuous three-step experience. Any future implementation derived from this spec should preserve that unified journey while reducing concentration in the route layer rather than expanding it.
- **Client Boundary Plan**: The documented experience depends on browser-managed conversation state, local persistence, file upload, media embeds, modal interactions, and fullscreen behavior. Backend chat access, lecture-context generation, style extraction, and slide generation should be mediated through server-side routes or adapters so the client remains focused on interaction state rather than external service wiring.
- **Module Boundary Plan**: This specification assumes distinct product responsibilities for chat exploration, citation review, notebook synthesis, style configuration, and slide presentation. Any follow-on implementation should express those responsibilities as separate feature modules rather than further centralizing them.
- **Shared UI Reuse Plan**: Existing shared controls for buttons, inputs, text areas, cards, and scrollable panels should be reused where they support the documented workflow, with product-specific styling layered on top only when needed.
- **Library Version Alignment**: No dependency change is required to describe the current behavior. Any later implementation work should stay aligned with the dependency versions already declared in the repository unless an upgrade is explicitly planned and validated.
- **Verification Strategy**: Minimum verification remains `npm run lint`, `npm run build`, and manual walkthroughs covering the three user stories, cached settings recovery, duplicate insight handling, citation flows, warning states, fullscreen presentation, and deck preview behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present the workflow as three connected stages: extraction, synthesis, and presentation.
- **FR-002**: The system MUST begin the extraction stage with a welcome message and allow users to submit freeform questions about lecture material.
- **FR-002A**: The system MUST send extraction chat questions through a backend-owned notebook chat interface instead of calling the chat model directly from the browser.
- **FR-002B**: The system MUST send only the user's trimmed extraction input as the backend `question` value and MUST NOT prepend or append locally assembled lecture context to that field.
- **FR-003**: The system MUST append assistant responses to the conversation and present them in a readable rich-text format suitable for structured answers.
- **FR-004**: The system MUST render source references in assistant responses so users can inspect cited material when references are available.
- **FR-005**: The system MUST provide a citation detail view that shows the cited excerpt and, when available, a linked media source for that citation.
- **FR-006**: The system MUST allow users to save assistant responses into a notebook of insights and remove saved insights individually.
- **FR-007**: The system MUST allow users to save a cited excerpt from the citation detail view into the notebook of insights.
- **FR-008**: The system MUST prevent duplicate notebook entries when the user attempts to save the same insight content more than once.
- **FR-009**: The system MUST show the current count of saved insights and keep synthesis unavailable until at least one insight has been saved.
- **FR-010**: The system MUST provide a synthesis screen where users can preview the saved insights and optionally name the workspace before compiling.
- **FR-011**: The system MUST estimate content sufficiency against the selected lecture duration and communicate whether the current notebook appears sufficient or whether more content is recommended.
- **FR-012**: The system MUST assign a default workspace name when the user compiles without entering one.
- **FR-013**: The system MUST create a notebook workspace identifier during compilation and advance the user to presentation mode when compilation completes.
- **FR-014**: The system MUST provide a visual settings surface where users can set lecture duration, upload one reference slide, review the uploaded slide, edit the resulting style prompt, re-run style extraction, and clear cached style assets.
- **FR-015**: The system MUST automatically extract a reusable style description after a new reference slide is uploaded.
- **FR-015A**: The system MUST perform reference-slide style extraction through a server-owned route or adapter rather than importing the model SDK directly into the browser.
- **FR-016**: The system MUST persist lecture duration, reference slide, and style prompt in the user’s browser so those settings can be restored in a later session on the same device.
- **FR-017**: The system MUST warn the user in presentation mode when no visual style guidance is available for slide generation.
- **FR-018**: The system MUST generate a markdown-based slide deck from the compiled notebook content and the chosen style guidance.
- **FR-018A**: The system MUST perform slide generation through a server-owned route or adapter rather than calling the model SDK directly from the browser.
- **FR-019**: The system MUST split generated deck content into individual slide previews using explicit slide separators and render each slide as its own preview card.
- **FR-020**: The system MUST let the user discard the current generated deck and request a fresh generation.
- **FR-021**: The system MUST provide a fullscreen presentation mode for generated decks that displays one slide at a time and indicates the current slide position.
- **FR-022**: The system MUST allow keyboard-based slide navigation while fullscreen presentation mode is active.
- **FR-023**: The system MUST show an export affordance for presentation output even though the current codebase does not yet produce an actual presentation file.
- **FR-024**: The system MUST show an explicit fallback message whenever backend chat, style extraction, or slide generation cannot be completed successfully.

### Readability and Boundary Requirements

- **RB-001**: Route files under `app/` MUST remain primarily compositional; extract persistence, SDK calls, prompt construction, validation, and transformations when they grow beyond simple wiring.
- **RB-002**: JSX MUST NOT own repeated derived calculations, deep branching, or non-trivial parsing; move that logic into named helpers or hooks.
- **RB-003**: New UI MUST reuse or extend existing `components/ui` primitives before introducing bespoke raw patterns.
- **RB-004**: Client-side code MUST be limited to the smallest boundary that needs browser APIs, local state, or event-heavy interaction.
- **RB-005**: New code MUST follow the APIs and recommended patterns of the dependency versions currently declared in `package.json`; do not reintroduce legacy library idioms without an explicit compatibility plan.

### Key Entities *(include if feature involves data)*

- **Conversation Message**: A single user or assistant exchange shown in the extraction workspace, including sender role, message content, and any available source references.
- **Citation Reference**: A numbered source excerpt associated with an assistant response that can be opened for detail review and, when available, media playback.
- **Saved Insight**: A curated full response or cited excerpt stored in the notebook for later synthesis and presentation.
- **Notebook Workspace**: The named synthesis result that represents the compiled set of saved insights and unlocks presentation generation.
- **Visual Style Profile**: The lecture duration setting, optional reference slide, and editable style prompt that guide presentation generation.
- **Generated Slide Deck**: A markdown deck composed of multiple slides that can be reviewed as preview cards or presented fullscreen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can ask a lecture question, save at least one insight, and reach the synthesis step in under 5 minutes without external guidance.
- **SC-002**: A user can open a cited source, save a relevant excerpt, and see it added to the notebook in under 30 seconds from opening the citation.
- **SC-003**: After the user starts notebook compilation, the app advances from synthesis to presentation within 3 seconds whether the workspace name was entered manually or defaulted automatically.
- **SC-004**: When a compiled notebook and style guidance are available, the app produces a preview containing at least 3 separately rendered slides from one generation request.
- **SC-005**: A user with a generated deck can enter fullscreen presentation mode and navigate through slides without leaving the app.
- **SC-006**: Returning users on the same browser recover their saved lecture duration and visual style settings on the next visit without manual re-entry.

## Assumptions

- The primary users are presenters, teachers, or knowledge workers turning lecture material into a concise presentation outline.
- Users operate the current product as a single-screen workflow rather than a multi-page or collaborative workspace.
- Extraction chat depends on a reachable notebook chat backend being configured for the app.
- Citation-rich responses, style extraction, and slide generation depend on valid external model access being configured for the app.
- The current code routes Gemini-backed lecture-context generation, style extraction, and slide generation through server-owned Next.js handlers rather than direct browser SDK usage.
- The current notebook compilation step represents a local product handoff rather than a fully synchronized external notebook record managed by this repository.
- Current scope ends at in-app preview and fullscreen presentation of a markdown-based deck; actual presentation-file export and shared multi-user workflows are not part of the delivered behavior.
