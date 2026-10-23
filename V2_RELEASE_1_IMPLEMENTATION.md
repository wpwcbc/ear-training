# V2 Release 1 Implementation

Contract: [V2_RELEASE_1_SPEC.md](V2_RELEASE_1_SPEC.md), subordinate to
[jazz-ear-lab.md](jazz-ear-lab.md). The pre-implementation checkpoint is
`v2-release-1-checkpoint` at `a0997a4` (the specification commit).

## Entry and reuse

- Entry: `jazz-ear-lab-v2/index.html`, served at `/jazz-ear-lab-v2/`.
- `src/v2/model.ts`: narrow configuration, balanced stream, immutable first
  outcomes, self-rating validation, storage keys, cohorts and component metrics.
- `src/v2/app.ts`: preset, configuration, practice, results and Insights flow.
- Reused `src/jazz/theory.ts`: parsing, degrees, chord tones, recognition mapping,
  pitch classes and playable register. `recognition.ts` was inspected but not
  imported because its public API depends on the full Legacy Config.
- Added `AudioEngine.playSingle` in `src/jazz/audio.ts`: the existing voice,
  synthesis, readiness and cancellation primitives without the all-mode Config.
  Existing Legacy scheduling methods are unchanged.
- Model/lifecycle seed and snapshot ideas and analytics evidence boundaries were
  inspected; no Legacy controllers, storage or Insights UI are imported by V2.
- Uses existing TypeScript/static tooling and design tokens; no new dependency,
  server API, account, telemetry, migration or Release 2 exercise.

## Explicit engineering defaults

- M2 answers submit on activating one native degree button (keyboard or pointer).
  Twelve unique pitch classes are represented. Exact target spelling replaces
  its canonical synonym for that question, never adding an enharmonic duplicate.
- Functional Root/Third/Fifth/Seventh use actual chord tones. An absent role
  (e.g. Third over sus4 or Seventh over a triad) blocks Start with a message;
  the app does not silently discard or remap that selection.
- Two editable defaults: Dominant Guide Tones in all keys (M2), and Major/Minor
  Third Audiation (M1). Count defaults to 10; 0 means Unlimited, finite counts
  are integers 1-200. Fixed sessions show results immediately after the final
  resolved question; references remain replayable in Question review.
- Target register uses existing `inRange(pc, 60, 83)`; fixed triangle synth,
  chord tones at the existing theory helper's register. Volume is adjustable.
- Each shuffled pair bag contains every feasible quality/resolved-degree pair
  once; roots use a separate shuffled bag. Bags refill lazily for Unlimited.
  Small finite sessions do not claim exhaustive cross-product coverage.
- Exposure means first recorded V2 presentation of a chord symbol/MIDI pair,
  not proof of novel melodic hearing. A separate bounded-by-material ledger
  retains exposure even when an unanswered question is omitted from results.
  Equivalent exact spellings and cross-exercise repeats are conservative repeats.
- Ten graded observations per quality/degree cell is the minimum for descriptive
  highest/lowest patterns, not a significance test, pass mark or adaptive rule.
  Smaller cells remain inspectable and manually configurable.

## Timing and evidence

Timing policy: `v2-answer-ready-1`, monotonic `performance.now()`.

- Audio is scheduled with the existing engine after AudioContext resume.
  M2 target onset is scheduled 120ms after playback dispatch (40ms scheduling
  lead + 80ms target lead); answer-ready runs after that delay and enables
  submission. Latency starts at this answer-ready callback, not loading or the
  beginning of the chord. This is the adopted answer-ready boundary, not a
  hardware-calibrated measurement of speaker onset.
- M1 waits 900ms for the initial chord presentation; context-off M1 becomes ready
  when its visual prompt is presented. Done locks elapsed time before reference.
- Replays do not reset the original clock. Pre-first and post-first/reference
  replay counters are independent. M2 retries append educational answers only.
  Reference playback failure after M1 Done does not invalidate locked time.
- Visibility loss before first completion invalidates timing rather than guessing
  background time. Audio failure before first completion also invalidates timing;
  retry allows practice but cannot resurrect a valid latency for that question.
- M2 Reveal includes another target playback and counts as a post-first replay.
  M1's first reference after Done is not a replay of an already presented target.
  Invalid retry times remain null, never fabricated zero-duration answers.
- Accuracy uses graded first outcomes only; unfinished records are unassessed.
  Stopping on a new unanswered question does not count it as an attempt/wrong
  answer. Completed and partial records are persisted incrementally.
- Correct-first medians include valid timing only, with sample count. Wrong times
  are inspectable as descriptive evidence, never speed credit.
- Across-session cohorts separate exercise, grading source, method, context,
  timing/generator/answer-policy versions, pools, degree mode and exposure. Root
  and quality filters narrow those cohorts. No mixed-source proficiency score.

## Data safety and limits

Only `jazzEarLab:v2:presets`, `sessions`, `last`, and `exposures` are written.
No Legacy keys or IndexedDB stores are migrated or modified. Valid edits update
the same preset; invalid drafts remain in memory without replacing the last
valid saved config. Built-in overrides can be restored; user presets can be
created, renamed and deleted without deleting session history.

Storage errors are visible and retryable, retain in-memory records, and trigger
an unsaved-data warning before leaving. Malformed persisted data is preserved
and reported rather than silently reset. This is browser-local persistence,
not a transactional multi-tab collaboration system or external backup service.
Reload retains presets and saved sessions; interrupted sessions are reviewable,
not resumable mid-question (not required by Release 1).

Microphone grading, hardware latency calibration, real Safari/iOS and human
speaker/screen-reader testing are not implemented or claimed. M1 is always
self-reported; keyboard/touch choice scores do not prove bass execution or
live improvisation. No Release 2 features were added.

## Verification commands

- `npm test`: TypeScript build and Legacy plus V2 unit checks.
- `npm run test:v2`: M1/M2 browser acceptance and storage-error cases.
- `node tests/browser.mjs` and `node tests/browser-release3.mjs`: Legacy smoke.
- Existing external Edge/Playwright harness uses `PLAYWRIGHT_MODULE`.
- `QUALITY_AXE_PATH` enables WCAG A/AA axe checks on captured V2 states.
- `V2_SCREENSHOTS=1` writes the desktop/mobile batch to temporary `eartrain-v2/`.

Acceptance coverage is executable in `tests/v2.test.mjs` and
`tests/browser-v2.mjs`: exact/functional targets, balanced reproducibility,
12-choice uniqueness, locked first evidence, method/source isolation, M1 target
withholding and Unknown, retries/reveals, audio/interruption timing, results
review, fixed/unlimited, non-linear settings, auto-save/invalid draft handling,
restore and preset CRUD, local persistence, mobile reflow and source isolation.

## Verified result (2026-10-23)

- TypeScript build and 109 unit tests passed, including all 19 qualities across
  the full exact-degree vocabulary and reproducible balanced sampling.
- V2 browser acceptance passed, including starting from all three wizard steps,
  preset create/rename/delete, interrupted timing, first-reference audio failure,
  post-result replay, reload and preservation of a real-format Legacy session.
- Seven desktop/mobile states passed axe WCAG A/AA tag checks; two bounded
  screenshot inspection rounds checked desktop and 390px mobile presentation.
- Legacy core and Release 3 browser suites passed (M1/M2, other existing modes,
  replay/pause, history, persistence and Insights). The full 14-suite Legacy
  browser battery was not rerun for this additive release.
- No changes were made to the confirmed project intent or implementation spec.
  Browser fixtures are synthetic; these checks are not a clinical, musical-
  transfer, physical-device or full accessibility certification.
