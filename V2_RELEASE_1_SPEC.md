# Jazz Ear Lab V2 — Release 1 Specification

> **Status:** Implementation-ready draft; product decisions confirmed through GrillMe Q13–Q41, with explicitly marked engineering defaults.
> **Date:** 2026-10-23
> **Repository:** `wpwcbc/ear-training`
> **Authority:** [`jazz-ear-lab.md`](jazz-ear-lab.md) is the higher-level, confirmed project intent. If this specification conflicts with it, stop and surface the conflict rather than silently changing the intent.
> **Purpose:** Define a small, testable V2 Release 1 around **single-chord Audiation (M1)** and **single-chord Recognition (M2)**. This is a specification, **not authorization to rewrite the whole repository**.

## 1. Outcome and delivery strategy

Build an independent **Jazz Ear Lab V2** experience in the **existing repository**, using the least new code that meets the requirements. **Legacy M1–M7 remains functional and frozen for feature expansion**, except necessary bug fixes.

Release 1 proves the complete loop:

**Choose preset → optionally customize → practice M1/M2 → record first response and learning activity → review results → see honest Insights → repeat.**

The musical outcome is reliable chord-degree hearing and audiation, with **accuracy first and correct-response speed second**, as foundations for later Continuous Harmonic Hearing.

### Explicit Release 1 boundaries

**In scope**
- Single random chord M1 Audiation and M2 Recognition, preserved as indispensable fundamentals rather than disposable stepping-stones.
- Shared music-theory and audio primitives where suitable, independent V2 exercise flow and storage.
- Targeted pools, functional/exact degrees, balanced random questions, visible harmony, optional chord-context playback.
- M1 response-method tagging; M2 first-answer locking and educational retries.
- Presets, quick start, concise non-linear configuration wizard.
- Fixed-length and unlimited practice.
- Basic, evidence-aware Insights using accuracy, replay count, response time, and degree confusions.
- Working keyboard/touch interactions, accessible feedback, and the smallest useful automated tests.

**Not in Release 1**
- Progression Recognition / Dictation or Guided Progression Audiation; these are **Release 2 priorities**, not discarded ideas.
- Melody generation styles, curated phrases, phrase transcription, interval/phrase context scoring, or the future M3–M7 redesign.
- Audio/microphone pitch grading, automatic identification of a sung/played pitch, bass fingering analysis, MIDI integration.
- Separate Assessment/Diagnostic Mode, automatic difficulty progression, weakness-weighted random sampling, or a composite proficiency score.
- Automatic Legacy data migration, account/login, cloud sync, AI-generated coaching, server infrastructure, framework migration, or comprehensive historical dashboard parity.
- Recreating every setting from the old `Config` or rebuilding the whole Legacy app.

## 2. Architecture and reuse constraints

1. Retain the same repository, build system and static/browser-local delivery model unless a concrete blocker is demonstrated.
2. Implement a **separate V2 route/entry and isolated practice flow**. The exact route and folder names are implementation choices; avoid rewriting Legacy M1–M7 screens merely to host V2.
3. Reuse existing implementations **only after verifying that their actual contract matches V2**:
   - `src/jazz/theory.ts` and underlying `src/core/theory.ts`: chord parsing, pitch classes, spelling, degree mapping.
   - `src/jazz/audio.ts`: audio scheduling and context/target playback, extending only where required.
   - `src/jazz/recognition.ts`: chord-aware answer choices, after checking the new answer-set rules.
   - `src/jazz/model.ts`: applicable generation ideas, not its all-mode configuration wholesale.
   - `src/jazz/lifecycle.ts`: suitable session/seed patterns; do not reuse V1 storage keys.
   - `src/jazz/analytics/*`: reference evidence semantics, but avoid importing the entire old Insights UI or conflating grading sources.
