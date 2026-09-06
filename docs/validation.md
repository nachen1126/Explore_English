# Validation record — 2026-09-05

This is the historical refactor validation. For the current category, Enter, hint, automatic Find and speech changes, see [the 2026-09-06 validation record](interaction-validation.md).

## Local required checks

Completed in the requested order with exit code 0:

| Command | Result |
|---|---|
| `npm ci` | 203 packages installed; audit reported 0 vulnerabilities |
| `npm run lint` | Passed, without disabled-rule workarounds |
| `npm run typecheck` | Passed with strict/noUnused checks, including tests |
| `npm test` | **55 tests passed across 4 files** |
| `npm run build` | Passed; Vite production bundle generated |

Environment: Windows, Node 24.19.0. This machine supplies Node without a normal npm launcher, so the official npm 12.0.2 CLI was invoked with Node; package scripts and install operations are unchanged. An initial npm ci attempt met a Windows file lock held by the preview server. Stopping that server released it, then the entire chain above passed in order.

Build output: JavaScript 280,969 bytes (86.79 KB gzip), CSS 15,514 bytes (3.95 KB gzip), HTML 0.67 KB. Four scene images are 97,226–158,580 bytes; thumbnails 15,908–33,616 bytes. Full PNG source images are not shipped in the build.

Production JS was checked for the development editor labels and none are present. No MutationObserver, setInterval, hash-dependent image replacement, or DOM score/input patching remains in application source.

## Required acceptance coverage

| Requirement | Evidence |
|---|---|
| 1. Re-entering does not reset exploration | reducer + React Home/re-entry test; browser |
| 2. Reload keeps discoveries | storage round trip + React remount + real browser reload |
| 3. Discovered objects replay and reopen | React speech spy and word-card test; real repeated clicks |
| 4. All ten words enter a challenge | every published scene set test + full React and browser journeys |
| 5. First answer alone scores | reducer and complete UI challenge |
| 6. Retry cannot regain lost points | deliberately wrong first answer followed by success: 9/10 |
| 7. Result survives reload | persisted attempt + React remount + real browser reload |
| 8. Weak words are exact | failed vocabulary ID assertions and visible clock-only browser weak list |
| 9. Continue excludes current/duplicate scenes | current, unpublished, duplicate-image and other-topic fixtures |
| 10. No next scene has an explicit outcome | React and browser topic-completion message |
| 11. Image and hotspot proportions match | all hotspot unit checks + 16 real scene/viewport combinations |
| 12. Invalid storage does not blank the app | malformed, partial, future-version and denied/quota storage tests |
| 13. Unpublished scenes stay off Home | only four scene links; direct Café URL blocked |
| 14. No fake displayed IPA | explicit Cambridge source and non-placeholder checks on all displayed IPA |

Additional tests cover complete challenge order persistence, stale/double submissions, all-words completion actions, confirmed reset, image retry, exact weak-only practice, unchanged historic scores, invalid routes, skip navigation, same-topic multi-scene assembly, and legacy word-ID migration.

Speech tests cover unsupported browsers, Listening/Stop/Processing/Success/Error, permission failure, no speech, timeout, cleanup, late callback cancellation and deliberate pronunciation interruption.

## Real browser verification

Performed in the Codex in-app browser using actual clicks and reloads.

- Home shows Everyday Life / Food & Shopping / Travel & Transport / Health & Fitness groups and direct scene cards. Café and unprepared topics are absent.
- Kitchen discovery was replayed and reloaded, then all ten objects were explored.
- One real challenge covered clock, plant, chair, table, bag, bottle, door, window, light and book exactly once. The first clock answer was deliberately wrong, followed by a correct retry. The five typed answers used articles, uppercase and punctuation.
- Result after reload: **9/10, 90%, Remembered 9, Needs practice 1 (clock)**.
- Continue Exploring displayed the explicit available-Kitchen-scenes completion message.
- Gym mat hint did not intercept the dumbbell; the dumbbell word card opened correctly.
- All four scenes were measured at **320, 390, 768 and 1280 px**. Each image matched its hotspot layer exactly, used contain, and had no horizontal overflow. Maximum measured image-ratio rounding error was below 0.000035. Kitchen hotspot coordinate deviation was below 0.000047.
- Mobile and desktop screenshots were visually reviewed. Small objects have an alternate keyboard/word-list entry.
- No application console errors appeared during the verified flow.

## Boundaries

Final illustrations have not been supplied. The four current scenes are published only as clearly labelled development artwork; Kitchen and Gym preserve their non-final original proportions. All 28 formal first-scene image briefs remain in [scene-asset-spec.md](scene-asset-spec.md).

Speech states were tested with controlled recogniser events, not a real microphone recording or separate Safari/Firefox devices. Typed answers were exercised end to end in the real browser.

Deployment is verified separately against the actual pushed commit and GitHub Actions run URLs in the delivery report.

Production preview was also reloaded and inspected: the hotspot editor had zero visible matches, and clicking the Supermarket orange opened its sourced IPA/meaning/example card normally.
