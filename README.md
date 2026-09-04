# Explore English

A mobile-first visual scene English learning app: choose a place, discover vocabulary, hear British English, then complete Find It and Say It challenges.

## Product flow

Home → Scene exploration (10 normalized hotspots) → Find It → Say It → Result → same-topic recommendation.

## Architecture

React + TypeScript + Vite SPA. `src/data.ts` contains topics, scenes, vocabulary and normalized hotspot coordinates. `src/logic.ts` owns answer matching, progress, persistence and recommendations. `src/main.tsx` provides the focused screens and browser speech services. Hash routing keeps GitHub Pages refresh-safe.

## Docker development

Requires Docker Desktop only:

```bash
docker compose up --build
docker compose down
docker compose run --rm web npm test
docker compose down --rmi local --volumes
```

The production container is served at `http://localhost:8080`.

## Testing and build

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs these checks on pushes and pull requests. The deploy workflow builds and publishes `dist` to GitHub Pages after a successful build. Enable Pages once in repository Settings → Pages → Source: GitHub Actions.

## Content and hotspots

Add a `Topic`, then add one or more `Scene` entries. Each target references a `Vocabulary` id and uses `x`, `y`, `w`, `h` values from 0 to 1, so responsive images remain clickable. Vocabulary includes British IPA, Chinese meaning, accepted answers and a speech word.

## Audio and speech

Pronunciation uses browser `SpeechSynthesis` with `en-GB`. Say It uses `SpeechRecognition`/`webkitSpeechRecognition` when available, with a typed-answer fallback. No recordings or personal data are stored.

## Persistence

Learning records are serialized under `localStorage` key `explore-english-v1`. Clear it in browser devtools to reset progress. Corrupt storage safely falls back to an empty state.

## Limitations and future

Demo scene art is deterministic CSS illustration rather than generated imagery. V1 has no accounts, backend sync or cloud TTS; these can be added behind the existing services and data boundaries.