4. In particular, **do not make V2 depend on the entire V1 `Config`** (which includes M3–M7 settings) or embed V2 into the large Legacy `app.ts` / `flow.ts` UI controllers. Prefer a small V2-specific settings/attempt model and thin reuse/adaptation of stable functions.
5. Prefer TypeScript, standard browser APIs, existing tooling and dependencies; no new framework for this release.
6. Keep Legacy files and `jazzEarLab:v1:*` local-storage records / Legacy Insights persistence unchanged. The old app must still launch and run.
7. A snapshot/tag or reversible Git commit should precede application changes. Keep code changes separate from this spec commit.

**Architecture decision:** shared **primitives**, separate **experience and data**. Do not prematurely build a generic multi-mode plugin framework for future releases.

## 3. Canonical terminology / data semantics

- **Exercise:** one of `M1 Audiation` or `M2 Recognition`.
- **Question:** a sampled chord plus an intended target pitch/degree, frozen once presented.
- **Target Pool:** which sounds may be generated. **Answer Options:** what the user may choose in M2; these are not the same thing.
- **Response Method (M1):** `imagined`, `sung` or `played`; it is not a separate exercise.
- **First Response:** the first committed response to a question, immutable for primary accuracy reporting.
- **Retry:** an answer submitted after an incorrect first response; educational activity, not a replacement first response.
- **Replay:** additional user-requested audio playback; the initial automatic playback does not count as a replay.
- **Reference:** the correct target sound exposed at/after the comparison stage.
- **Grading Source:** `automatic` (M2, objectively scored choice) versus `self` (M1, user evaluation).
- **Unknown Confusion:** M1 user knows their audiation was incorrect but cannot identify the imagined degree; counts incorrect without inventing a wrong degree.
- **Preset:** saved V2 configuration used for quick start. A built-in preset can carry a user override and be restored.

Keep these concepts distinct in storage, UI and Insights; shared components do not imply interchangeable scores.

## 4. Exercise contracts

### 4.1 M1 — Single Chord Audiation (produce an internally heard degree)

**Goal:** see a chord symbol and target degree, know what that pitch should sound like, then optionally sing or play it. **The target is not played before the user finishes attempting it.** This trains audiation, not vocal technique.

Flow:
1. Present the **chord symbol** and **target degree** (e.g. `G7 → b7`). With context playback enabled, play **only the chord/context**; with it disabled, present the visual cue without chord audio.
2. The user internally hears the requested pitch and chooses how to express/complete the attempt: `imagined`, `sung` or `played`. The selected response method is saved with every record.
3. User indicates **Done**; stop the pre-reference attempt timer. **Only then** reveal/play the actual reference pitch.
4. User self-rates **Correct** or **Incorrect**. There is **no Close / Almost** option.
5. If Incorrect, require **Which degree did you imagine?** Choose a degree **other than the target**, or **Unknown**. Unknown must be an explicit, valid choice; no forced guess.
6. Allow comparison/replay after rating, then Next. Post-reference activity cannot alter the initial grade or attempt timing.

Same question/generation/audio/grade workflow for `imagined` / `sung` / `played`, with different completion actions and separately grouped timings. Singing/playing is not machine verified; all M1 accuracy remains **self-rated**, regardless of response method.

The UI must not infer or claim that `Played` time isolates audiation speed: it includes execution and interaction. `Imagined` time is a self-indicated end point.

**Correct example:** `G7 → b7`, user audiates F, presses Done, compares reference, marks Correct.

**Incorrect example:** user audiates D (`5`), sees the reference F, marks Incorrect and selects `5`. Stored confusion: expected `b7` → imagined `5`. If unsure, choose Unknown.

### 4.2 M2 — Single Chord Degree Recognition (identify an audible degree)

**Goal:** hear a note against an **identified chord** and choose its chord-relative degree.

