# Explore English

Learn useful English through illustrated places: choose a scene, discover every object, then complete a Find It / Say It or Type It challenge and review your first-answer result.

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

Kitchen, Supermarket, Airport and Gym each have 10 independently audited words/hotspots. They use **clearly marked development artwork**. Final artwork has not been supplied; development image proportions are preserved without cropping. All remaining planned topics are unpublished. There is no duplicate Scene 2.

- [Full image briefs and missing asset list](docs/scene-asset-spec.md)
- [Architecture, data model and storage migration](docs/architecture.md)
- [Baseline audit and removed implementations](docs/refactor-audit.md)
- [Acceptance and browser verification](docs/validation.md)

## Content workflow

Add an independent scene and vocabulary record in `src/content.ts`, not a generic word template. Final images must be 1536×1024 and optimized WebP/AVIF under 500 KB. The optional image converter uses Pillow:

```sh
python -m pip install -r requirements-assets.txt
python scripts/prepare-scene.py supplied.png public/scenes/kitchen-01.webp
```

A development-only hotspot editor displays names, bounds, centres and normalized clicks, previews draft geometry, and exports JSON. It is excluded from production. Follow the asset brief before setting published to true.

## Progress and audio

React state persists discoveries and complete challenge attempts under `explore-english-v2`, schemaVersion 2. Known legacy discoveries migrate safely; unreliable legacy scores do not. Restart asks for confirmation. Progress remains local to this browser.

Speech synthesis requests British English. Speech recognition is optional and browser-dependent; typed answers are always supported. Recordings are not stored.

## Docker

```sh
docker compose up --build
```

The production container serves port 8080. CI also verifies the Docker build.
