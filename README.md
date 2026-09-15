# Explore English

## WeChat Mini Program MVP

The existing Vite website remains the production web application. A separate Taro 4 + React + TypeScript WeChat Mini Program lives in [`miniapp/`](miniapp/), with framework-neutral Kitchen content and challenge logic in [`packages/shared/`](packages/shared/).

The first mini-program release contains only `Food & Dining → Kitchen · Cooking`. Setup, CloudBase collections, security rules, cloud functions, WeChat DevTools import, ASR/TTS configuration and review steps are documented in [`docs/miniapp-setup.md`](docs/miniapp-setup.md).

```sh
cd miniapp
pnpm install --frozen-lockfile
pnpm run test
pnpm run build:weapp
```

Learn useful English through illustrated places: choose a category, choose an available scene, discover every object, then complete a Find It / Say It or Type It challenge and review your first-answer result.

Live: [Explore English on GitHub Pages](https://nachen1126.github.io/Explore_English/#/)

## Development

Node.js 22.12+ (CI uses Node 22). All npm dependencies are pinned in package.json and package-lock.json.

```sh
npm ci
npm run dev
```

The Vite base is `/Explore_English/`. Use the exact URL printed by Vite. Hash routes remain refresh-safe on GitHub Pages.

## Required checks

Run in order:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

CI and the existing Pages workflow run this chain. A successful push to main publishes the validated dist through GitHub Actions. Pull requests run CI without publishing.

## Available content

Thirteen scenes are published across seven categories. Every scene has its own 1536 × 1024 artwork, thumbnail, image-specific vocabulary, and independently calibrated normalized hotspots. The first new batch adds Study & Work · Classroom and Travel & Transport · Train Station, with exactly ten target words each. Unfinished plans remain Coming Soon until their matching artwork and hotspot audit are complete.

- [Full image briefs and missing asset list](docs/scene-asset-spec.md)
- [Architecture, data model and storage migration](docs/architecture.md)
- [Baseline audit and removed implementations](docs/refactor-audit.md)
- [Acceptance and browser verification](docs/validation.md)
- [Category, keyboard, hints and speech acceptance — 2026-09-06](docs/interaction-validation.md)
- [Single-screen layout, Produce Enter and score feedback — 2026-09-08](docs/screen-validation.md)
- [Responsive layout, hotspot and practice verification — 2026-09-12](docs/experience-validation.md)
- [Supabase account and administrator setup](docs/supabase-setup.md)
- [Published hotspot audit](docs/hotspot-audit/README.md)

## Content workflow

Add an independent scene and vocabulary record in `src/content.ts` or `src/specialist-content.ts`, not a generic word template. Shared calibrated geometry helpers live in `src/hotspots.ts`. Final images must be 1536×1024 and optimized WebP/AVIF under 500 KB. The optional image converter uses Pillow:

```sh
python -m pip install -r requirements-assets.txt
python scripts/prepare-scene.py supplied.png public/scenes/kitchen-01.webp
```

An opt-in hotspot editor (`?hotspotDebug=1`) displays names, bounds, centres and normalized clicks, previews draft geometry, and exports JSON. Normal production routes keep the overlay closed. Follow the asset brief and test both desktop and mobile before setting `published: true`.

## Progress and audio

Guests keep discoveries and complete challenge attempts locally under `explore-english-v2`, schemaVersion 2. Known legacy discoveries migrate safely; unreliable legacy scores do not. Restart asks for confirmation. When Supabase is configured, signed-in users load and save progress through a row-level-secured account record; the first sign-in offers a newest-safe merge with existing device progress. Account data is cleared from React state on sign-out and is never copied into the guest storage key.

Authentication and administrator statistics require the external Supabase setup described above. The static site uses only the public project URL and publishable key. Passwords are handled by Supabase Auth, user progress is protected by row-level security, and the administrator list is served by a JWT-protected Edge Function that checks a database allowlist.

Speech synthesis requests British English. Speech recognition is optional and browser-dependent; typed answers are always supported. Recordings are not stored.

Exploration supports **Next word / Enter**. Correct Find It selections advance after 600 ms; after three valid wrong hotspot choices, the learner can request a brief visual region hint and must still select the object. In Say It / Type It, Enter submits an unfinished answer; a separate Enter after success continues, even with focus in the input. Three valid typed or automatically judged speech errors reveal the same persistent word hint. Show answer clears and unlocks the field, and the learner must enter or say the correct word before continuing; the result remains Needs practice. Microphone errors never count as vocabulary mistakes. Speech recognition uses the browser's single-utterance end detection, submits each final transcript once, and has no manual Stop control. Retired development-scene records are removed by a silent one-time storage migration while valid progress and scores are retained.

Desktop learning, challenge and result layouts size themselves to the available viewport. Home shows all ready categories first and keeps the smaller Coming Soon directory below them; no directory pagination hides categories. Result history opens in a scrollable dialog. Small windows and enlarged text retain normal scrolling. Results choose one of five feedback bands from the exact first-answer ratio, with a separate empty state for missing records. Full challenges and weak-word practice remain separately identified and persisted. See the latest validation record for tested layouts and device boundaries.

## Docker

```sh
docker compose up --build
```

The production container serves port 8080. CI also verifies the Docker build.
