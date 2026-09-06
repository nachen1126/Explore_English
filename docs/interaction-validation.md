# Interaction acceptance — 2026-09-06

## Scope and diagnosis

Changes were made in the existing React project and keep its four real scenes, image assets, scene/word IDs, storage key and GitHub Pages workflow. No cloud speech provider, backend, key or paid dependency was added.

The deployed baseline was reproduced in the browser before editing:

- Home linked directly to Kitchen, Supermarket, Airport and Gym under headings, without separate category pages.
- Explore had no Next button; pressing Enter left discoveries unchanged.
- The five Find It questions required a manual Next button after every correct selection.
- Three valid wrong typed answers on Kitchen question 6 still displayed only retry feedback, with no persistent hint or reveal action.
- Speech code reused the first result without final/resultIndex checks, could create/start overlapping recognisers, constructed outside the start error handler, did not cancel pronunciation first, and combined most errors into generic feedback. These are code-level defects. They do **not** establish a single proven cause for every reported mobile failure.

## Implemented behavior

1. Home has eight bilingual category cards, with independent hash routes under `/category/:categoryId`. The seven requested examples are included; Health & Wellbeing retains the existing pharmacy/clinic/hospital plans. Sports contains Gym; Food contains Kitchen and Supermarket; Travel contains Airport. Thirty-eight topics are plans, of which only the four existing scenes are available. Empty categories say Coming soon; planned scenes have no fake images or learning links. Category returns Home; exploration returns its category and keeps the Home brand link.
2. Next word and Enter call the same discovery action, updating highlight, card, speech and stored discoveries. Enter works after clicking a hotspot too. Composition, repeats, held keys, editable fields, other controls and modals are guarded. The final word leaves the existing completion actions visible.
3. Find It correct answers lock the current question, show feedback, then advance once after 600 ms. Wrong answers stay on the same question. First-answer scoring is unchanged. Timers are cancelled on departure; the last Find question reaches Produce or the result for a final one-word practice.
4. Produce shares typed/speech error history. Its third valid wrong answer exposes a persistent Chinese/letter hint and Show answer. Revealing displays the correct word and pronunciation control, then enables manual continuation. Assisted completion remains weak and cannot regain a first-answer point. Hint/reveal state is question-local and persists on refresh.
5. Speech starts directly on click, detects the standard/prefixed API and HTTPS availability, cancels pronunciation, and owns one native session. It displays starting/listening/recognizing/transcript/error states and offers stop, cancel, retry and typed input. Only a valid final transcript can be submitted with Check answer. Recording IDs and session identity prevent duplicate counting and stale callbacks. Permission, silence, empty text, microphone, service and network faults never become answer records. Phase timeouts and navigation/pagehide/visibility cleanup prevent stranded recording state.

## Automated acceptance

The suites cover the following beyond compilation:

| Acceptance | Evidence |
|---|---|
| Category hierarchy, routes, back/forward and refresh | App integration plus real browser navigation/reload |
| One Enter means one discovery; highlight/card/speech agree | Physical-key guard and userEvent tests, including focused Next and focused hotspot |
| IME/holds/modal isolation and listener cleanup | Integration tests with composition, repeat, keyup, modal and route remount |
| Input Enter only submits | Full App test; Produce stays on the current question after correct submission |
| Mixed typing + speech + typing third error | Real hook with native-event fixture, shared persisted answer history |
| Faults/blank text are not wrong vocabulary answers | Hook and App tests across permission, silence, network, capture and service faults |
| Duplicate speech result cannot count twice | Final/resultIndex, stale callback and reducer recognition-ID tests |
| Hint, reveal, reset and unchanged first-answer score | Persist/reload, reveal, correct retry and next-question tests |
| Find correct 600 ms; wrong stays | Fake clock at 599/600 ms and real browser flow |
| Double click cannot score or advance twice | Disabled controls, reducer guards and question-bound continuation tests |
| Final Find question enters results | One-word weak practice integration test |
| Exit cleans timers/recorders | Timer cancellation, unmount, pagehide, visibility and stale-result tests |
| Old progress remains readable | Unchanged v2 round trip, old v1 discoveries and real browser retained discoveries |

## Actual browser results

