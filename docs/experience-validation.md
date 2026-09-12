# Responsive layout, hotspot and practice verification — 2026-09-12

## Scope

This pass keeps the `explore-english-v2` storage key, schema version, final scene IDs and first-answer scoring rule. It publishes only the two scenes with final illustrated assets, retains removed IDs as safe unpublished catalog records, changes reveal confirmation and simplifies automatic speech recognition without replacing the existing application or routes.

## Content and hotspot audit

- Kitchen · Cooking: 10 picture-specific words and 15 selectable regions.
- Airport · Departures: 10 picture-specific words and 15 selectable regions.
- Original Kitchen, Airport, Gym and Supermarket: retained as unpublished compatibility records. Their routes show an unavailable page and their stored progress is ignored without breaking the application.
- The production picture has one intrinsic-ratio frame shared by the image, hotspot buttons and visible target outline. `object-fit: contain` is used throughout; no scene image is cropped or stretched.
- Explore mode includes a full-size picture dialog plus keyboard/small-screen object access. Challenge mode retains text alternatives.

Every calibrated sample point was checked through browser hit testing and physical clicks. This included three original Kitchen plants, separate table surfaces and legs, cabinet sections, suitcase handles, documents, fruit, bottles, jars and the Gym bag handle. The generated production assets were also visually inspected at their original 1536 × 1024 resolution before calibration.

## Desktop layout matrix

The production build was measured at 100% zoom in 1366 × 768, 1440 × 900 and 1920 × 1080 viewports. The following states kept their main controls inside the viewport with no document overflow: Home, both published Explore scenes (empty, selected and complete), Find ready/wrong, Produce empty/wrong/correct/third-error hint/revealed/retyped, full results and weak-practice results. Image and overlay edge deviation was 0 px; aspect-ratio rounding error stayed below 0.00002.

The Home directory shows the two ready categories first, including thumbnail, published-scene count and aggregate progress. Six smaller Coming Soon categories remain visible below. Continue Learning ignores removed scene records and chooses the most recently visited published scene. No category pagination or hidden overflow is used. The only main heading is **Choose your world.**

## Keyboard and scoring flow

A complete two-question weak-practice flow was exercised with real clicks and keyboard input:

1. A correct Find selection locked the question and moved to Produce after the 600 ms feedback interval.
2. The desktop Produce input received focus automatically.
3. The first Enter submitted `sink` and left the same resolved question visible.
4. A second Enter, while focus remained in the input, opened the result.
5. The result identified itself as **Weak word practice result**, showed 2/2 and the weak-specific wording.
6. After reload, **View full challenge** returned to the earlier immutable 8/10 full result.

A separate complete ten-question flow verified the same two-Enter behaviour between every Produce question and on the final question. Three valid mixed-answer errors revealed the persistent Chinese/letter hint; correcting afterwards did not restore the first-answer point. Existing automated cases cover IME composition, held/repeated Enter, focused-button default activation, speech-result deduplication, service faults and timer/listener cleanup.

After Show answer, the answer field is cleared, becomes editable and regains focus on a fine-pointer desktop. Next remains absent until the learner enters the correct word. The saved question retains its original wrong answers, `revealedAt` and assisted flag, so the result remains Needs practice after reload.

Speech uses one click and `continuous = false`. While the native service is starting, listening or processing, the control is disabled and never says Stop recording. `speechend`/`audioend` moves the UI to **Speech detected… Recognising…** and the final result fills the editable answer without submitting it. Silence and processing have separate retryable timeouts; failures never create answer records.

## Mobile and short-landscape layout

Desktop-browser viewport simulations were measured at 320 × 568, 375 × 812, 390 × 844, 430 × 932 and 844 × 390. These are responsive-browser checks, not physical phone tests.

- The picture occupied the full available content width and retained its source ratio in every size.
- The document had no horizontal overflow. Vertical overflow stayed enabled and content followed a natural image-then-controls order.
- At 390 × 844, the microwave region was directly clickable and opened its word card.
- At 844 × 390, the long spatula polygon remained directly clickable after natural scrolling.
- Automated touch-media tests verify that Produce does not force input focus on coarse/no-hover pointers.

Physical iPhone Safari, Android Chrome, their software keyboards, real microphone permission prompts and OS text enlargement were not available in this environment. Typed-answer fallback and the existing speech support/error states remain covered by automated tests; no claim of physical-device speech validation is made.

## Automated verification

The Vitest suite contains 157 passing tests across seven files. Coverage includes reveal/retype/focus and preserved weak scoring, native automatic speech completion without a Stop control, silence and service failure recovery, removed-scene routes and storage, desktop focus and continuous keyboard input, touch-pointer focus suppression, hidden Chinese until three valid errors, multi-region hotspot discovery, recommendation priority, result reload consistency, home ordering and final-asset uniqueness.
