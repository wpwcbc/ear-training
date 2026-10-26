# Targets / voice mix / Insights compositions

Status: Composition direction approved by the user on 2026-10-26. Synthetic illustrative data only.
These are static layout proposals, not functional application pages or proof of
implemented UI. Existing Signal Route / Split Desk identity is retained.

- `targets.html`, `targets-desktop.png`, `targets-mobile.png`: per-quality target
  groups followed by original-voice gain controls and full-chord audition.
- `insights.html`, `insights-desktop.png`, `insights-mobile.png`: Overall/M1/M2
  navigation, combined accuracy, primary chord-degree/confusion evidence and
  secondary timing/replay detail.

Both HTML sources use the existing V2 stylesheet and fonts. All four captures
were opened and inspected, and their documents checked for horizontal overflow
at 1440px and 390px. No application UI has been changed to these compositions.
The illustrative target choices are not the complete supported degree vocabulary.

## Historical core checkpoint (before UI approval)

The core model supports optional per-quality pools and original-voice levels,
old-preset conversion without historical mutation, a separately versioned
quality-balanced generator, first-assessment deduplication, valid raw-time
medians, and read-time M1 production mapping.

The audio API supports original-voice 0–200% gain, exact mute, preserved target
exclusion/continuation, and conservative output headroom reserving the independent
target before M1 Done. Question playback and Results replay pass recorded levels.
Default settings and Legacy audio paths retain their established behavior.

The new shapes are intentionally not activated through the existing preset/editor
UI: its global-target controls cannot edit them correctly. New controls, audition
UI, Overall/module rendering and focused-preset conversion remain unfinished
until composition confirmation. In particular, this is not a completed feature.

## Verification at this checkpoint

- TypeScript build and full Node suite: 137 passed, none failed/skipped.
- Model tests exercised through a failing-first cycle: per-quality selection and
  balancing, historical conversion, invalid levels/mixes, deduplication, finite
  nonnegative timing, method mapping and traceable new metadata.
- Audio-boundary test: original identities survive target omission, zero voices
  are not scheduled, and target nominal gain stays independent of voice levels.
- Real OfflineAudioContext rendering via headless Chromium: three-, four- and
  five-voice chords at 200% and maximum overall volume passed output-peak checks
  for question, fresh reference, live reference and audition playback APIs.
- Existing V2 homepage and lifecycle browser suites passed under Chromium via an external
  PLAYWRIGHT_MODULE adapter; no claim of Edge or physical-device coverage.
- Full V2 browser command stopped in its first suite on the preset-delete
  assertion (browser-v2.mjs line 538). The same failure was reproduced from
  unchanged commit 115015c served separately, so it is not attributed to this
  change. Later suites in that chained command did not execute.
- Separate Standards and Spec reviews found no outstanding core-phase defects
  after reverting premature new-shape activation in the unchanged editor.

The spec's full Customize → audition → Practice → Results → Insights acceptance
flow remains pending UI implementation. Tests do not establish subjective sound
quality, device loudness, learning gains or complete feature readiness.

UI integration has since been completed; see V2_VOICE_MIX_DELIVERY.md at the repository root for current delivery status.
