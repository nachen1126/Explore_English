# Architecture and persistence

Explore English is a React / TypeScript / Vite application using HashRouter on GitHub Pages. React owns discovery, question answers, typed input, microphone status, feedback and scores.

## Routes

| Route | Purpose |
|---|---|
| `/#/` | Categories and published scene cards |
| `/#/scene/:sceneId` | Explore an available scene; discoveries persist |
| `/#/review/:sceneId` | Vocabulary cards, weak words first |
| `/#/challenge/:sceneId` | Explicit challenge start after exploration |
| `/#/challenge/:sceneId/:attemptId` | Stable, resumable attempt |
| `/#/result/:sceneId/:attemptId` | Immutable result for one attempt |
| `/#/result/:sceneId` | Most recent completed result (legacy bookmarks) |
| Any invalid/unpublished route | Named recovery page with a Home action |

## Content

`Category → Topic → Scene`. Every Scene references independent VocabularyItem IDs and Hotspot geometry. The catalog supports all 6 categories and 28 planned topics; only 4 audited development scenes are published. See [scene-asset-spec.md](scene-asset-spec.md).

- `types.ts`: Category, Topic, Scene, VocabularyItem, Hotspot, SceneProgress, ChallengeAttempt, ChallengeQuestion and AnswerRecord.
- `content.ts`: manually curated vocabulary and geometry for real existing pictures. No shared placeholder array or duplicate Scene 2.
- `data.ts`: category/topic catalog and accessors; retains every independently authored scene in a topic.
- `scene-geometry.ts` and SceneArt: percentages relative to the image's intrinsic-ratio box. No cover/crop or device-dependent aspect ratio.
- Images live in `public/scenes`: Home requests only lazy thumbnails; a scene or challenge requests that scene's full WebP. Review/results need no full scene image.

## Learning and challenge state

`store.tsx` exposes a reducer-backed React context. `logic.ts` contains pure discovery, matching, question creation, scoring, weak word priority, storage validation and recommendations.

An attempt is created only by an explicit Start/Retry/Practice event. Fisher–Yates shuffles all vocabulary; stable weak-word prioritisation follows. For 10 words, exactly 5 Find It and 5 Produce questions are stored once, with one unique word per question. Produce is typed input, with speech-to-text when supported.

Each answer stores the submitted text or hotspot ID, correctness, source and timestamp. Only `answers[0].correct` earns a point. Wrong first answers remain weak in that result even after retrying correctly. The reducer rejects old question IDs and events after a question or attempt is solved.

Results derive score, accuracy, remembered IDs and failed IDs directly from the attempt. A later attempt updates future weak-word priority without rewriting historical results. Weak practice uses exactly the failed set. Next-scene logic prefers an explicit published next picture in the same topic, excludes the current or duplicate image, otherwise chooses an unfinished same-topic candidate with weak words. No candidate produces an explicit completion message.

## Storage

- Key: `explore-english-v2`, schemaVersion **2**.
- Stores validated scene discovery records and complete attempts; no recordings.
- Parsing validates object shape, known scenes and vocabulary, unique questions, response fields, question sequence and completion consistency.
- Partial malformed records are discarded while healthy records survive. Read/write failures leave a usable React session and a visible storage notice.
- Unknown future schema versions are left untouched; the session will not overwrite them.
- If v2 is absent, known discovered IDs are migrated from `explore-english-v1`. Legacy DOM-derived scores are not imported because their first-answer history cannot be verified. The old key is retained.
- Restart is explicit, confirmed, scene-local, and preserves historical challenge attempts.
- Data is local to this browser; there is no account or cross-device service.

## Pronunciation

Browser SpeechSynthesis uses en-GB and selects an installed en-GB voice when available. Deliberate cancellation of the previous word is not an audio error. Missing synthesis reports an accessible notice.

SpeechRecognition/webkitSpeechRecognition is optional. The hook owns Listening, Processing, Success and Error, stop/cancel, timeout and cleanup; returning to a scene or changing questions aborts the old recogniser. Submission cancels remaining callbacks. Type It is always a first-class answer input. Text is normalised for case, punctuation, whitespace, articles and configured singular/plural/variant forms; no fuzzy word guessing.

Published IPA values were checked against Cambridge UK pronunciation entries. Each non-null value has an `ipaSource`. Unverified compound entries (exercise mat, weight bench, gym bag) are null and hidden. The standalone door/chair/jar forms omit Cambridge's optional linking-r superscript.

## Engineering and deployment

TypeScript strict/noUnused checks remain enabled. ESLint recommended JavaScript and TypeScript rule sets apply without blanket disabled rules. Tests use Vitest, jsdom and React Testing Library. The ErrorBoundary handles unexpected render failures. All npm dependency versions are exact and `package-lock.json` is committed.

The existing Pages workflow checks install, lint, types, tests and production build before uploading `dist` and deploying. See README for commands.
