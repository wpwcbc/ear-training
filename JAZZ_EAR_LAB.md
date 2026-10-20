# Jazz Ear Lab: first delivery

Run `npm run build`, then `npm run dev`. Open http://127.0.0.1:4173/jazz-ear-lab/.

The original trainers, their storage keys, and the existing non-repeating degree questions are preserved. The homepage links to the new lab. This delivery covers Release 1 and the core Release 2 exercises; later modes remain future work.

## Modules

- `src/jazz/theory.ts`: chord parsing, correctly spelled degrees, pitch classes, register and nearest guide tones.
- `src/jazz/model.ts`: question generation, versioned session storage and simple recent-performance recommendations.
- `src/jazz/audio.ts`: one Web Audio engine owns and cancels all scheduled voices. No soundfont or CDN is required.
- `src/jazz/app.ts`: practice state, reveal, grading, pause, replay, settings and history.
- `jazz-ear-lab/`: responsive practice page, shared existing stylesheet and local overrides.
- `tests/jazz.test.mjs`: Node tests; `tests/browser.mjs`: optional Playwright workflow checks.

## Available practice

M1 produces a specified degree over Maj7, m7, 7 or m7b5. Choose fixed roots, a random root list or a cycling list (use fifths order for a circle of fifths). Recognition links to the original trainer.

M3 plays a constant melody pitch through three chords and checks one degree choice per chord. Functional major/minor and chromatic-mediant examples are available.

M4 starts with the current chord and melody. The next chord and target are held until Hear next chord. After self-assessment, Next extends the line. Guided paths and nearest 3rd/7th are available.

Suggested Path opens the same practice configurations without prerequisites. Recommendations use up to 20 recent records from seven days. Future stages are marked as planned rather than locked.

Storage uses only `jazzEarLab:v1:config` and `jazzEarLab:v1:sessions`. Self-assessment and automatically checked recognition are labelled separately. No microphone recording or pitch measurement occurs. Completed assessments save immediately; incomplete prompts are not resumed after refresh. History retains up to 100 sessions.

## Reproducible checks

1. M1: D, m7, 9. Start; no E appears until Reveal. Reveal plays E; select a self-assessment.
2. M1: G, 7, b7. Reveal must show F. Change target register; the pitch class stays F.
3. M3: Major ii-V-I. Select b3, b7, 11. Check answers; F is held at the same MIDI pitch.
4. M3: Chromatic mediants. Select 5, 3, maj7. G is unchanged across independent chord roots.
5. M4: Major ii-V-I, Path B. Start hears Dm7+C only. Sing G7's third before Hear next chord plays G7+B.
6. M4: Path A gives F-F-E. Pause stops voices, Resume preserves the challenge, Replay restarts its context. Retry repeats the same challenge.
7. Change any practice setting during playback. Playback stops and Start begins the new configuration.
8. Refresh and inspect Sessions: settings and saved assessments persist. Original trainer records remain unchanged.
9. Open Suggested Path and select any available practice without completing prior stages.
10. Run `npm test`. With Playwright installed, run `node tests/browser.mjs` against the running server; set PLAYWRIGHT_MODULE to an installed Playwright module URL if necessary.

Keyboard: R replay, Space reveal, N next, P pause (outside form controls).

## Current limits

Synthesized piano-like and pad tones are not sampled acoustic piano. Production is self-assessed, never a measured pitch accuracy. M3 uses a small curated progression bank and recognition; melody-free production is future work. M4 uses manual reveal, without countdown or count-in. Tempo controls context duration rather than continuous backing. Custom progression editing, full M2/M5/M6/M7, microphone detection, bass diagrams, per-question favorites, confusion matrices and detailed weakness charts are not included. Root/shell contexts require visible symbols; shell omission is conservative when symbols are hidden. Browser audio output still requires listening on the user's hardware.

The next small extension is M3 melody-free production and configurable two-chord paths, followed by the M5 custom progression bank. No changes have been committed automatically; the working tree includes the user's earlier degree-trainer changes.
