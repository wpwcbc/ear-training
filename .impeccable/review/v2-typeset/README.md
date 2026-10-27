# V2 typeset — runtime verification

Completed 2026-10-27 on the existing V2 feature branch. Visitor mode: Operate.
This refines Source Sans 3 / Signal Route typography across the four modes,
configuration, Results and Insights. Approved A practice and C+B configuration
compositions, public vocabulary, records, assessment and audio are retained.

## Independent assessments before editing

**Typographic assessment:** Source Sans 3 and all four real weights fit the
approved identity. Source and incumbent captures showed a hanging home-context
separator, closely competing task/section sizes, inconsistent 13/14/15px support
roles, pixel-only text sizing and selectively unbounded evidence prose. The
assessment called for a stable rem role scale, readable metadata, 72ch prose and
font-fallback/text-size stress checks rather than a second family.

**Mechanical assessment:** the Impeccable type detector exited 127 because its
launcher is absent. Source inspection independently identified fixed body/role
sizes, uneven mobile support sizes, absent tabular count/tempo numerals and
non-metric-matched fallback. `fc-scan` confirmed the four actual weights; each
TTF is approximately 232KB and each weight has consumers. No runtime font-size
assignments exist in V2 source. No detector result was used to anchor the visual
assessment, and no detector pass is claimed.

## Delivered typography

- `v2.css` defines purpose-based rem roles: 1rem body/fields, .875rem support,
  1.125rem subheading, 1.375rem section title and 1.75rem page title. Musical
  symbols and accuracy retain their larger, distinct display scale. Mobile
  chapter labels remain 1rem; small text no longer drops to 13px.
- Body leading is 1.5, while headings use 1.2–1.3, controls 1.35 and fields 1.4.
  Evidence/conditions paragraphs use a 72ch maximum. Musical/answer grids and
  native fields keep their available width. No tracking or palette replacement.
- Headings use balanced natural wrapping with emergency word wrapping. Home
  titles keep the complete accessible name while removing the visible dangling
  separator between their separate context/assessment lines.
- Counts, numeric fields, durations and tempo use tabular numerals alongside
  existing accuracy figures. Degree controls grow vertically with text. Chapter
  tracks and navigation reflow at enlarged text sizes; the mobile action reserve
  scales with text rather than assuming a fixed-height footer.
- Font delivery remains self-hosted 400/500/600/700 with `font-display: swap`.
  Only regular is preloaded. All weights are used; no extra family, invented
  fallback metric overrides or runtime raster assets were introduced.

## Rendered verification

One batched desktop/mobile inspection identified unnecessary 320px navigation
wrapping and over-fragmented chord-action labels at double text size. Both were
fixed together, followed by one confirmation batch; no further cosmetic loop.

Passed:

- `npm test`: TypeScript build and all 16 unit test-file subtests.
- `test:v2:layout`: all four boards and chaptered configuration at 1440/390/320px,
  full default six-target phrase, checked/self-rated states, invalid settings,
  first-evidence preservation, save/interruption recovery, minimum 2×1 and
  maximum 32×4 progression fixtures, boundaries and config CSS zoom.
- Results/Insights critique regression: keyboard/focus, readable conditions,
  populated note-grain evidence, reference playback, history links and reload.
- Dedicated browser probes at 1440/390/320px: 16, 20 and 32px root text; then font
  requests blocked. Body text followed the root size, no horizontal page overflow,
  all four chapters remained available, Start stayed enabled for valid settings
  and the focused final chord field stayed above the attached action.
- All four practice modes at 320px and 32px root text: no horizontal page overflow
  and Stop remained operable. Scrolling is permitted when enlarged text needs it.

The screenshots below are actual local Chromium captures with synthetic browser
storage, taken after `document.fonts.ready` in the probes. Fallback captures
explicitly abort font requests. Existing behavior suites govern enablement; the
images are not generated mockups. Full-page screenshots can composite the fixed
Start strip midway through the image; focused-field geometry verified reachability.

| Surface | Evidence |
| --- | --- |
| Home | [desktop](home-1440.png), [320px](home-320.png), [font fallback](home-fallback-320.png) |
| Configuration | [single chord](single-config-harmony-390.png), [Sound](single-config-sound-1440.png), [progression](progression-config-harmony-320.png), [double text](config-double-text-320.png) |
| Degree Audiation | [single chord](m1-practice-390.png), [progression](singing-practice-390.png), [self-rated](singing-rated-320.png) |
| Degree Recognition | [single chord](m2-practice-320.png), [progression](recognition-practice-1440.png) |
| Evidence | [Insights](insights-readable-conditions-320.png), [Results reference](results-reference-playing-320.png) |

## Limits

Final detector attempt also exited 127; mechanical findings above were addressed
by source/browser checks, not a successful detector gate. No new contrast colors,
motion or control workflows were introduced. Pixel-size screenshots and CSS-root
scaling probes are not a complete browser-default-font, Safari/iOS or assistive-
technology audit. `font-display: swap` and blocked-font rendering establish
readable fallback; loading-shift metrics were not measured and the fallback is
not claimed metric-identical. Existing aggregate browser baseline failures remain
documented in prior implementation reports; only the named suites are claimed
passing. No deployment or learning-effectiveness claim is made.

Verdict: scoped typeset work complete; ready for a separate polish/release review.
