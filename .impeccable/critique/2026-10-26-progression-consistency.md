# Progression consistency critique and repair

Scope: V2 progression configuration, Recognition, Guided Singing and results.
The user explicitly requested alignment with the existing M1/M2 visual system.

## Critique

Two independent assessments (`progression_style_design` and
`progression_style_evidence`) found the same structural mismatch. The design
assessment scored the original surface 22/40, with consistency and visual hierarchy
as its weakest dimensions. This is a pre-repair assessment, not a post-repair score.

- Practice used an inline control flow: playback buttons and the first answer
  shared a row, while subsequent answers started on another baseline.
- Mix labels were inline inside a disclosure, causing input/label wrapping.
- Results presented repeated paragraphs without the existing accuracy anchor,
  supporting metrics and disclosed question review.
- Matching colors alone did not reproduce the incumbent M1/M2 layout.

## Repair

Reuse existing configuration steps, Split Desk, yellow session bar, musical anchor,
response area and evidence-summary classes. Group all Recognition answers by chord;
keep Guided Singing targets prominent and self-rating explicit. Use the existing
label/range/value voice-control pattern. Move detailed outcomes into expandable,
locally scrollable tables. Keep the existing audio, grading and persistence model.

Desktop/mobile screenshots in `../review/progression-consistency/` show actual
runtime states with generated practice data, not proposed comps. The mobile fixed
Start action is viewport-attached; full-page captures show it at the captured
viewport boundary. A final independent design check found no blocking defects.

## Verification and limits

- `npm test`: passed (16 test-file subtests); TypeScript build passed.
- `tests/browser-v2-progression.mjs`: passed, including arbitrary answer order,
  retained answers after replay, first grades, singing reference completion,
  partial self-ratings, storage-failure retry, Overall 1/7 with no timing sample,
  preset isolation and rendered boosted audio peak below clipping.
- `tests/browser-v2-m1-grading.mjs`: passed.
- Recognition/settings/results/review: desktop 1440px and mobile 390px inspected;
  no whole-document horizontal overflow. Guided Singing also checked at 320px.
- Existing `test:v2` is not fully green. Three unchanged tests fail identically
  against untouched main (`090acbe`): `browser-v2.mjs` reads configure content
  immediately after the home hash changes; `browser-v2-homepage.mjs` expects only
  two exercise rows; `browser-v2-split-desk.mjs` expects 70% but observes 71%.
  No unrelated application or test repairs are included.
- Browser checks used installed Chromium via a temporary Playwright adapter;
  the suites' default Microsoft Edge installation is unavailable here.
- Impeccable launcher/detector unavailable (exit 127). Context and design were
  inspected directly; no successful detector, overlay or automated score claimed.

The changes are branch work until merged and deployed; screenshots do not establish
that the public Netlify site has updated.