Flow:
1. Display chord symbol (known harmony) and play the target note. If context playback is on, also provide audible chord context; if off, play the target without chord context. Never reveal the target degree before a first submission.
2. Present a **reasonably complete chord-aware answer set**, not just the configured Target Pool. The answer UI must avoid indistinguishable enharmonic synonyms for the same sounding pitch.
3. User selects/submits one degree. On first submission, **atomically lock** the initial answer, objective correctness, selected degree, replay count, and response time.
4. If Correct: show the correct answer and allow Next/review.
5. If Incorrect: show **Incorrect only** (do not expose the correct degree). Allow repeat listening and further guesses; alternatively provide **Reveal Answer**.
6. Subsequent guesses may reach the right degree or the user may reveal it, but **neither changes the first-response result**. Keep retry/reveal activity separately as practice history.
7. Next is always possible after a resolved question; do not force endless attempts.

A first incorrect selection `5` when the actual G7 target is `3` records expected `3` → chosen `5`, regardless of later success.

**Do not:** grade an incorrect fast guess favorably, replace first-response latency with last-retry latency, silently show the answer on first error, or let target-pool size reduce answer choices to a trivial binary guess unless musically unavoidable.

### 4.3 Shared rules

- Chord symbol stays visible in Release 1; identifying an unknown chord is not part of these exercises.
- Chord-context **audio** is switchable **on/off**, default **on**. Changing the setting changes comparability cohorts.
- Replay counts must distinguish **before first response** from **after first response / reference**.
- Skipped/unfinished attempts may be recorded as `unassessed`, not automatically wrong; no fabricated degree confusion or valid time.
- If audio fails, a question must not silently commit a timed/graded result. Display an actionable retry/error.
- A question's generated chord, target and answer policy remain stable during retries.

## 5. Generation and music-theory rules

### 5.1 User-controlled pools

Allow these **independently configured** dimensions:
- **Root Pool:** one or more selected roots (including an All 12 Keys preset).
- **Chord Quality Pool:** one or more valid chord qualities.
- **Target Degree Pool:** **Functional** or **Exact** selection.

**Functional degree** selection resolves the requested *musical role* for each chord quality, e.g.:

| Functional request | maj7 | m7 | 7 |
| --- | --- | --- | --- |
| Third | `3` | `b3` | `3` |
| Seventh | `maj7` | `b7` | `b7` |

Additional shortcuts such as chord tones, guide tones and tensions may use existing theory helpers; exact grouping labels are a UX design detail, not three new engines.

**Exact degree** selection preserves the specifically chosen pitch relationship (e.g. `b3`, `3`, `b7`, `maj7`, `b9`). Do not silently reinterpret `b3` as a major third on a major chord or collapse deliberate tension/alteration practice into functional chord tones.

Validate all combinations against the supported note/degree vocabulary and the audible pitch/register. The generated expected pitch and the displayed label must agree; do not generate an impossible-to-answer item. If choices cannot be expressed unambiguously or no legal target exists, show a configuration validation message before Start rather than silently changing user choices.

### 5.2 Balanced randomization

For each finite session:
1. Enumerate feasible chord-quality × **resolved target-degree** combinations for the selected configuration.
2. Sample them approximately evenly, shuffling presentation order. Spread roots as evenly as practical within the chosen pools.
3. If fewer questions exist than feasible combinations, do not promise full coverage. Minimize avoidable skew without forcing an unnatural/fully predictable cycle.
4. For unlimited sessions, use **rolling balanced sampling**, avoiding permanent short-term bias; do not precompute an infinite queue.
5. Do not use historical user weakness to secretly weight normal sampling.
6. Seed or otherwise make generation reproducible enough to test, and record the actual question material.

Balanced does **not** mean every root × quality × degree combination must appear in a ten-question session. Repeated questions and exposure should be distinguishable when calculating transfer-related Insights.

### 5.3 M2 answer options

- Build options from the current chord's canonical pitch-class-to-degree mapping, **not** from just the Target Pool.
- Ensure the correct answer occurs exactly once.
- Do not present simultaneously two enharmonic labels representing the same sounding pitch for that same chord.
- Ensure a deliberate Exact Target is represented truthfully; if the chord's canonical display policy would relabel it differently, choose a consistent display/acceptance policy and test it, rather than marking a musically equivalent answer incorrect.
- Do not add another general-purpose **Answer Options Config** to Release 1. Revisit only if proven needed.

