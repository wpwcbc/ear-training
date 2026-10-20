# Jazz Ear Lab v1: specification audit

The new dashboard/wizard/session navigation is documented in [JAZZ_EAR_LAB_UX_RELEASE.md](JAZZ_EAR_LAB_UX_RELEASE.md). That document supersedes the original navigation and manual-operation instructions below; the musical implementation map remains applicable.

This delivery completes the non-deferred v1 scope of `Jazz_Ear_Lab_Codex_Spec.md` (2026-10-20). Production and physical instrument performance remain self-assessed; no microphone pitch accuracy is claimed.

Run `npm run build`, then `npm run dev`, and open http://127.0.0.1:4173/jazz-ear-lab/.

## Implementation map

| Specification                  | Delivered behavior                                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing application preserved | Original trainers, drone, heatmap and their storage keys remain intact. Native TypeScript/multipage HTML is retained.                                                                                                                                                                                                         |
| Practice first, suggested path | M1-M7 are available directly. All seven suggested practice entries are available without prerequisites; they configure the same engine. No XP, quests or feature locks.                                                                                                                                                       |
| Shared question lifecycle      | Context, prompt/anticipation, reference reveal, self/automatic grading, next, retry, replay, pause and skip. Answer names remain hidden until the corresponding reference reveal.                                                                                                                                             |
| Audio controls                 | Synthesized piano-like/pad voices, volume, inversion, MIDI register, tempo, harmonic duration, count-in, prediction window/gap, reference replay. Voices are owned by one cancellable Web Audio engine.                                                                                                                       |
| Display and anchor controls    | Chord symbols and progression chart can be hidden independently; full/minimal hints. Root/shell contexts require visible symbols. Shell omits the target. Hidden-quality recognition establishes the local root audibly, avoiding ambiguous inversions without introducing a global key.                                      |
| Vocal and bass ranges          | Separate saved vocal/bass limits, range presets, and octave-preserving target resolution. Bass mode also checks whether a target can be played in the selected fret position.                                                                                                                                                 |
| Practice management            | 5/10/20/unlimited challenges; keyboard/touch controls; replay context separately from target/reference; exact challenge snapshots saved for review.                                                                                                                                                                           |
| M1 produce/recognize           | Produce specifies a degree and waits for reveal/self-assessment. Recognize switches to M2 using the same configuration and engine. Fixed/random/list/circle-of-fifths roots are supported.                                                                                                                                    |
| Extended harmony               | Maj7, m7, 7, m7b5, sus4, 7sus4, dim7, altered, b9/#9 dominants, minor-major, sixths, ninths, thirteenth and major/minor triads. Degree spelling includes double alterations where appropriate.                                                                                                                                |
| M2 recognition                 | Configurable degree pool; hidden symbols can sample an explicit quality pool, then require quality and degree. Canonical choices contain one label per pitch class. Incorrect answers replay reference; retries are reference-assisted, not additional unassisted accuracy.                                                   |
| M3 recontextualization         | Fixed melody pitch over 2-5 independent chords, recognition or melody-free production after an audible seed. Built-in examples preserve F or G; custom examples choose a pitch with useful harmonic coverage. Non-chord roles are identified as tensions, not automatically wrong notes.                                      |
| M4 anticipation                | Two-chord or full progression; manual reveal by default or opt-in countdown. Guided, nearest, common, stepwise and leap paths; guide/chord/tension target constraints. Same-note and semitone motion are allowed.                                                                                                             |
| M5 progression performance     | Stepwise assessment or continuous audio-clock performance; one target, two targets, or nearest-guide-tone line. Count-in, repeats, 0-4 beat gaps, current-chord highlighting and next-target prompts. Continuous pause suspends the audio clock and resumes the same scheduled pass. Self-assess the complete run afterwards. |
| Progression bank               | Major/minor cadences, ii-V cycle, secondary dominants, blues/rhythm-change fragments, tritone substitution, chromatic mediants, non-functional colors, three-center B/G/Eb exercise and six I/V triads. All targets are chord-relative.                                                                                       |
| Custom progression editor      | Save/update/delete 2-32 chord rows with 1-16 beat durations and optional validated starting bar numbers in 4/4. Repeats and tempo are practice settings. Chart shows derived bars. Deleted presets do not delete session results or saved review snapshots.                                                                   |
| M6 phrase cycle                | Listen without score, sing back, mark structural attacks, predict the next target while its chord is withheld, reveal score/roles, transfer to bass and vary. Three deliberately composed original three-bar studies carry CC0-1.0 metadata and explicit MIDI/duration data.                                                  |
| M6 transformations             | Rhythm, chromatic approaches, enclosures and semitone transposition preserve target pitch classes and total duration. Chord symbols transpose with the phrase. Independent fret ranges allow another bass position. Notation has a readable per-note analysis table as well as the canvas score.                              |
| M7 bass mapping                | Standard E1-A1-D2-G2 tuning, 0-24 fret limits/position, optional note labels, reveal-only target highlights, selectable fingering and self-assessment. Sing-then-play, hear-then-play and next-beat cue tasks are available.                                                                                                  |
| Insights and recommendations   | Quality/degree/progression grouping, recognition confusions, mean question response and replays. Self and automatic results are distinct; mode is part of each skill group, so bass performance is separate from audiation. Recent weak configurations can be restored.                                                       |
| Persistence and compatibility  | New optional fields merge with existing v1 defaults. Completed results, custom presets, configuration and review snapshots survive refresh. Old application storage is not migrated or overwritten.                                                                                                                           |

## Important behavior details