Tested with real UI clicks, keys and reloads in the desktop Codex in-app browser:

- Home → Sports → Gym, category reload, scene reload, back and forward preserved route and discoveries.
- Clicking the exercise mat then Enter selected dumbbell. Ten Enter presses after reload ended at clock, 10/10 discovered, with Next disabled and Start Challenge available.
- An incorrect Find selection stayed on the same target. A correct double click locked all hotspots, then advanced only once. Five Find questions automatically reached Produce.
- Input Enter submitted without navigating. The native speech interface started, then returned an **audio-capture** error in this environment. The UI displayed the microphone/device explanation and retry; after the second valid wrong answer there was still no hint. The third valid wrong answer showed the hint. No successful actual recording is claimed.
- The hint survived refresh. Show answer revealed weight bench; Next cleared hint/input. The completed Gym attempt, after result reload, showed **8/10, 80%, Remembered 8, Needs practice 2: book and weight bench**. Book had a wrong first Find answer; weight bench used the hint/reveal. Neither regained a point.
- Home, Sports, Food, Animals and Gym exploration were checked at viewport overrides **320, 390, 768 and 1280 px**: all 20 combinations had `scrollWidth === clientWidth`, with no horizontal overflow. Desktop, 320 px Home, 390 px category and 390 px hint/reveal screenshots were visually reviewed. Responsive resizing is layout testing only.
- No application console errors were recorded during the inspected flow. Temporary viewport overrides were reset.
- The built production preview was checked separately: category → Gym → Enter opened exercise mat, saved progress survived reload, and the development hotspot editor had zero matches.

## Mobile voice: tested boundary and pending steps

**iPhone Safari and Android Chrome have not been tested on physical devices here.** No real phone or usable recording device was available. Standard and `webkitSpeechRecognition` API behavior was tested with controlled native-event fixtures; desktop resizing does not validate microphone permission, OS audio capture or remote recognition on phones.

On each physical device, record its device model, OS and browser version, and test the deployed HTTPS URL directly in Safari or Chrome:

1. Enter an available category and scene, finish exploration, then reach What is this?. Tap Use microphone once. Accept the site microphone prompt when requested. Confirm the UI progresses from starting to listening.
2. Say the English word; wait or tap Stop recording. Confirm recognizing, the visible transcript, editable input and Check answer. Check a correct transcript and continue manually; repeat with a deliberately incorrect word.
3. Deny permission once, restore it in the site's browser settings and retry. Test silence, an unavailable microphone and loss of connection. Each must give actionable feedback with typed input still working and without increasing the vocabulary error count.
4. Type one wrong answer, submit one wrong recording, then type another wrong answer. Confirm the third valid error reveals the hint. Show answer, continue, and confirm the next question starts without the hint.
5. Rapidly tap the microphone, stop and retry; switch apps/tabs or return Home during recording. Confirm the recorder stops, late results do not change a later question, and a fresh recording still starts on re-entry.
6. On Safari service errors, check the device's Siri/Dictation and microphone settings. If the browser has no speech API, verify its explicit unavailable explanation and complete the same question by typing. Also test the direct browser before separately testing any installed home-screen/in-app container.

Technical references used during diagnosis: [WebKit's Safari 14.1 speech-recognition introduction](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/), [SpeechRecognition resultIndex](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionEvent/resultIndex), [final results](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionResult/isFinal), and [recognition error types](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionErrorEvent/error). API exposure alone is not evidence that a device's recognition service will succeed.

## Release checks

Completed locally in order on Windows with Node 24.19.0:

| Command | Result |
|---|---|
| `npm ci` | 203 packages installed; 0 audit vulnerabilities |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed, strict/noUnused including test files |
| `npm test` | **105 tests passed across 5 files** |
| `npm run build` | Passed; JS 292.38 KB (90.48 KB gzip), CSS 18.21 KB (4.43 KB gzip) |

The final suite includes 19 new interaction regressions and 33 speech lifecycle tests. The Vite server was stopped before npm ci to release Windows native-module file locks. The official npm CLI was invoked through Node because this environment has no npm launcher on PATH. The exact GitHub Actions deployment is reported with the delivered commit. Existing workflows deploy the validated build on push to main.