## 6. V2 configuration and navigation

### 6.1 Entry: Presets First + Quick Start

- The V2 home shows M1/M2 as clearly named exercises and useful starter presets.
- A preset can be started **in one action** without opening configuration.
- A **Customize** action opens a concise wizard; no mandatory onboarding or course unlock.
- The last-used preset/configuration may be easy to access, but must not obscure which settings a session uses.
- Preset names should communicate the musical task, e.g. `Dominant Guide Tones — All Keys`. Exact shipped preset inventory is an implementation detail; provide at least one valid, meaningful M1 and M2 default.

### 6.2 Non-linear configuration wizard

Use compact, clearly labeled, **clickable steps**. Users may jump directly to any step, modify one item and start without clicking Next through every page.

Proposed **minimal step groups**, not mandatory page counts:
1. **Harmony:** Root Pool, Chord Quality Pool.
2. **Targets:** Functional or Exact Degree Pool.
3. **Practice:** M1 Response Method (M1 only), chord context audio, question count (finite or Unlimited), essential audio controls.

Provide a summary/start action that works from every step. Validate at Start and at save where feasible. Do not import every Legacy `Config` field. Keep rare controls collapsed or omit them until a real use case requires them.

**Configuration audit**
- **Core:** exercise, roots, qualities, target degrees/mode, chord context audio, M1 response method, question count.
- **Advanced only if necessary for actual playability:** volume and practical audio/register settings.
- **Defer:** M3–M7-specific settings, fretboard range control, extensive playback/reveal/hint combinations, complex adaptive parameters, cosmetic options with no training role.

Exercise-specific fields must not appear in unrelated exercises; do not show M1 response method in M2.

### 6.3 Preset save semantics (confirmed)

- A valid edit to an active preset **automatically persists to that same preset** (no required Save button, no automatic duplicate).
- Built-in presets are also editable, but have **Restore Default**. Implement built-in overrides without permanently losing the shipped definition.
- User-created presets can be created/renamed/deleted. Avoid version-history machinery.
- Changes affect **future questions/sessions**; the current active session uses its frozen configuration/question snapshots. No mid-question mutation.
- Invalid intermediate wizard edits must not corrupt the last valid saved preset; show state clearly until corrected.

### 6.4 Session duration

- **Fixed:** chosen question count; automatically finish and show results after the last resolved question.
- **Unlimited:** generate until the user chooses Stop; then show results.
- Both use one practice engine and one Results/Insights system. Count presets (e.g. 10/20/50) may be sensible defaults, not extra feature commitments.
- Do not count unanswered new questions as wrong when the user stops Unlimited.

## 7. Timing, replay and assessment evidence

The following are **proposed measurement contracts** required for consistent implementation; they were not separately approved as exact clock-edge choices. If a pre-existing reusable implementation has an equally valid but different start boundary, document it before using it and keep a **timing version** so incompatible sessions are never combined.

### 7.1 Required timing semantics

- Use a monotonic browser clock (e.g. `performance.now()`) and clearly defined audio/prompt readiness events, not wall-clock date arithmetic.
- **M1 response latency:** from the **ready-to-respond** point (target prompt available and, when enabled, initial chord-context presentation finished) to the user's first **Done** action, before Reference. This is a user-reported readiness/completion interval, not objectively measured singing accuracy.
- **M2 first-response latency:** from the **first target-note playback onset / answer-ready event** to the first submitted answer. Record the adopted playback-event boundary and its timing version. Do not start at the beginning of an unrelated loading delay.
- A replay before the first response may lengthen elapsed time; **do not silently reset the clock** on replay. Record replay count alongside latency.
- Pause/unavailable-app time is excluded from **active elapsed time** when reliably detectable; interrupted timing is labeled invalid/unknown rather than guessed.
- Store times in milliseconds; present a readable seconds format. Keep enough precision for meaningful comparisons but avoid claiming neurocognitive millisecond accuracy.
- Comparisons must match exercise, response method, context playback, timing policy and other material settings. M1 and M2 latencies are not interchangeable.

