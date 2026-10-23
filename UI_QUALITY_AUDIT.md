# UI Quality Audit - 2026-10-23

## Implementation integrity

Pass: the shared semantic design tokens, focused practice flow, local-only data
boundaries and evidence-aware Insights form a coherent music-practice interface.
The Impeccable engine was unavailable in the preceding pass; deterministic
detector counts are unavailable, not zero. This pass uses source inspection,
Playwright/Edge and axe-core instead. No critique snapshot was read or closed.

## Baseline assessment

These are implementation-review scores, not accessibility certification.

| Dimension | Score | Evidence |
| --- | --- | --- |
| Accessibility | 3/4 | axe A/AA scans clear; route entry loses useful keyboard focus |
| Performance | 3/4 | Existing worker/throttling tests; no new performance defect reproduced |
| Responsive design | 2/4 | Long saved names overflow at 320px; disclosure targets below 44px |
| Theming | 3/4 | Light/dark tokens work; status borders retain literal colors |
| Implementation integrity | 3/4 | Coherent system; draft write failures are not consistently handled |
| Total | 14/20 | Good; address verified gaps |

Baseline: ten axe scans across home, exercise/harmony setup, saved presets,
populated M1 Insights, data settings and empty history. No WCAG 2 A/AA or 2.1 AA
violations reported on these sampled states. This does not cover every state or
replace assistive-technology testing. Isolated browser storage and synthetic
assessment fixtures were used; user records were not touched.

## Findings (before changes)

- **P1: Draft storage failures escape event handlers.** `src/jazz/flow.ts`,
  `draftSave`, pool handlers and wizard Back. A simulated QuotaExceededError
  generates an uncaught page error without a visible recovery message. Input
  updates and validation can be interrupted. Use `harden`: preserve in-memory
  changes, report a recovery path, keep validation working, never report a
  failed explicit save as successful. Relevant: WCAG 3.3.1 / 4.1.3.
- **P2: Unbroken saved names overflow narrow layouts.** `configRow` and
  `css/design-system.css`. A long saved name makes document width exceed the
  320px viewport in both themes. Use `harden`: allow the name and grid child to
  shrink and wrap, without truncating the stored name. Relevant: WCAG 1.4.10.
- **P2: Small disclosure targets.** `Configuration` is approximately 73x27px;
  the mobile row-menu trigger is 34x44px. Use `polish`: make both at least 44px
  while preserving native disclosure and the existing icon system. 44px is the
  project's touch-target policy, not a claim that all smaller targets fail AA.
- **P2: Setup route entry loses meaningful focus.** Clicking a mode card hides
  the originating button and leaves focus on the document body. Continue leaves
  focus after the newly replaced form. Use `harden`: focus the new step heading
  on navigation, without changing local checkbox/disclosure focus or overriding
  Insights' own drilldown focus management. Relevant: WCAG 2.4.3.
- **P3: Status presentation drift.** Status text/background use semantic tokens,
  but borders are literal colors and font size is 12px. Use `polish`: retain
  existing messages with theme-aware full borders and readable secondary text.

## Additional state probe

**P1: Forced-color mode hides mask icons.** The later hardening probe verified
that the Pause icon's pseudo-element and button surface both resolve to
`rgb(255, 255, 255)`, while its text color is black. Icon-only controls therefore
lose their visible identity in high-contrast mode. axe did not flag this.
Use `harden`: preserve only mask fills with the user's CanvasText system color,
not a fixed brand color or a whole-interface forced-color opt-out. Regression:
assert differing icon/surface colors, actual Tab focus, and keyboard pause/resume.
Relevant: WCAG 1.4.11; no revised overall score is claimed from this extra probe.

## Existing strengths

- Native buttons, details, progress and properly labelled forms.
- Mobile drawer Escape, focus loop, inert closed content and focus return.
- Existing zoom, reduced-motion, contrast, analytics source-isolation and audio
  replay/advance regression coverage.
- Action-first Insights retain caveats and expandable evidence.

## Sequence and limits

Audit is recorded before fixes. Apply `harden`, then `polish`, then targeted
regressions and the existing suites. No redesign, new onboarding, training
generation, scoring, analytics formula or storage-schema changes are in scope.
Physical Safari/iOS, real screen-reader speech and human speaker playback are
not verified by headless Edge or axe.

## Delivered fixes and verification

All six recorded findings were addressed. Draft writes now fail visibly without
interrupting validation; failed saves cannot display success. Unsaved in-memory
choices survive returning through Home, and successful retry survives reload.
No stored record, schema, recommendation definition or training engine changed.

- `npm test`: TypeScript build and 105 unit tests passed.
- `npm run test:browser`: all 14 established suites passed, including audio,
  autoplay, lifecycle, Insights/evidence, localization and actual browser zoom.
- `npm run test:redesign` and `npm run test:critique`: both passed, preserving
  shared routes, drawer interaction, themes, source isolation and prior fixes.
- `npm run test:quality`: passed across 16 sampled states with axe-core 4.14.0;
  no violations reported for the WCAG 2 A/AA and 2.1 AA tag sets. New assertions
  cover quota/security write failures, successful retry, unchanged prior stored
  draft during failure, preserved input through navigation/reload, validation,
  native menu keyboard control, route-entry focus, 44px disclosure targets,
  long names, readable status borders/type and whole step labels at 320px.
- Session pause/resume works by keyboard with reduced motion and forced colors.
  The formerly white-on-white Pause icon now differs from the button surface.
- Existing performance regression: 10,000 rows remain responsive in the worker;
  the 4x simulated CPU-throttled run completed in 1800ms with 38 timer ticks.
  This is a local diagnostic, not a physical-device performance guarantee.
- Two bounded desktop/mobile screenshot inspection rounds; no new design
  critique score, exhaustive accessibility certification or detector count is
  claimed. Remaining platform/assistive-technology limits are listed above.

`test:quality` follows the existing external Playwright harness via
`PLAYWRIGHT_MODULE`. Set `QUALITY_AXE_PATH` to an installed axe-core `axe.min.js`
to include the scan; without it the output explicitly reports that axe was not
run. `QUALITY_SCREENSHOTS=1` writes captures to the OS temporary directory
`eartrain-quality`; the JSON verification report is written there on each run.
No axe or browser dependency was added to the production bundle.
