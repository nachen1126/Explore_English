# Architecture and persistence

Explore English is a React / TypeScript / Vite application using HashRouter on GitHub Pages. React owns discovery, question answers, typed input, microphone status, feedback and scores.

## Routes

| Route | Purpose |
|---|---|
| `/#/` | Category directory; no direct scene links |
| `/#/category/:categoryId` | Separate scene selection page; unpublished plans are text only |
| `/#/scene/:sceneId` | Explore an available scene; discoveries persist |
| `/#/review/:sceneId` | Vocabulary cards, weak words first |
| `/#/challenge/:sceneId` | Explicit challenge start after exploration |
| `/#/challenge/:sceneId/:attemptId` | Stable, resumable attempt |
| `/#/result/:sceneId/:attemptId` | Immutable result for one attempt |
| `/#/result/:sceneId` | Most recent completed result (legacy bookmarks) |
| Any invalid/unpublished route | Named recovery page with a Home action |

## Content

`Category → Topic → Scene`. Every Scene references independent VocabularyItem IDs and Hotspot geometry. The catalog supports 8 categories and 38 topics; only the final Kitchen · Cooking and Airport · Departures scenes are published. The four old development records are retained with `published: false` for safe storage filtering and friendly legacy URLs. The existing health plans have their own Health & Wellbeing category in addition to the seven requested examples. Existing artwork briefs remain in [scene-asset-spec.md](scene-asset-spec.md); planning entries do not claim completed artwork.

- `types.ts`: Category, Topic, Scene, VocabularyItem, Hotspot, SceneProgress, ChallengeAttempt, ChallengeQuestion and AnswerRecord.
- `content.ts`: preserves the original scene and word records and combines them with specialist content.
- `specialist-content.ts`: manually curated words, UK pronunciation sources and geometry for the two final illustrations.
- `hotspots.ts`: normalized rectangular, elliptical and polygon geometry for every published scene; one word may own multiple visible regions.
- `data.ts`: category/topic catalog and accessors; retains every independently authored scene in a topic.
- `scene-geometry.ts` and SceneArt: percentages relative to the image's intrinsic-ratio box. No cover/crop or device-dependent aspect ratio.
- Images live in `public/scenes`: category pages request only lazy thumbnails; a scene or challenge requests that scene's full WebP. Home, review and results need no full scene image.

## Learning and challenge state

`store.tsx` exposes a reducer-backed React context. `logic.ts` contains pure discovery, matching, question creation, scoring, weak word priority, storage validation and recommendations.

An attempt is created only by an explicit Start/Retry/Practice event. Fisher–Yates shuffles all vocabulary; stable weak-word prioritisation follows. For 10 words, exactly 5 Find It and 5 Produce questions are stored once, with one unique word per question. Produce is typed input, with speech-to-text when supported.

Each answer stores the submitted text or hotspot ID, correctness, source and timestamp. Only `answers[0].correct` earns a point. Wrong first answers remain weak in that result even after retrying correctly. The reducer rejects old question IDs and events after a question or attempt is solved.

Exploration uses the same discovery callback for Next word and Enter. Its scoped listener ignores composition, key repeat, editable fields and modal dialogs; every picture hotspot remains keyboard focusable and has a word-specific accessible name. Produce has a separate session-scoped capture listener: unfinished input Enter submits normally, while a later Enter after resolution invokes the same Next callback. The held-key guard persists across question remounts. Resolved inputs are read-only so their focus is retained. The former All objects and Find It text-alternative dialogs are not part of the learning flow.

Find It locks a solved question and schedules one 600 ms transition, with an idempotent question-bound continuation and unmount cleanup. Repeated clicks on the same wrong hotspot inside 500 ms count once. Its third valid wrong selection exposes a Show me a hint action; the requested outline lasts 1.6 seconds, reveals no answer text and becomes static under reduced-motion preferences. The learner must still select the correct hotspot and the first error keeps the word weak. Produce always requires explicit continuation. Its third valid wrong answer (typing and speech share the answer history) reveals a persistent hint. `revealedAt` records assistance while `answerRequiredAfterReveal` keeps the current question open until a later correct answer. Reveal clears and unlocks the field, never earns a point, and remains weak after the correct retry. Existing reveal-only records from the earlier behaviour remain readable as historical completions.

Results derive score, accuracy, remembered IDs and failed IDs directly from the attempt. Full challenges and weak-word practice carry separate `kind` values; a later weak practice result never replaces the latest full challenge result. Weak practice uses exactly the failed set. Next-scene logic excludes the current, duplicate-image and unpublished scenes, then prefers an explicit same-topic continuation, an unfinished published scene in the same topic, an unfinished scene in the same category, and finally another unfinished published scene.

