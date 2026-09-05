# Refactor audit — 2026-09-05

Audited baseline: `f1620a3` on main, with a clean worktree.

| Area | Baseline finding | Replacement |
|---|---|---|
| Routing | Manual hash parsing and multiple pages in one compressed component | HashRouter, focused pages and explicit unavailable-route states |
| Categories | Six peer themes, Café treated as a top-level category | Six categories / 28 topics; direct scene access on Home |
| Content | One placeholder ten-word array applied to most themes; all IPA built as /word/ | Independent audited scene records and sourced UK IPA; unverified phrases hidden |
| Scene identity | Two IDs per topic reuse images, words and coordinates | Only four complete development scenes, no fake Scene 2 |
| Images | Eager imports of large PNGs, hash-based getter replaces Underwater image | Scene-owned asset paths; WebP and lazy thumbnails |
| Geometry | 16:10 desktop, 4:3 phone, object-fit:cover; min-sized/skewed hotspots | Intrinsic-ratio image/overlay box and normalized geometry |
| Discovery | Route effect clears explored; discovered hotspots do nothing | Persistent reducer, replay/reopen, confirmed scene-local reset |
| Scoring | First five words twice; render-time navigation; repeated attempts gain points | Stored all-word question sequence, first-answer-only scoring |
| Microphone | Global click interception and direct input/button updates | Typed React input and lifecycle-managed optional speech hook |
| Results | MutationObserver/300ms setInterval patches DOM score | Saved attempt-derived scores, exact remembered and weak IDs |
| Recommendation | Can return current or duplicate scene; missing candidate silently ignored | Same-topic distinct-published filtering and explicit completion outcome |
| Storage | JSON.parse without shape validation; errors swallowed | Versioned, validated, recoverable state and visible save-failure notice |
| Tooling | latest versions, no lock, lint rules disabled, npm install in CI | Exact npm versions/lock, active lint rules, npm ci in CI/Pages/Docker |

Removed `src/challenge-tracker.ts`, `src/scene-images.css`, placeholder content generation and the old tests that expected a fabricated Underwater Scene 2. Replaced the old `main.tsx`, data, logic and styling instead of appending repair scripts.

No new illustrations were generated. Kitchen / Airport / Gym / Supermarket were inspected individually and calibrated against their actual pictures. Café and both Underwater images remain source assets only, with no published learning route. Other planned scenes are unpublished.

During independent review, fixed: loss of subsequent same-topic scenes in catalog assembly; deliberate speech cancellation falsely appearing as failure; large Gym mat highlights intercepting the dumbbell; late recognition callbacks after answer submission; bookmarked review pages bypassing exploration requirements.