Continuous M5 schedules chords and both target notes in advance against Web Audio time. The screen anticipates the next chord/degree without showing its absolute target name. Past reference names appear only when their chord/target is reached. Pause freezes the actual audio clock; changing settings, retrying, skipping or leaving cancels scheduled voices.

Count-in uses unpitched clicks. M7's next-beat cue is scheduled at the exact harmonic boundary. Ordinary pause stops a context and can replay the preserved challenge; a paused continuous pass resumes its remaining schedule.

M6's score is never drawn before reveal. Target marks are retained in the comparison view. The phrase library is original structured music, not a random note generator and not imported third-party bebop book content. Transformations preserve the structural targets while changing connecting language or rhythm. The score is an educational display, not a publication engraving/export tool.

M7's selectable fret is a visual note-location choice, not microphone evidence of played pitch. Actual singing/playing is always graded by the user. The reference target MIDI and optional selected position are stored separately.

Sessions store active practice duration separately from per-question response latency; pause duration is excluded. Earlier sessions retain their historical response-sum duration label. Reference-assisted retries remain saved but are excluded from unassisted statistics and recommendations.

## Modules and storage

- `src/jazz/theory.ts`: chord parsing, spellings, chord/guide/tension sets, canonical recognition and register.
- `src/jazz/progressions.ts`: curated harmonic studies, duration/bar validation and custom presets.
- `src/jazz/model.ts`: compatible configuration, all mode generation, sessions, review and recommendations.
- `src/jazz/audio.ts`: pure scheduling plan, managed voices, continuous pause and phrase playback.
- `src/jazz/phrases.ts`: original MIDI/beat/role data and target-preserving transformations.
- `src/jazz/bass.ts`: tuning, playable positions and bass-register target choice.
- `src/jazz/views.ts`: score and interactive fretboard visuals.
- `src/jazz/insights.ts`: separate mode/source skill results and actual answer confusions.
- `src/jazz/app.ts`: practice flow, countdown, continuous transport, phrase stages, editor, review and views.

All new persistent data is under `jazzEarLab:v1:config`, `jazzEarLab:v1:sessions`, `jazzEarLab:v1:progressions` and `jazzEarLab:v1:favorites`. Favorite snapshots can replay their original target even when the source custom preset has been removed. No audio recordings are stored.

## Reproducible acceptance

1. M1: Dm7, degree 9. Hear the context, sing, Reveal: E. G7, b7 reveals F regardless of octave. Recognize enters M2 with no duplicated engine.
2. M3: major ii-V-I, recognition. F gives b3 / b7 / 11 at one unchanged MIDI pitch. Chromatic mediants gives G as 5 / 3 / maj7.
3. M3: Hold the pitch yourself. Only the initial seed contains the melody; changing chords have no added melody voice. Reveal and self-assess.
4. M4 Path B: hear Dm7+C, sing G7's third, then request G7+B. Path A stays F-F-E. Pause/countdown/retry preserve the task.
5. M5: first two chords, continuous, two targets, four-beat count-in and one-beat gap. No target names before their reference. Pause during count-in, wait, Resume: the original audio timeline continues. Grade once at the end; four target MIDI values are saved.
6. Custom editor: `Dm7 2 1`, `G7 2 1`, `Cmaj7 8 2` on separate lines. Bars and durations agree after save/refresh. An inconsistent optional bar number is rejected.
7. M6: Upper landmarks. Start without a score, Sing back, Mark attacks, Predict. The prediction context contains Dm7 only. Reveal draws score and roles; Play on bass shows the position. Vary applies a target-preserving transformation. Transpose moves chords and targets together.
8. M7: Sing then play. Reveal stays unavailable until the singing step; no fret is highlighted before reveal. Select a position and compare. Try Hear then play and Next beat. Assess physical playing yourself.
9. Save for review; refresh; practice the saved challenge. The original reference MIDI is unchanged. Removing a saved item affects only the review namespace.
10. M2: hide chord symbols and use quality pool `7` and degree pool `b7`. Guessing maj7 with b7 is still wrong; both quality and degree are checked. Reference-assisted retries do not improve the unassisted accuracy figure.
11. Switch modes/settings during playback or a pending prediction. No old sound, countdown or phrase score should carry into the new challenge. Original trainer records remain unchanged.
12. Suggested Path entries A-G are all accessible. Insights distinguishes M1-M7 and self/automatic sources, including old compatible records.

## Verification and limits

`npm test` compiles and tests theory, register, constrained paths, phrase transformations, original phrase timings, bass positions, custom bars, compatible storage, statistics and audio cancellation/cue scheduling.

Browser regressions are `tests/browser.mjs`, `tests/browser-release3.mjs` and `tests/browser-release4.mjs`. They use Playwright with installed Edge against the running local server. Set `PLAYWRIGHT_MODULE` to an installed Playwright ESM module URL if the package is not locally resolvable. Browser automation is a verification dependency, not an application runtime requirement.

Desktop and 390px mobile checks cover overflow, functional controls, score canvas pixels, hidden answers, pause/resume, timed cancellation, saved configurations, custom presets, review and preservation of original keys. Browser tests verify scheduling and UI; hardware listening and other mobile browser audio policies still need human/device testing. Sounds are synthesized, not acoustic piano samples.

## Explicitly deferred by the specification

- Microphone pitch detection and singing/instrument signal separation, requiring a future explicit permission flow.
- Private audio/MIDI import and associated permissions/licensing handling.
- Advanced spaced repetition and ML-driven recommendations.

These are future-evaluation items in the supplied specification, not implemented capabilities. The ordinary saved-review feature and simple recent-performance recommendations are available now.