`result-feedback.ts` chooses the requested five titles/descriptions using the exact score/total ratio, not rounded accuracy. Perfect recall requires score === total. Result display truncates non-perfect percentages to one decimal to avoid a misleading rounded 100%. Missing/invalid completed records have an empty state. Long attempt history and no-next-scene explanations open in keyboard-accessible dialogs.

## Viewport layout and pagination

`screen-layout.css` retains the existing visual theme while compacting headings, gaps and panels. At normal desktop dimensions the shell is a flex column filling 100dvh: navigation, footer and storage notices participate in sizing, leaving the remaining height for main content. Each image sits in a size container and uses the smaller of the available width and height × its intrinsic ratio. The image, hotspot overlay and outline layer keep the same frame; there is no crop or stretch. Mobile and short-landscape layouts return to natural vertical flow with the full-width intrinsic-ratio image and reachable controls below it.

The desktop breakpoint is expressed in em so larger default font settings can fall back to natural document flow. Small/short windows retain scrolling; page overflow is not hidden. Dialog content alone can scroll inside its visible header/close control. Home shows ready categories with thumbnail, scene count and progress before a compact Coming Soon directory. Category pages show their real scenes and plans without inventing content. All content remains reachable without altering learning storage.

## Storage

- Key: `explore-english-v2`, schemaVersion **2**.
- Stores validated scene discovery records and complete attempts; no recordings.
- Optional `recognitionId` and `revealedAt` fields extend schema 2 backward-compatibly. The loader validates revealed completion and duplicate recognition IDs. A one-time schema-2 cleanup removes scene progress and attempts for the retired `kitchen-1`, `airport-1`, `gym-1` and `supermarket-1` records, writes the cleaned state immediately, and keeps all valid current-scene records. Known product removals do not raise a corruption warning; genuinely malformed data uses a dismissible bilingual notice.
- Parsing validates object shape, known scenes and vocabulary, unique questions, response fields, question sequence and completion consistency.
- Partial malformed records are discarded while healthy records survive. Read/write failures leave a usable React session and a visible storage notice.
- Unknown future schema versions are left untouched; the session will not overwrite them.
- If v2 is absent, known discovered IDs are migrated from `explore-english-v1`. Legacy DOM-derived scores are not imported because their first-answer history cannot be verified. The old key is retained.
- Restart is explicit, confirmed, scene-local, and preserves historical challenge attempts.
- Data is local to this browser; there is no account or cross-device service.

## Pronunciation

Browser SpeechSynthesis uses en-GB and selects an installed en-GB voice when available. Deliberate cancellation of the previous word is not an audio error. Missing synthesis reports an accessible notice.

SpeechRecognition/webkitSpeechRecognition is optional and requires a secure context. The hook owns Starting, Listening, Processing, Success and Error phase timeouts and cleanup. Recognition starts synchronously from one user click after cancelling synthesis, uses `continuous = false`, and relies on native speech/audio end plus the final result instead of exposing a Stop control. A single active session accepts one final result using resultIndex/isFinal and returns its unique recording ID. The recognised text is rendered, then the Produce panel automatically dispatches it once through the same answer reducer used by typing. A new recording receives a new ID; stale callbacks and duplicate IDs are ignored. Editing a transcript switches the next manual submission to typing. Permission, silence, empty text, capture, network and service errors never dispatch answer records. Navigation, question changes, pagehide and hidden-document events abort and detach the old session. Type It is always a first-class answer input. Text is normalised for case, punctuation, whitespace, articles and configured singular/plural/variant forms; no fuzzy word guessing.

Published IPA values were checked against Cambridge UK pronunciation entries. Each non-null value has an `ipaSource`; compounds may retain all component pages in `ipaSources`. Unverified legacy compound entries (exercise mat, weight bench, gym bag) are null and hidden. The standalone door/chair/jar forms omit Cambridge's optional linking-r superscript.

## Engineering and deployment

TypeScript strict/noUnused checks remain enabled. ESLint recommended JavaScript and TypeScript rule sets apply without blanket disabled rules. Tests use Vitest, jsdom and React Testing Library. The ErrorBoundary handles unexpected render failures. All npm dependency versions are exact and `package-lock.json` is committed.

The existing Pages workflow checks install, lint, types, tests and production build before uploading `dist` and deploying. See README for commands.
