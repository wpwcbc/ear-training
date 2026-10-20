# Jazz Ear Lab: reusable practice sessions

The subsequent visual refresh and its additional browser checks are described in [JAZZ_EAR_LAB_UI_DESIGN.md](JAZZ_EAR_LAB_UI_DESIGN.md).

This release implements `Jazz_Ear_Lab_UX_Flow_Spec.md` alongside the musical requirements in `Jazz_Ear_Lab_Codex_Spec.md`. All seven existing modes use the new flow. No framework, account service, audio sample dependency, or legacy storage migration was introduced.

## Repository design and routes

The repository remains native TypeScript compiled to committed ES modules. `src/jazz/app.ts` owns musical presentation and the cancellable audio engine; `src/jazz/flow.ts` owns navigation, the adaptive wizard, dashboard, named presets, summaries and history. `src/jazz/lifecycle.ts` owns configuration identity, seeded generation and session snapshots. The existing controls are reused inside the wizard instead of duplicating seven mode forms.

All routes are hashes under `jazz-ear-lab/index.html`:

| Hash | Purpose |
| --- | --- |
| `#/home` | Recent / Saved / Suggested dashboard and resumable sessions |
| `#/setup/1` through `#/setup/5` | Exercise, Harmony, Targets, Playback, Review |
| `#/session/<id>` | Dedicated practice page, without the main site navigation |
| `#/session/<id>/summary` | Results, repeat settings, review missed, exact replay |
| `#/history` | Filtered session history and immutable configuration details |
| `#/suggested` | Unlocked recommendations with Practice and Customize |
| `#/insights`, `#/review` | Existing skill analysis and exact saved challenges |

The server receives only `jazz-ear-lab/` when refreshing a hash route. This uses ordinary static directory hosting, including a GitHub Pages repository subdirectory, without server rewrites. Session IDs resolve against the current browser's local storage; a link is not a shared cloud session.

## Delivered behavior

- Dashboard: first-use quick starts, 20 distinct recent configurations, named Saved presets, favorites, rename/duplicate/delete, one-click new sessions, and resume entries. Recent entries are not automatically Saved.
- Presets: Practice creates a new session; Edit & Practice copies into a draft. Editing, renaming or deleting a preset does not change an old session's configuration. Saving a preset does not start audio or a session.
- Wizard: five steps with summaries, Back and direct completed-step navigation, automatic/manual draft saving, reset, exercise filtering, mode-specific controls and collapsible customization. Moving backward preserves valid settings. Empty pools block Continue and incompatible settings report the relevant field.
- Musical pools: 12 selectable roots, qualities, target degrees, and progression-bank entries. New fifths cycles respect the selected root pool. Production and recognition share the seeded generator; degree spellings remain unique per pitch class in recognition.
- Challenge levels: Foundations sets chord landmarks, 72 BPM/full hints; Developing adds 9ths and 96 BPM; Advanced selects tensions, 120 BPM/minimal hints. The actual values remain editable.
- Playback: managed metronome, count-in, optional preparation countdown, replay limits or unlimited, and optional delayed advancement. Auto Advance defaults off and only runs after a recorded grade. M4 gaps can be manual, two beats, one bar or explicit seconds. The preparation countdown is separate from the prediction window; charts can hide after listening.
- Session start: Review creates the session and its immutable config snapshot, seed, generator version and actual generated question snapshots. The dedicated practice page waits for an explicit Play context action. Browser audio unlock occurs on that action, including before a preparation countdown.
- Practice: context, anticipation/answer, reference, grade and Next remain phase gated. Each multi-chord transition retains its own assessment, but a question completes only after the whole path. Skips remain recorded. Future chord targets cannot be played from a partially revealed reference panel.
- Persistence: question index, chord step, phase, grade, selected answers, replay count, phrase marks and bass choices are saved. Refresh restores the current challenge without replaying a completed assessment. Audio never auto-starts on reload. Interrupted context playback can be replayed explicitly.
- Exit retains a paused session. Finish Session ends even an Endless run and opens its summary. End & Edit Exercise marks the previous session abandoned and opens a new draft. Finished histories cannot be resumed and rewritten.
- Compact playback settings affect subsequent audio only; they do not rewrite the musical config snapshot or question material. Tempo/volume/metronome changes cancel the current schedule and prompt a replay.
- Summary: completion count, active time, separate self-assessed distribution and automatic recognition accuracy, slow/replayed/missed material, config, and per-assessment results. Repeat uses a new session ID; missed review and exact replay use stored challenge snapshots.
- History filters: local date, exercise, status, question count, duration and grading source. Old results remain viewable; exact replay is offered only for sessions containing generated question snapshots.
- Suggested: all seven entries offer direct Practice and Customize, alongside the existing evidence-based weak-skill recommendation. No prerequisite locks.
- Keyboard: Space plays/pauses, R replays, Enter invokes a legal primary action, N advances after grading, and 1/2/3 select a rating or recognition option. Text/select editing and modifier shortcuts are excluded.
- Mobile: narrow stepper, wrapping controls, primary practice actions and locally scrolling notation/fingerboard views. Desktop and 390px layouts are checked for document overflow.

