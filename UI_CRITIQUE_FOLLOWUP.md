# Critique Follow-up (2026-10-23)

User decisions: implement all five findings; show recommended practice before the full evidence narrative.

## Delivered

1. Action-first Insights: context, actual sample count/grain, historical-setting scope and required
   self-rating/comparison caveats precede a working practice action. Full scripted observations and
   citations remain in an expandable summary. Disclosure state survives local drilldowns.
   Leading actions resolve structured action markers, not translated labels. Async launch errors
   appear beside the initiating button; a failed save can be retried without creating two sessions.
2. Matrix discovery: overflowing heatmaps/tables show previous/next column buttons and the visible
   column range. An unselected detail pane no longer consumes width; actual observed and missing
   cell selections still show their details/actions. Sorting, table view, source counts and evidence
   definitions are unchanged. Resize handling queries mounted matrices without retaining detached views.
3. Hit areas: header and mode controls are at least 44px; exercise selection is one full-card native
   button, with a clear accessible name and associated description. No nested interactive controls.
4. Recent: an empty Recent displays no supplied exercises. Browse quick starts selects the actual
   template tab. Learning Path retains its recommendation, the three quick templates and other exercises.
5. Harmony: four common qualities appear first (maj7, m7, 7, m7b5); the other fifteen remain available
   in More chord qualities. Existing advanced selections expand automatically. Hidden checked options
   are retained when visible options change. No defaults or validation rules were changed.

The related Practice/Dashboard naming inconsistency was also resolved in the wizard and results links.
No training generation, playback scheduling, analytics formulas, evidence gates or storage schema changed.

## Verification

- `npm test`: TypeScript build and 105 unit tests.
- `npm run test:browser`: 14 established browser suites covering all modes, audio/autoplay, lifecycle,
  presets, history/review, targeted diagnostics, evidence, localization and accessibility workflows.
- `npm run test:redesign`: shared shell, themes, responsive routes and source-data isolation.
- `npm run test:critique`: explicit checks for all five findings, 320-1920px action visibility in
  light/dark themes, full-summary/citation access, native card selection, quality catalogue parity,
  hidden-selection preservation/reload, matrix arrows/ranges/table/detail behavior, bilingual primary
  actions, simulated save failure/retry, exactly one session and immutable synthetic source evidence.
- Two bounded screenshot inspection rounds; no additional visual polish loop.

`CRITIQUE_SCREENSHOTS=1` saves the critique batch to the OS temporary directory `eartrain-critique-fixes`.
Browser scripts use the existing `PLAYWRIGHT_MODULE` override and Edge harness.

## Limits

Screenshots and device sizes are browser emulation, not physical iOS/Safari validation. Insights
fixtures are synthetic, not the user's records. This follow-up is not a new quantified design critique
or an exhaustive accessibility certification. The unavailable Impeccable engine was not used to claim
automated detector results.
