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

`Category → Topic → Scene`. Every Scene references independent VocabularyItem IDs and Hotspot geometry. The catalog supports 8 categories and 38 planned topics; only 4 audited development scenes are published. The existing health plans have their own Health & Wellbeing category in addition to the seven requested examples. Topic, scene and vocabulary IDs remain stable. Existing artwork briefs remain in [scene-asset-spec.md](scene-asset-spec.md); new planning entries do not claim completed artwork.

- `types.ts`: Category, Topic, Scene, VocabularyItem, Hotspot, SceneProgress, ChallengeAttempt, ChallengeQuestion and AnswerRecord.
- `content.ts`: manually curated vocabulary and geometry for real existing pictures. No shared placeholder array or duplicate Scene 2.
- `data.ts`: category/topic catalog and accessors; retains every independently authored scene in a topic.
- `scene-geometry.ts` and SceneArt: percentages relative to the image's intrinsic-ratio box. No cover/crop or device-dependent aspect ratio.
- Images live in `public/scenes`: category pages request only lazy thumbnails; a scene or challenge requests that scene's full WebP. Home, review and results need no full scene image.

## Learning and challenge state

`store.tsx` exposes a reducer-backed React context. `logic.ts` contains pure discovery, matching, question creation, scoring, weak word priority, storage validation and recommendations.

An attempt is created only by an explicit Start/Retry/Practice event. Fisher–Yates shuffles all vocabulary; stable weak-word prioritisation follows. For 10 words, exactly 5 Find It and 5 Produce questions are stored once, with one unique word per question. Produce is typed input, with speech-to-text when supported.

Each answer stores the submitted text or hotspot ID, correctness, source and timestamp. Only `answers[0].correct` earns a point. Wrong first answers remain weak in that result even after retrying correctly. The reducer rejects old question IDs and events after a question or attempt is solved.

Exploration uses the same discovery callback for Next word and Enter. Its scoped listener ignores composition, key repeat, editable fields and modal dialogs; hotspot focus is supported and the native button activation is prevented. Free object selection remains available.

Find It locks a solved question and schedules one 600 ms transition, with an idempotent question-bound continuation and unmount cleanup. Produce always requires explicit continuation. Its third valid wrong answer (typing and speech share the answer history) reveals a persistent hint. Optional `revealedAt` resolves a question without inserting a fake correct answer; it never earns a point. Hint/reveal state derives from the persisted question and cannot leak into the next question.

Results derive score, accuracy, remembered IDs and failed IDs directly from the attempt. A later attempt updates future weak-word priority without rewriting historical results. Weak practice uses exactly the failed set. Next-scene logic prefers an explicit published next picture in the same topic, excludes the current or duplicate image, otherwise chooses an unfinished same-topic candidate with weak words. No candidate produces an explicit completion message.

## Storage

- Key: `explore-english-v2`, schemaVersion **2**.
- Stores validated scene discovery records and complete attempts; no recordings.
- Optional `recognitionId` and `revealedAt` fields extend schema 2 backward-compatibly. Old v2 records need no migration. The loader validates revealed completion and duplicate recognition IDs.
- Parsing validates object shape, known scenes and vocabulary, unique questions, response fields, question sequence and completion consistency.
- Partial malformed records are discarded while healthy records survive. Read/write failures leave a usable React session and a visible storage notice.
- Unknown future schema versions are left untouched; the session will not overwrite them.
- If v2 is absent, known discovered IDs are migrated from `explore-english-v1`. Legacy DOM-derived scores are not imported because their first-answer history cannot be verified. The old key is retained.
- Restart is explicit, confirmed, scene-local, and preserves historical challenge attempts.
- Data is local to this browser; there is no account or cross-device service.

## Pronunciation

Browser SpeechSynthesis uses en-GB and selects an installed en-GB voice when available. Deliberate cancellation of the previous word is not an audio error. Missing synthesis reports an accessible notice.

SpeechRecognition/webkitSpeechRecognition is optional and requires a secure context. The hook owns Starting, Listening, Processing, Success and Error, stop/cancel, phase timeouts and cleanup. Recognition starts synchronously from a user click after cancelling synthesis. A single active session accepts one final result using resultIndex/isFinal and returns its unique recording ID. Stale callbacks and duplicate submissions are ignored. Permission, silence, capture, network and service errors never dispatch answer records. Navigation, question changes, pagehide and hidden-document events stop recording. Type It is always a first-class answer input. Text is normalised for case, punctuation, whitespace, articles and configured singular/plural/variant forms; no fuzzy word guessing.

Published IPA values were checked against Cambridge UK pronunciation entries. Each non-null value has an `ipaSource`. Unverified compound entries (exercise mat, weight bench, gym bag) are null and hidden. The standalone door/chair/jar forms omit Cambridge's optional linking-r superscript.

## Engineering and deployment

TypeScript strict/noUnused checks remain enabled. ESLint recommended JavaScript and TypeScript rule sets apply without blanket disabled rules. Tests use Vitest, jsdom and React Testing Library. The ErrorBoundary handles unexpected render failures. All npm dependency versions are exact and `package-lock.json` is committed.

The existing Pages workflow checks install, lint, types, tests and production build before uploading `dist` and deploying. See README for commands.
