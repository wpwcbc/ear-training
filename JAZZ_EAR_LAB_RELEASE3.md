# Jazz Ear Lab: Release 2 extensions and Release 3 core

Run `npm run build`, then `npm run dev`. Open http://127.0.0.1:4173/jazz-ear-lab/.

Existing trainers, their storage keys and the non-repeating degree questions are preserved. The application remains native TypeScript and static multipage HTML.

## Available practice

- **M1 Chord Degree Audiation**: produce a specified degree over Maj7, m7, 7 or m7b5. Roots can be fixed, random from a list or cycled in list order. Note names stay hidden until reveal. Self-assessed.
- **M2 Harmonic Role Recognition**: hear a chord and target, choose its local degree, and check the reference. A configurable degree pool controls question selection. Options have one canonical spelling per pitch class, so b3/#9 or b5/#11 never compete as duplicate answers. Automatically checked; retry uses the same challenge.
- **M3 Common Tone**: recognize roles over a fixed pitch, or hear the starting pitch once and maintain it yourself while chords play without a melody voice. Two to five chords; curated examples use F or G, while custom examples choose a pitch with strong chord-tone/guide-tone coverage. Self-assessment and recognition remain separate.
- **M4 Anticipatory Audiation**: two chords or a full progression, with guided, nearest 3rd/7th, common-tone, stepwise or leap target paths. The next chord waits until Reveal by default. An explicitly selected timed mode reveals after the prediction window. Pause suspends countdown and audio; Resume preserves the remaining prediction time, or restarts an interrupted context.
- **M5 Changing Tonal Centers**: the same anticipatory engine over a larger progression bank and custom harmonic durations. Timed reveal uses the configured gap in beats. Repeats extend the line without assuming a global key; each transition retains its local chord/target interpretation.

The bank contains major/minor ii-V-I, secondary dominants, a ii-V cycle, tritone substitution, blues turnaround, rhythm-changes bridge dominants, chromatic mediants, non-functional major colors, and a three-tonal-center B/G/Eb example. It is a collection of harmonic exercises, not a copyrighted transcription library.

## Audio and configuration

All voices, including scheduled count-in clicks, belong to one cancellable Web Audio engine. Count-in uses unpitched noise clicks to avoid introducing an extra tonal anchor. Context playback supports custom chord durations, melody seed, repetitions and visual chord following. No soundfont or CDN is required.

Settings include tempo, beats, target register, full chord/root/shell context, inversion, volume, piano-like synth/pad, chord-symbol display and 5/10/20/unlimited challenges. Root/shell contexts require visible chord symbols. M3 always uses full chords. A target range must span at least 12 semitones. Common-tone paths retain exact MIDI pitch; other path constraints are validated rather than silently ignored.

The custom editor accepts 2-32 chords, one per line with optional integer beat duration, for example:

```text
Dm7 4
G7 4
Cmaj7 8
```

Chords currently support Maj7, m7, 7 and m7b5, with sharp/flat roots. Durations are 1-16 beats. Save/update/delete affect custom presets only; saved session results are preserved. Use the preset from M3, M4 or M5.

## Progress and recommendations

Suggested Path stages A-E open ordinary practice configurations without prerequisites. Stage E opens the three-center progression. Recommendations use up to 20 recent unassisted records over seven days and restore the weak practice's configuration, including root, quality and progression, instead of only switching modes.

Sessions distinguish self-assessment from automatically checked recognition. Insights group results by degree, quality or progression and show actual expected/selected confusion pairs. Multi-chord recognition can report each chosen role independently. Response times are question times, not inferred per-note reaction times.

Retry after revealing an answer is marked `referenceAssisted` and saved separately; it does not inflate unassisted accuracy or mastery statistics. Older records without selected answers remain visible but cannot provide confusion pairs.

Storage keys remain version-separated from the old app:

- `jazzEarLab:v1:config`: settings; missing fields from the first delivery use defaults.
- `jazzEarLab:v1:sessions`: up to 100 sessions with assessment source, selected degrees and reference-assisted status.
- `jazzEarLab:v1:progressions`: validated custom presets.

Completed assessments save immediately. Refresh preserves settings, presets and session summaries, but does not resume an unfinished challenge. No microphone recording or automatic pitch detection occurs.

## Modules

- `src/jazz/theory.ts`: parsing, spelling, pitch classes, register, guide tones and unambiguous recognition labels.
- `src/jazz/progressions.ts`: curated progression bank and custom progression validation.
- `src/jazz/model.ts`: configuration, question generation, versioned storage and recommendations.
- `src/jazz/audio.ts`: pure playback planning plus managed Web Audio voices.
- `src/jazz/insights.ts`: separate self/automatic skill statistics and recognition confusions.
- `src/jazz/app.ts`: practice/reveal state, countdown, pause, editor, session history and views.
- `jazz-ear-lab/`: responsive practice page using the existing shared stylesheet.

## Verification

Run `npm test` for compilation and pure-function/audio tests. Optional browser workflow scripts use an existing Playwright installation and Microsoft Edge:

```text
node tests/browser.mjs
node tests/browser-release3.mjs
```

Set `PLAYWRIGHT_MODULE` to an installed Playwright module URL when it is not locally resolvable. Browser tooling is not added as a runtime dependency. These checks cover desktop/mobile layout, original M1/M3/M4 acceptance cases, M2 grading and retry, M3 production, timed reveal pause/cancellation, custom preset persistence, M5 durations/count-in, separate insights, and preservation of original storage.

Manual checks:

1. M1 Dm7, 9: E appears and plays only on Reveal. G7, b7 reveals F in every register.
2. M3 major ii-V-I recognition: fixed F gives b3 / b7 / 11. Chromatic mediants: fixed G gives 5 / 3 / maj7.
3. M3 Hold the pitch yourself: hear a single seed note, then chords without a melody voice; compare and self-assess after Reveal.
4. M4 Path B: Dm7+C plays first; sing G7's third before Reveal plays G7+B. Path A stays F-F-E.
5. M4 First 2 chords, timed reveal: pause during countdown and wait; G7 must not sound until Resume allows the remaining time to elapse.
6. M2 G7 with degree pool `b3 #9`: the canonical answer is #9, with no duplicate b3 option. Check an incorrect answer, then retry; the corrected retry is recorded separately.
7. Save `Dm7 2 / G7 2 / Cmaj7 8` as three editor lines. M5 retains those durations, count-in and repeats after refresh.
8. Change mode/settings while a timed reveal is pending; old audio and countdown must be cancelled.
9. Open Insights, switch degree/quality/progression and inspect separate self/recognition rows. All available Suggested Path stages remain freely accessible.

Keyboard: R replay, Space reveal, N next, P pause (outside form controls).

## Remaining scope

Production remains self-assessed, never measured pitch accuracy. Browser workflows verify scheduling and UI, but listening quality on mobile devices, headphones and speakers still needs human checking. The piano-like sound is synthesized, not a sampled piano.

M5 currently advances one target per chord with assessment between transitions; a seamless performance run and two simultaneous targets per chord remain future work. Altered/sus/diminished chord parsing, independent voice/bass range presets, per-chord drill buttons, favorites and richer target restrictions are not included. A confusion matrix can only use selected-answer data collected in this release.

Next stages are the remaining M5 performance controls, followed by Release 4's original phrase library (M6) and bass mapping (M7). Microphone detection, MIDI import and advanced spaced repetition remain deferred, as specified.
