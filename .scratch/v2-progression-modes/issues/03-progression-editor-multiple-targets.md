# 03: Editable progressions and multi-note practice

**What to build:** Let the musician configure the actual harmony and melodic load, then hear and answer questions generated from those settings.

**Blocked by:** 02: Progression Recognition minimal complete flow.

**Status:** done

- [x] Provide editable major ii–V–I, minor ii–V–i and backdoor presets, initially Dm7–G7–Cmaj7, Dm7b5–G7–Cm7 and Fm7–Bb7–Cmaj7. Allow supported quality changes.
- [x] Custom editing supports actual chord symbols, add/remove/reorder, per-occurrence duration and whole-progression transposition; repeat symbols remain distinct occurrences.
- [x] BPM is configurable; chord duration defaults to four beats; include a one-bar count-in. Define safe supported numeric bounds without silently clamping invalid input.
- [x] Uniform notes-per-chord is 1–4. Sequential targets evenly divide each occurrence’s duration; verify unequal chord durations, one-note and four-note cases.
- [x] Use preset-owned per-quality pools and independent position sampling. Allow consecutive repeats and singleton pools; do not rearrange the progression for quality balancing.
- [x] Preserve valid saved presets on invalid drafts. Unsupported chords, empty relevant pools and unplayable/timing settings prevent Start with actionable errors.
- [x] Transposition keeps displayed chords, sounding pitches and local degrees aligned. Editing one preset cannot modify another or historical snapshots.
- [x] Demonstrate configured multi-note practice and per-note grading through the browser, with deterministic generation/scheduling checks through public interfaces.

Delivery evidence is recorded in the V2 progression modes implementation report. Automated checks and manual limitations are distinguished there.