## Storage and compatibility

Existing `jazzEarLab:v1:config`, `sessions`, `progressions`, and `favorites` are retained. New keys are `jazzEarLab:v1:wizardDraft`, `recentConfigs`, and `savedPresets`. Optional fields allow previous records to load without erasing their original payload. Historical durations without active-session tracking are labelled as recorded response time.

New sessions store config/custom-progression snapshots, a seed, generator version, actual challenges and active progress. Named preset IDs are independent from session IDs. Canonical Recent identity sorts unordered pools and ignores volume; explicit cycle root ordering is preserved. A favorite from a subsequently deleted custom progression can reconstruct its review context from the saved challenge.

Local storage remains browser-local and limited by browser quota. An unavailable/full store reports an error rather than claiming persistence. Unsupported draft/preset formats are preserved and reported. There is no cloud sync or microphone recording.

## Validation

Run the static server with `npm run dev`, then:

```text
npm test
npm run test:browser
```

The browser scripts require Playwright and an installed Microsoft Edge. They also accept a `PLAYWRIGHT_MODULE` file URL pointing to an existing installation; no new project dependency is required. All browser runs use fresh, isolated profiles and leave the user's practice data alone.

The 32 pure-function/audio tests cover theory, register, voice leading, original phrases, managed scheduling, storage compatibility, semantic Recent identity, seeded re-generation, immutable snapshots, quality-compatible target pools and invalid pools. The four browser suites cover the existing music behavior and the new UX:

1. Home -> M1 -> pools -> playback -> Review -> dedicated ready page; no audio before Play.
2. Empty roots disable Continue; backward navigation preserves timing and targets.
3. Preset save, rename/delete, Edit & Practice and old-history integrity.
4. Reveal/self-grade, fourth-question refresh, no duplicate assessments, final summary.
5. Recent direct Practice creates a new session without a wizard.
6. Missed-question review creates a smaller, exact-snapshot session.
7. M4 withholds G7/B, preserves the next unplayed target and records chord steps.
8. M2 scores quality and degree independently; assisted retries stay separate from unassisted accuracy.
9. M3 holds one MIDI pitch; M5 pauses its actual audio clock and handles two targets.
10. M6 hides notation, marks targets, predicts before reference, renders a nonblank canvas and varies into a new session.
11. M7 gates sing-first, reveals fret positions, and replays a saved exact challenge.
12. Timed reveal cancellation, custom editor/durations, insight refresh, history filters, legal keyboard Next, replay limits, grade-only auto advance and countdown cancellation on Exit.

Screenshot artifacts from the UX suite are written to the OS temporary directory: `jazz-ux-dashboard.png`, `jazz-ux-wizard.png`, `jazz-ux-session.png`, `jazz-ux-summary.png`, and `jazz-ux-mobile-session.png`.

## Manual acceptance

1. Open `jazz-ear-lab/`; choose Start Practicing, then Hear a Chord Degree. Select roots/qualities, choose target degrees, review and start. Press Play, sing, Reveal, then self-grade and Next.
2. Finish the set, save its configuration with a name and return home. Practice from Recent and Saved; each should create a different session ID directly. Edit a copy, then verify the saved original is intact.
3. At question four refresh. Replay if needed, then continue; the first three results should remain exactly once.
4. Customize an M4 guide path. Its next chord must remain silent until Hear next chord. Grade every transition before Next advances the question count.
5. Exit a running session and use Resume. Finish an Endless set manually. Inspect paused/completed/abandoned filters and separate recognition/self-assessment summaries.
6. On a phone, check the bottom action group, collapsed playback settings and fingerboard scrolling. Repeat with headphones and the intended bass/vocal register.

Automated browser validation uses desktop Edge and emulated mobile dimensions, not physical iOS/Android devices. Acoustic timbre, device latency and real singing/playing were not measured. Piano-like and pad audio are synthesizers. Physical performance remains self-assessed. Microphone detection, private audio/MIDI import, cloud sync and advanced spaced repetition remain explicitly deferred by the specs.