### 7.2 Minimum attempt record

Each scored/attempted question should retain, at minimum:

| Field | Meaning |
| --- | --- |
| `id, sessionId, questionId` | Stable identity and question association |
| `exercise` | M1 or M2 |
| `gradingSource` | `self` or `automatic` |
| `responseMethod` | M1: `imagined`/`sung`/`played`; M2: answer-selection method |
| `configurationSnapshot` | Roots/quality/degree selection and effective exercise settings |
| `target` | Actual chord, intended degree, MIDI/pitch class, generator version |
| `firstAnswer, firstCorrect` | M2 chosen degree and objectively scored result; M1 self-rating after comparison |
| `imaginedWrongDegree` | M1 error only: specified degree or `unknown` |
| `firstResponseMs, timingVersion, timingValidity` | Latency measurement with provenance |
| `replaysBeforeFirst, replaysAfterFirst` | Distinguish assistance from review |
| `retryCount, revealedReference, completedAt` | Educational activity and outcome |
| `exposure` | Fresh/previously seen/review status when reliably known |

Avoid duplicating full snapshots per event where references to immutable session/question snapshots suffice, but preserve enough provenance for future Insights to be honest.

Never overwrite a saved first response with a later retry. The user may replay/reference after grading without changing the primary observation. Store partial and skipped states distinctly, preserving completed attempts if interrupted.

### 7.3 Accuracy and time interpretation

- **M2 first-answer accuracy** = correct first submissions / all graded first submissions; include answers that had replays but expose their replay count. Distinguish replay-free versus replay-assisted first answers in drill-down.
- **M1 self-rated accuracy** uses the same correctness denominator logic but must always say **self-rated**; cannot appear as verified M2 accuracy.
- Incorrect first responses remain incorrect even if later corrected or immediately answered quickly.
- Display **response times for correct first responses** as the primary fluency signal. Wrong-answer time can remain inspectable as descriptive evidence, never as speed credit.
- Replay Count is separate: show replay-free first-response share and/or replay count distribution/average; do not bury replay usage inside a misleading "accuracy" score.
- Use median (and sample size) as a robust descriptive timing default. No arbitrary learning-grade thresholds or unsupported pass/fail labels are part of Release 1.
- Do not invent precision for degree-confusion analysis when M1 selects Unknown.

## 8. Results and Insights (minimal but useful)

### 8.1 At session end

Show, in this order:
1. **Accuracy** / **Self-rated Accuracy**, numerator and denominator, and count of unassessed/skipped items.
2. Replay usage (including questions requiring one or more replays before first response).
3. Correct-first-response latency (e.g. median) with timing sample count and correct caveat for M1 methods.
4. Mistake summary: target degree → chosen/imagined degree, Unknown separate.
5. Start another similar session / return to preset / customize.

Fixed and Unlimited sessions use the same result layout.

### 8.2 Across sessions

Use **Overview → Drill-down** rather than a huge dashboard:
- Overview identifies strongest/weakest supported patterns and high-level accuracy/replays/correct-response time.
- Drill-down supports **Chord Quality × Degree**, and relevant root/context or response-method filters where evidence exists.
- **Progression/Harmonic Context analysis** is a planned **Release 2 extension**, not a fictitious Release 1 chart.
- Show sample size, self/automatic source, replay exposure and timing comparability with each conclusion.
- If no meaningful samples, say **Not enough comparable data** rather than labeling the user unskilled.
- Suggest a **targeted preset/practice adjustment** when justified; suggestions are user-accepted actions only. **No automatic adaptation**.
- No single weighted "mastery score" combining accuracy, replay and speed. Keep component metrics visible.

Insights should never equate improved UI quiz performance to proven bass performance or fluent live improvisation.

## 9. Data separation and preservation

