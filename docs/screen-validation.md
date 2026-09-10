# Single-screen and keyboard acceptance — 2026-09-08

## Baseline reproduced

The baseline was commit `92dcf22`, inspected in source and on the deployed website before editing. No learning-state keys, scene/word IDs, first-answer scoring rules or deployment workflows were replaced.

- `ResultPage.tsx` rendered **A little more familiar.** and its description unconditionally. This was fixed copy, not a broken score branch.
- In a 1366 × 768 browser viewport, Home had a scroll height of 1708 px, completed Kitchen exploration 1462 px, and a correct Produce question with its hint 1451 px. The Next button bottom was approximately 1023 px, below the viewport.
- Correct input submission disabled the input. A second Enter still left Kitchen at question 6, with Next only responding to a click.
- The shared Layout prefixed every top navigation label with a left arrow, including Home.

## Changes

1. A session-scoped Produce keyboard handler observes the question state before form submission. An unfinished input Enter submits; the same event cannot advance after the answer becomes correct. A later Enter invokes the exact Next callback after correctness or answer reveal, including while the input retains focus. Read-only resolved inputs preserve focus. Key repeat, held keys, composition, modal dialogs, native button activation and listener cleanup are guarded. Find It retains its 600 ms automatic continuation.
2. Main content uses the height remaining after navigation/footer/notices. Compact headings, spacing, forms and feedback leave actions visible. The picture is fitted by both available width and height and keeps its intrinsic ratio and hotspot coordinate frame. No page overflow is hidden. Home/categories/review/phone weak-word lists have reachable pages or group switches; all groups/pages survive hash-route refresh. Long records and secondary picture alternatives open in accessible dialogs.
3. `resultFeedback(score, total)` uses the exact ratio with boundaries at 40%, 60%, 80% and 100%. The five titles and descriptions match the request. Perfect feedback requires all first answers correct; retries, hints and reveals cannot increase the original score. Result copy, totals and weak words derive from one attempt. No valid result gives an empty state. Non-perfect displayed percentages cannot round up to 100%.
4. The shared top navigation omits the prefix when the destination is Home. Its target and styling remain intact. Back-to-scene/category and Next/Continue arrows remain.

## Automated coverage

The existing regression suites remain, with their expectations updated for intentional pagination and the Home label. The new `screen-flow.test.tsx` suite includes:

- First Enter submits, input retains focus, second Enter advances.
- Wrong Enter retries, correct held Enter stays put, IME and keyCode 229 are ignored.
- Focused Next does not also fire its native default action; duplicate keydown cannot skip questions.
- Show answer followed by Enter completes a final question without earning a mastery point.
- Clean remounts, last-question completion and keyboard-accessible result dialogs.
- Exact and just-below score thresholds, variable totals (including 1 and 7), 999/1000 remaining non-perfect, invalid totals and no-record empty state.
- Title, description, score and weak count agree after result reload in all five bands.
- Every category remains reachable, planned Travel pages are accessible, mobile page sizes respond to the viewport, and top Home alone loses its arrow.

All earlier tests for first-answer scoring, 600 ms Find advancement, repeated selections, speech faults/deduplication, stale callbacks, persisted hints, exploration Enter and old storage compatibility continue to run.

## Actual desktop browser verification

Performed with real clicks, input, Enter and reloads in the desktop in-app browser against the production build at default zoom. No browser state or fake score was injected.

**75 checks = 25 pages/states × three viewport sizes: 1366 × 768, 1440 × 900, 1920 × 1080.** Every check had document scroll height/width equal to the viewport; no visible main button or input extended outside the viewport.

| Group | Pages/states checked at all three sizes |
|---|---|
| Explore | Selected word and completion in Gym; Kitchen, Airport and Supermarket |
| Challenge | Find ready/wrong; Produce empty/wrong/correct/third-error hint/revealed answer |
| Results | 100%, 80%, 60%, 40%, 0%, each after reload |
| Directory | Home page 1 and 2; available Travel; planned Travel page 1 and 2; Food; Animals |
| Review | Gym review cards with pagination |

- Five actual full Gym attempts produced the five score bands. Wrong first answers were retried correctly; one 40% attempt used third-error hint/reveal. The displayed titles matched their own records and did not regain points.
- The correct Produce input remained focused at question 6 after submission, with Next visible. A second Enter advanced to question 7. Final Enter opened results. The five preceding Find questions still advanced automatically.
- The zero-score result showed all ten weak words alongside score and actions. View this attempt opened all ten entries in a dialog; its content was scrollable, while its close button stayed visible. Escape closed it and restored focus.
- Home’s second page and Travel’s second plan page were reached by visible controls and retained after reload.
- Image/overlay edge deviation was 0 px in the measured states. Maximum image aspect-ratio rounding error was below 0.00002. Screenshots of Home, learning completion, correct/hint challenge, perfect/zero results, review cards and the history dialog were visually checked.

## Phone-sized and accessibility fallback checks

These are desktop browser viewport checks, **not physical iPhone/Android tests**.

- At 390 × 844, Home, category pages, the paginated zero-score result and the third-error hint fit without document scrolling. Check answer and Show answer bottoms were approximately 506 and 706 px. After reveal, Next remained visible at approximately 798 px; the remaining footer/content could scroll.
- At 390 × 844, completed exploration retained its core Start Challenge action within the viewport, with secondary content below available by scrolling.
- At 320 × 568, longer content intentionally scrolls. Every checked page had no horizontal overflow, and vertical overflow remained visible rather than clipped. Modal records have their own scroll region.
- Phone software keyboards, physical-device input methods and OS/browser text enlargement were not tested. Natural-flow fallbacks and em-based desktop constraints are provided for smaller available space or larger text. No claim of physical phone or speech-device verification is made in this change.

## Release verification

Final required commands passed in order on Windows, Node 24.19.0:

| Command | Result |
|---|---|
| `npm ci` | Passed; 203 packages installed, 0 audit vulnerabilities |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed, including strict checks on tests |
| `npm test` | **138 tests passed across 6 files**, including 33 new tests |
| `npm run build` | Passed; JS 298.90 KB (92.31 KB gzip), CSS 29.76 KB (6.37 KB gzip) |

The preview server was stopped before npm ci to avoid Windows file locks. The official npm CLI was invoked through Node because no npm launcher is on PATH. The commit, CI and existing GitHub Pages deployment outcome are included in the delivery report. The final online smoke check verifies the newly deployed bundle, hierarchy and keyboard flow with existing stored progress.
