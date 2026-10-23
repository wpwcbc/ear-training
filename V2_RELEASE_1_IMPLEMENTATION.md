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
- Primary entries: M1 Audiation and M2 Recognition, each with Start and Customize.
  Both default to all 12 roots, maj7/m7/7 and Functional Root/Third/Fifth/Seventh.
  Their exercise identity stays fixed while all practice pools remain editable.
  Original Dominant Guide Tones and Major/Minor Third Audiation presets retain
  their IDs and user overrides in the secondary Saved presets section, alongside
  user presets and accepted Insights focus presets. This homepage priority follows
  the user's refinement request; it does not add a new exercise or alter the spec.
  Count defaults to 10; 0 means Unlimited, finite counts
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
- `npm run test:v2`: M1/M2 browser acceptance, storage-error cases and homepage/
  general-pool regression checks.
- `node tests/browser.mjs` and `node tests/browser-release3.mjs`: Legacy smoke.
- Existing external Edge/Playwright harness uses `PLAYWRIGHT_MODULE`.
- `QUALITY_AXE_PATH` enables WCAG A/AA axe checks on captured V2 states.
- `V2_SCREENSHOTS=1` writes desktop/mobile batches to temporary `eartrain-v2/`
  and `eartrain-v2-homepage/`.

Acceptance coverage is executable in `tests/v2.test.mjs` and
`tests/browser-v2.mjs`: exact/functional targets, balanced reproducibility,
12-choice uniqueness, locked first evidence, method/source isolation, M1 target
withholding and Unknown, retries/reveals, audio/interruption timing, results
review, fixed/unlimited, non-linear settings, auto-save/invalid draft handling,
restore and preset CRUD, local persistence, mobile reflow and source isolation.
`tests/browser-v2-homepage.mjs` verifies minimal primary entries, independent
pool edits in both exercises, altered/extended Exact targets, persistence and
Restore Default, saved focus isolation/reuse and stale audio cancellation.

## Homepage refinement and Release 1 audit (2026-10-23)

| Contract area | Coverage / outcome |
| --- | --- |
| General targets and theory | Both primary exercises use all four Functional roles, not Thirds/Guides only. Exact preserves all 18 spellings across 19 qualities, with 12 pitch-class-distinct answers. Explicit F#/Bb altered/extended interval checks supplement the full theory matrix. Missing Functional chord roles remain explicit validation errors. |
| Independent pools | Root edits retain quality/degree pools; quality edits retain root/degree pools; Exact edits retain roots/qualities. Browser checks configure both primary exercises independently, reload and restore defaults. |
| Playback | M1 initial/next chord context never exposes target before Done; M2 context-on/off retains target playback. Reference/replay accounting and interruption timing are tested. Stale session and results-review audio completions/errors are cancelled after leaving. |
| Scoring and retries | Locked first M2 answer/time, no early correct-answer leak, separate retries/reveals; binary self-rated M1, all response methods and Unknown. Correct-first valid timing only earns speed credit. |
| Sessions and persistence | Fixed/unlimited completion, untouched question omission, incremental local records, non-linear settings, autosave, invalid-draft protection, restore/CRUD and storage retry. No data migration. |
| Insights | Source/method/context/version/pool/exposure cohorts, filtered quality-degree evidence, first confusions and cautious low-sample summaries. Accepted focus is saved independently and matching focus configurations are reused; existing presets are never overwritten. |
| Accessibility and hierarchy | Two primary entries with only Start/Customize; secondary rows use restrained actions. Active navigation, keyboard focus and status/error cues. 320/390/768/1440px overflow checks, axe WCAG A/AA checks and bounded desktop/mobile screenshot inspection. |
| Legacy and scope | Legacy routes and storage remain separate; core and Release 3 browser smoke plus V1 record preservation checks. No Release 2 modes, dependencies, framework or account services. |

No unresolved Release 1 implementation gap was identified in this audit. Browser
audio checks verify scheduling/contracts, not human perception or physical-device
latency. The physical-device, Safari/iOS and human accessibility limits below
still apply.

## Verified result (2026-10-23)

- TypeScript build and 110 unit tests passed, including all 19 qualities across
  the full exact-degree vocabulary and reproducible balanced sampling.
- V2 browser acceptance passed, including starting from all three wizard steps,
  preset create/rename/delete, interrupted timing, first-reference audio failure,
  post-result replay, reload and preservation of a real-format Legacy session.
  The homepage regression suite passed both general exercises, independently
  edited pools, extended/altered targets, saved focus isolation, Restore Default
  and late audio rejection after stopping/leaving results.
- Eleven captured exercise/homepage states passed axe WCAG A/AA tag checks;
  bounded screenshot inspection plus one confirmation round checked the refined
  desktop and 390px mobile homepage. Overflow checks also cover 320px and 768px.
- Entry tests passed: desktop/mobile links open V2, Legacy retains seven modes
  and its history route.
- Legacy core and Release 3 browser suites passed (M1/M2, other existing modes,
  replay/pause, history, persistence and Insights). The full 14-suite Legacy
  browser battery was not rerun for this additive release.
- No changes were made to the confirmed project intent or implementation spec.
  Browser fixtures are synthetic; these checks are not a clinical, musical-
  transfer, physical-device or full accessibility certification.