- Create a separate V2 data namespace (suggested `jazzEarLab:v2:*`) or equally isolated versioned store. Never write V2 data into `jazzEarLab:v1:*`.
- V2 Insights starts with **only V2 attempts**. No Legacy history merge or migration in Release 1.
- Legacy records, saved presets, routes, UI and Insights remain readable and operational.
- Persist V2 user presets, practice history and results locally. Make failure to persist visible; do not falsely claim data was saved.
- Provide at least basic reload persistence of completed sessions and settings. A sophisticated mid-question recovery/replay system is not required for Release 1.
- Avoid adding analytics telemetry to external servers; all user practice data remains browser-local under the current product model.

## 10. UX and accessibility acceptance

- On desktop and narrow mobile viewport, user can begin a built-in M1 or M2 preset quickly, understand what is being trained, and reach the first question without unnecessary settings screens.
- Wizard shows one meaningful category at a time; clickable step navigation never destroys in-progress edits.
- The active question prominently displays the chord and either target degree (M1) or degree choices (M2); avoid unrelated dashboard distractions.
- Key actions (`Start`, `Replay`, `Done`, `Submit`, `Reveal`, `Next`, `Stop`) are available only when meaningful, with clear labels and disabled/loading states.
- Error feedback is not color-only; keyboard navigation and visible focus are supported. Interactive controls have labels and reasonable touch targets.
- Incorrect M2 feedback must **not leak the reference answer**, including through hidden DOM text, audio labels or inaccessible screen-reader announcements.
- When the user reveals a reference or changes method, evidence boundaries stay clear in on-screen copy.
- Final visual design tokens, animations, and exact wizard page count remain design-level choices, not grounds for an early framework rewrite.

## 11. Acceptance criteria and smallest useful checks

Implement one test for each non-trivial rule, reusing existing `npm run build` / `npm test` and browser harness where practical. At minimum:

**Generation / theory**
- [ ] Root/quality/degree pools generate only feasible, accurately labeled targets.
- [ ] Functional Third/Seventh resolves correctly for maj7/m7/7.
- [ ] Exact selection is not silently remapped to a different pitch.
- [ ] Ten-question sessions with larger combination pools behave sensibly; longer sessions are approximately balanced, with shuffled order and root coverage.
- [ ] Unlimited generation does not require precomputing an endless list.
- [ ] M2 answer set contains exactly one unambiguous correct pitch-class choice and is not limited to Target Pool.

**M1 flow**
- [ ] With context on, chord context is audible; target reference is **not** played before Done.
- [ ] With context off, the visual chord/degree prompt still functions.
- [ ] Each response method is recorded separately with its own timing.
- [ ] M1 supports only Correct and Incorrect; Incorrect requires a different wrong degree or Unknown.
- [ ] Choosing Unknown counts incorrect without manufacturing a confusion.
- [ ] No self-report is exposed as objective pitch verification.

**M2 flow**
- [ ] First answer locks exactly once with correctness, selected degree, pre-first replay count and latency.
- [ ] Wrong first answer displays Incorrect but no answer leak.
- [ ] User can replay, retry and/or Reveal without changing first-response evidence.
- [ ] Confusion reflects the **first selected degree**, not the last successful retry.
- [ ] Correct-first submissions appear in accurate speed stats; fast wrong responses earn no credit.

**Practice/presets/storage**
- [ ] Quick Start works without wizard navigation.
- [ ] All wizard steps can be jumped to directly and a valid config can start from any step.
- [ ] Editing a built-in preset saves an override; Restore Default restores the shipped definition.
- [ ] Invalid edits never corrupt the last valid saved preset.
- [ ] Fixed session completes at target count; Unlimited stops manually and summarizes only attempted questions.
- [ ] Completed V2 records persist after reload and are isolated from Legacy keys/stores.
- [ ] A minimal Legacy smoke test confirms M1/M2 and old history still work.
- [ ] No new account service, cloud analytics API or framework dependency was introduced without an identified need.

**Insights**
- [ ] Objective M2 and self-rated M1 evidence cannot be merged into one objective accuracy figure.
- [ ] Response-method, chord-context, answer-policy and timing-version differences cannot silently combine into a like-for-like speed claim.
- [ ] Replay counts, correct-response latency and confusion matrices reconcile to underlying first attempts; inadequate samples produce cautious text.

