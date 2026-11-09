# Insights narrative and matrices: delivery record

Specification: GitHub #26. Design #27; functional slices #28-31; integration #32.
Branch: v2/ux-audio-refinement. This record does not imply deployment to main.

## Delivered behavior

- Compact scoped accuracy/counts precede an evidence-backed local narrative.
- At most three supported findings, with exact evidence and identifiable source
  settings for the existing practice preview. No external AI or record upload.
- Primary quality-specific degree confusion list and count matrix share the
  same deduplicated first outcomes; Unknown/unspecified/unassessed stay separate.
- Quality-by-degree performance matrix exposes percentages, counts and support
  status without relying on colour. Actual musical spellings are preserved.
- Desktop confusion/performance views are side by side; mobile stacks them.
  The narrative's heading is visible on mobile: its CSS class no longer collides
  with the existing configuration-summary disclosure styles.
- Coverage guidance has its own source controls; changing them cannot reset a
  summary source choice. Supporting matched-condition suggestions remain labelled
  as a narrower population than the descriptive aggregate.
- Retained scope and clear/remove actions appear before the narrative, including
  when moving from a filtered mode to Overall; filtered totals are not presented
  as an unfiltered headline.
- Source sessions, presets, first grades, timing policies and Legacy are intact.

## Verification

Passed on Windows/Edge: `npm test` (178 Node tests), the complete updated
`npm run test:v2` chain (including layout/state and six Insights scripts),
`npm run test:v2:keys-play`, `tests/browser.mjs` and
`tests/browser-legacy-insights.mjs`. The former Roots timeout is resolved in the
test harness without changing the application's checkbox behavior.

The integration fixture covers all six V2 exercises, equal inclusion of recorded
self-ratings, Overall 531/567 from 162 questions across 18 sessions, duplicate
assessment IDs, M1 imagined/sung versus played, a separate 45-day-old result,
period exclusions, Root/Key/Quality/Degree filters, exact confusion evidence,
recorded-source preview and real Back to Insights navigation. Storage bytes are
compared before and after. Both oscillator and buffer-source creation are
instrumented before page load to detect unintended audio during exploration.

Focused source-choice tests cover multiple volume setups and their persistence
across preview return and changes to unrelated Coverage controls. Unit fixtures
cover Unknown, missing annotation, unassessed results, retries/immutable grades,
support gates, distinct notes/questions/sessions and deliberate alterations.

Responsive fixtures cover 1440/390/320px, an 18-degree matrix, keyboard activation
and return focus, and bounded table scrolling. 200% content scaling uses CSS
zoom in Edge, not a claim of testing every browser's native zoom UI. Axe was run
with WCAG 2 A/AA and 2.1 AA tags on the filtered integration view; zero violations
were reported. This is not exhaustive accessibility certification.

## Test migration

The old homepage and Split Desk scripts predate the six-mode application,
per-quality pools, source-preview handoff and new Insights. They remain in the
repository as historical checks, but are no longer default-run acceptance for
removed UI contracts. The runner now uses the current six-entry homepage test,
maintained layout/state tests and all Insights tests instead. The new homepage
test preserves independent root/quality/pool editing, autosave, source isolation,
frozen session configuration and Restore Default checks. Existing playback,
retry/reveal, M1 grading and lifecycle scripts remain in the default V2 runner.

The existing general V2 script now pins root checkbox identity before clicking
instead of retrying a moving :checked.first() locator. Invalid-setting copy and
preset disclosure interaction match the current UI while retaining storage
protection assertions. M1 timing-version evidence is checked through the current
technical-details disclosure instead of a removed mandatory cohort selector.

## Visual review

Compared with the approved boards in
`.impeccable/mocks/insights-summary-2026-11-09/`: preserve compact accuracy first,
prominent narrative, primary confusion, adjacent desktop performance matrix and
mobile stacking. Secondary source/history/efficiency controls remain reachable.
The screenshots use synthetic records and different device proportions; this is
a structural comparison, not pixel-identical comp certification. Actual rendered
views are in `.impeccable/review/v2-insights-integration/`.

Two-axis review findings were addressed with observable layout/heading checks,
old-period exclusions, integrated filtered evidence/preview return, pre-load
oscillator and buffer guards, explicit Windows runner prerequisites, and a
regression assertion that retained Overall scope precedes the narrative.

## Manual limits

Not performed: physical iOS/Android devices, VoiceOver/NVDA interaction, native
browser zoom UI and real speaker/headphone listening. Existing unit/browser audio
checks protect scheduling and recorded outcomes, not perceived acoustic quality.
No cloud sync, new module, new grading method or Release 2 behavior was added.

## Windows browser-test setup

The aggregate runner now includes maintained layout and Insights scripts. These
need both `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` on Windows;
setting only the module URI is insufficient for scripts with a Linux fallback.
An isolated test-only installation (not a production dependency) can be used:

```powershell
npm install --prefix "$env:TEMP/jazz-ear-lab-check" playwright axe-core
$module = Join-Path $env:TEMP 'jazz-ear-lab-check/node_modules/playwright/index.mjs'
$env:PLAYWRIGHT_MODULE = ([Uri]$module).AbsoluteUri
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
npm run test:v2
```

Run with the local dev server already serving port 4173. For the additional
axe-backed integration check, set `QUALITY_AXE_PATH` to that installation's
`node_modules/axe-core/axe.min.js` and run
`node tests/browser-v2-insights-integration.mjs`. Axe does not replace manual
screen-reader or physical-device testing.
