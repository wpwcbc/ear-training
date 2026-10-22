# Insights UI/UX Refinement

The subsequent [October 22 polish](JAZZ_EAR_LAB_INSIGHTS_POLISH.md) supersedes
the presentation and historical-settings prerequisite below. These notes describe
the preceding release; the base evidence gates remain authoritative.

Implemented against `Jazz_Ear_Lab_Insights_UI_UX_Refinement_Spec.md` on
2026-10-22. Presentation version: `insights-ui-refinement/1`. Base
`insights-2.2` statistical gates, capture schema and musical drill contracts are
unchanged. This supersedes earlier cell-dialog, layout and performance notes.

## Narrative And Practice

Positive observations, tentative difficulties, descriptive contrasts and
supported claims are separate candidate families. A small positive sample is
neither mastery nor an automatic weakness/coverage drill. English and zh-Hant
templates retain source, actual counts, local-day/root limits and comparability.
Missing template parameters fail closed. Semantic identities include query scope.

Composition is complementary and deterministic. Descriptive pairs cite both
original samples, have a distinct comparison identity and never claim supported
compatibility. A pair replaces repeated tentative counts while retaining the
underlying practice action ID. Sufficient specific children can replace broader
parents when they add material context; sparse children cannot.

Practice priority is independent: supported difficulty, tentative checks, then
coverage. Mixed history requires selecting an actual recorded setting family or
Customize. Existing compilation validates ten actual tasks, root/context
provenance and 7/3 or confusion allocations. Double launch is prevented; preview
does not autoplay. Targeted practice stays outside the fresh baseline.

## Exploration

Order: Summary, KPIs, matrix/inline detail, targeted practice, recent results,
collapsed evidence, About/Settings. Content is at most 1200px; desktop detail is
320px wide, moving below the matrix under 1024px. It never traps focus. Only
nested evidence remains modal. Close, Back and drill return preserve query/cell.

The compact heatmap uses configured applicable degrees in canonical musical
order. Cells show observed percentage, n and evidence state. Missing coverage,
unknown identity, stale evidence and inapplicable parent-grain outcomes remain
distinct. The genuine table alternative sorts by rate/n and preserves selection.
Degree marginals are a compact descriptive n-sorted table with percentages.

Details show grades, gates, roots, sessions, exact settings and paginated evidence
with assessment/question identities. Local root filters affect detail/actions
only; Apply root to page is explicit. Tooltips support hover, focus and Escape.
Evidence opening rechecks the database revision and rejects stale/deleted refs.
Overview keeps separate mode/source totals and a persisted focused-mode workspace.
An empty overview has one diagnostic-start action, not seven competing starts.

## Data And Dates

`#/insights/data` (alias `#/insights/settings`) contains backup, import preview,
cache clearing and Insights deletion. Main Insights has no raw diagnostic JSON or
data-management buttons. Import validates before applying, reports new/overlap
and quarantined-backup counts, and remains additive. Deletion lists store counts,
offers export, defaults to Cancel and restores focus. Trainer history and Saved
presets remain outside its scope. Save failures continue to surface globally.

Calendar presets use explicit IANA-zone boundaries and an as-of cutoff. Last
28 days on Oct 22 in Hong Kong is Sep 25 through Oct 22, ending Oct 23 exclusive.
The resolver covers midnight DST gaps and 23/25-hour days. Undated records remain
in all-retained evidence, not calendar plots. Cache keys include snapshot time.

Zero/one/two dated days show unavailable/single-value/two-row presentations.
Three to six days default to a table with optional dots. A chart defaults only
with at least seven days and three days having n>=5; this is a display floor, not
statistical support. Sources, tasks, grains and timing definitions stay separate.
Charts use the selected calendar extent, not a hard-coded 56-day axis. Existing
v2 rolling-28-day comparisons are preserved with explicit separate prior/current
boundaries; they do not redefine the selected calendar display. Missing timing
does not remove valid outcomes.

## Reproduction And Validation

`tests/refinement-fixtures.mjs` and `tests/fixtures/current-ui-m1-ledger.json`
provide a machine-readable synthetic ledger: 113 retained, 112 ratings
(101/0/11), 110 diagnostic questions (99 correct), Oct 20 23/29 and Oct 21 76/81.
Two correct reassessments share existing question IDs by explicit fixture design,
not as an explanation recovered from real history. Unknown-identity, imbalanced,
stale, sufficient, matched and empty fixtures are separate.

- `npm test`: 100 passed, including the original 91 semantic/music tests.
- `npm run test:browser`: all 13 suites passed. The existing Smart Summary suite
  now covers the new ledger, matrix/table parity, local scopes, stale refs,
  additive import confirmation/cancel, deletion focus, mixed-scope launch,
  320/390/1440/1920px layouts and matrix text/boundary contrast floors.
- Actual 200% browser zoom and deuteranopia/protanopia/achromatopsia emulation
  passed, including nonblank rendered-pixel checks. These are not full WCAG or
  physical assistive-device certification.
- On Node v22.20.0 and headless Edge, a 10k-row worker run measured 965ms with
  38 timer ticks. Simulated 4x page CPU throttling measured 2501ms and 46 ticks;
  this is not a physical mid-range-device measurement.

A final selector benchmark on this AMD Ryzen 7 7735HS host measured uncached p95
623ms, cold 623ms and cached p95 0.41ms. A run alongside browser work measured
718ms uncached p95, 815ms cold and 0.65ms cached p95. The 500ms uncached target
was **not met**. Earlier release results do not guarantee a current
budget. Worker/progress handling remains important. Physical-device and full-page
render budgets remain unverified.

Browser tests use isolated storage and emit `jazz-refinement-*.png` in the system
temporary directory, including desktop/mobile inline-cell captures. Viewing,
sorting, selecting and cancelling operations assert unchanged assessment bytes.
No live user profile was seeded or cleared. Unsupported snapshots/contrasts still
show a constraint and Customize; self-ratings never measure pitch accuracy.

Selected intended-layout captures are retained under
`tests/fixtures/insights-refinement/` for visual review. These are synthetic
baselines, not a cross-platform pixel-perfect certification.