### Definition of Done

Release 1 is done when **both M1 and M2 run end-to-end in V2**, settings/presets and finite/unlimited sessions work, primary outcomes are stored honestly, simple Insights can be inspected, automated checks pass, and **Legacy behavior and records remain intact**. A new UI shell alone, with dummy scores or unreachable settings, is not done.

## 12. Suggested implementation sequence (not separate products)

1. **Isolation first:** V2 entry + dedicated storage/config + basic reusable theory/audio imports; preserve Legacy.
2. **M2 vertical slice:** balanced questions, context playback, first-answer capture, retries, basic result.
3. **M1 vertical slice:** same question material, response-method capture, Done → Reference → self-rating/confusion.
4. **Preset and wizard:** preset quick start, clickable steps, auto-save/restore, fixed/unlimited.
5. **Insights and polish:** accuracy/replays/correct-time, chord × degree drill-down, targeted suggestions with evidence limits, tests and browser usability check.

An earlier M2-first **implementation sequence** does not change the **Release 1 commitment to both M1 and M2**; either order is acceptable if it reduces rework. Avoid speculative abstractions for Release 2.

## 13. Deferred roadmap (recorded, not authorized for Release 1)

- **Release 2 — Progression foundation:** both chord-progressive Recognition (degree/interval) and **Guided Audiation** (specified degrees; not free improvisation). Start with **one independent random target per chord**, known visible progression and common changes such as ii–V–I.
- **Later progression generation:** musical constraints / voice leading, then curated jazz phrases + variations. These are **three generation styles within the same Progression Exercise**, not three independent app modes.
- **Later curriculum:** transfer emphasis on fresh melodies → other keys → faster accurate responses; freely accessible course and practice paths. Difficulty changes are suggestions, not hidden automatic edits.
- **Later Insights:** progression context, transition positions, interval patterns, generalization and evidence-aware targeted drills.

Treat all later details as separate specifications. No need to preserve every old M3–M7 implementation or invent a full V2 curriculum in this release.

## 14. Implementation defaults requiring design validation

These are *proposed defaults*, **not extra user-confirmed Q13–Q41 decisions**:

1. Exact route/folder names, file organization and amount of component extraction.
2. Numerical preset inventory, initial finite question-count options and any hard minimum sample size for recommendations.
3. M2 response input gesture (tap-to-submit versus select-then-submit); it must remain fast, explicit, and accessible.
4. Precise audio timing event used as `first target onset` and the handling of output-device latency. Keep the declared timing version stable.
5. Exact presentation of chord playback (simultaneous/preceding target for M2), volume, register and audio controls.
6. Detailed error-state copy and final visual design.

Choose the smallest reasonable default during implementation, document it, and validate the actual musical behavior. **Do not silently contradict confirmed requirements or the project intent.**

---

## Decision traceability

| Confirmed decisions | Requirement |
| --- | --- |
| Q13 | Same repository, frozen Legacy, independent V2 |
| Q14–Q17, Q29–Q30 | M1/M2 core; later progression; Audiation methods, Guided progression, context toggle |
| Q18–Q19 | Presets First and suggestions, not automatic difficulty |
| Q20–Q22 | One practice mode; accuracy/replay/time, detail by degree and harmonic context when supported |
| Q23–Q26 | Audit configs; independent pools; functional/exact; balanced random |
| Q27–Q28 | Three progression generation styles, staged, within one exercise |
| Q31–Q35 | Binary M1 self-rating with wrong degree/Unknown; full M2 choices; locked first response, retry without early reveal |
| Q36–Q40 | Non-linear wizard, auto-saved editable built-in presets, Restore Default, finite/unlimited sessions |
| Q41 | No Legacy-to-V2 history merge |

**Product guardrail:** *Does this help musicians hear unfamiliar jazz melodic material within known harmony more accurately, quickly and naturally, and can the software report its actual evidence without overstating what was measured?*
