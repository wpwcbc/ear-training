---
name: "Jazz Ear Lab V2 - Signal Route"
description: "Flat humanist controls and a Split Desk workspace for harmonic listening practice."
colors:
  signal: "#f8d808"
  signal-hover: "#edbd00"
  danger: "#9e2436"
  paper: "#ffffff"
  ground: "#f5fbfe"
  ink: "#111111"
  muted: "#505763"
  rule: "#d4d9df"
  control: "#9aa3ae"
  quiet: "#f4f6f8"
  navigation: "#161616"
  navigation-hover: "#292929"
typography:
  chord:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "72px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  target:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "54px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0"
  outcome:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "72px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  subheading:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
  label:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  support:
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  control: "2px"
  square: "0px"
spacing:
  tight: "8px"
  choice-gap: "10px"
  compact: "12px"
  inset: "16px"
  group: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 18px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 18px"
  button-secondary-hover:
    backgroundColor: "{colors.quiet}"
  field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  navigation-link:
    backgroundColor: "{colors.navigation}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 12px"
  pool-choice:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px"
  exercise-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "18px 20px"
  degree-choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 4px"
    height: "85px"
  self-rating:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 18px"
  disclosure:
    textColor: "{colors.ink}"
    padding: "12px 0"
  evidence-pattern:
    textColor: "{colors.ink}"
    padding: "18px 0"
---

# Design System: Jazz Ear Lab V2 - Signal Route

## Overview

**Creative North Star: "Signal Route / Split Desk"**

Signal Route makes the listening task legible through black navigation, yellow task/action emphasis and humanist text. A cool open ground separates white paper controls without enclosing whole screens in cards. The repeated visual signature is a task or outcome anchor beside the working response or evidence area.

Split Desk carries that relationship through entry, customization, practice, Results and Insights. Desktop separates anchor and work; mobile stacks the same semantic order. Large musical symbols and accuracy figures lead, while timing, playback status and disclosed detail stay subordinate. Materials are flat and changes of state are immediate; no decorative raster plates or animation are owed.

**Key Characteristics:**
- Black navigation and restrained yellow wayfinding.
- Cool open ground, white controls and gray structural rules.
- Humanist Source Sans 3 with zero tracking.
- Desktop anchor/work split and mobile semantic stack.
- Accuracy-led evidence and equal-weight M1 self-rating.

### Scope and Sources

This is the delivered V2 visual system, replacing the superseded forest/mint V2 description under explicit visual-replacement approval. It does not replace the root Legacy design system, change naming/product intent or authorize Release 2. Mode belongs to the [matching surface brief](.impeccable/surfaces/jazz-ear-lab-v2-index-html.md): **Operate**. Its old implementation-stage wording is historical, not a current delivery claim.

Ground truth is [v2.css](v2.css), [index.html](index.html) and the modular [V2 app adapter](../src/v2/app.ts); the adapter uses the existing QuestionLifecycle rather than a new visual-state engine. Authority is the [identity selection](../.impeccable/decisions/2026-10-24-visual-identity-selection.json), [approved full-flow extension](../.impeccable/decisions/2026-10-24-split-desk-flow.md), [PRODUCT.md](../PRODUCT.md) and [UX principles](../UX_PRINCIPLES.md). Analytics formulas, denominators and cohort policies remain in those UX/specification documents, not in the token layer.

Reference families are the approved [C - Split Desk board](../.impeccable/mocks/signal-route/03-split-desk.png) and the flow boards [Entry and Harmony](../.impeccable/mocks/signal-route-flow/01-entry-and-harmony.png), [M1 states](../.impeccable/mocks/signal-route-flow/02-m1-states.png) and [Results and Practice settings](../.impeccable/mocks/signal-route-flow/03-results-and-practice-settings.png). Generated lettering, icon approximations and illustrative numbers are not tokens or domain authority.

### Evidence Boundary

Existing final captures in [the review directory](../.impeccable/review/) were sampled alongside source; this documentation pass did not run a browser, rebuild, test the app or recertify accessibility. Capture fixtures are synthetic, not personal practice evidence. Capture families:

| Family | Desktop file / actual PNG size | Mobile file / actual PNG size |
| --- | --- | --- |
| M2 practice | desktop.png / 1440x1000 | mobile.png / 390x844 |
| Entry | home-desktop.png / 1440x1000 | home-mobile.png / 390x844 |
| Harmony | harmony-desktop.png / 1440x1000 | harmony-mobile.png / 390x1267 |
| Practice settings | settings-desktop.png / 1440x1000 | settings-mobile.png / 390x925 |
| Results | results-desktop.png / 1440x1000 | results-mobile.png / 390x912 |
| Insights | insights-desktop.png / 1440x1032 | insights-mobile.png / 390x1153 |
| M1 before Done | m1-desktop.png / 1440x1000 | m1-mobile.png / 390x844 |
| M1 self-rating | m1-grade-desktop.png / 1440x1000 | m1-grade-mobile.png / 390x844 |

Additional states: targets-mobile.png (390x1077), invalid-settings-mobile.png (390x1084). Exact M2 reference reproduction: [hero-repro.png](../.impeccable/review/hero-repro.png) (1077x422). Taller PNGs are full-page captures of a 390x844 phone viewport or the desktop viewport, not new responsive breakpoints.

The [existing independent finish review](../.impeccable/review/finish-review.md) initially returned **fix**; the same reviewer subsequently returned **ship**, limited to its five listed material fixes: target hierarchy, mobile primary focus reach, cool ground, M1 rating fallback and disclosure target size. This is not whole-surface, device or accessibility certification. It records the mobile primary focus action at approximately y=788-832 within an 844px viewport, with scope, caveats and denominators retained.

The automated responsive image gate remains **open/failed**: scaling the fixed-pixel responsive layout from 1440 to 1077 misaligns its regions. It was not forced or passed. The separate exact-size M2 comparison is approximately 90% (90.09% in the review), not a whole-flow pass. Physical iOS/Safari, screen-reader walkthroughs and acoustic verification remain outside this evidence. Review outcomes are evidence notes only, never normative tokens.

## Colors

The palette is black and yellow over a faintly cool field, with white interaction surfaces and cool gray separators. Frontmatter owns the exact reusable values.

### Primary
- **Signal Yellow** (`signal`): task/result bands, primary commands, active navigation/step underlines and proportional evidence fills.
- **Pressed Sun Yellow** (`signal-hover`): primary-button hover, not a replacement page background.

### Secondary
- **Recovery Red** (`danger`): invalid/unsaved notices and error text/border. It is not the Incorrect self-rating color or a performance heatmap.

### Neutral
- **Paper White** (`paper`): buttons, fields and the mobile configuration action region; inverse navigation text.
- **Cool Listening Ground** (`ground`): the continuous page/workspace background, distinct from the white controls.
- **Reading Ink** (`ink`): text, ordinary focus outlines and native checkbox/range accents.
- **Quiet Graphite** (`muted`): playback status, contextual summaries and qualifying evidence text.
- **Structural Gray** (`rule`): dividers, exercise outlines and answer-choice borders.
- **Control Gray** (`control`): field/secondary-button strokes and scrollbar thumb.
- **Quiet Surface** (`quiet`): secondary hover, selected configuration step and table headers.
- **Navigation Black** (`navigation`) and **Navigation Hover** (`navigation-hover`): the flat persistent header and link hover.

**The Signal Has a Job Rule.** Yellow marks the current task, command or measured bar; open content remains on the cool ground, while fields and secondary controls remain white.

## Typography

**Display Font:** Source Sans 3, with Segoe UI and sans-serif fallbacks.
**Body Font:** The same humanist family; no separate display or monospaced family.

Local files provide regular, medium, semibold and bold weights (400/500/600/700) with swap loading. See [font provenance](fonts/README.md), [OFL](fonts/OFL.txt) and [asset attribution](ASSETS.md) for Source Sans 3 and Lucide ISC licensing.

### Hierarchy
- **Chord / outcome:** the large anchor roles in frontmatter; chord changes to compact display (48px) on mobile, outcome to (56px).
- **Target:** separate M1 degree line using the target role, compacting to (40px) on mobile. It remains stable before and after Done; it inherits semibold from the prompt.
- **Headline / title / subheading:** ordinary page, section and item hierarchy, not promotional display. Customization headings use (26px); session titles (24px), then (18px) on mobile.
- **Body / label / support:** normal copy, semibold commands and quiet status. Input text remains the body size. Medium weight appears in summaries and saved-preset titles; mobile preset titles are (16px).
- **Evidence support:** correct-response/replay figures use semibold (28px, line-height 1.1), then (22px) on mobile; tabular numerals align outcomes, support figures and tables. Supporting mobile labels/notes use (14px/13px).
- **Readable detail:** explanatory paragraphs and caveats have an observed maximum measure (72ch), rather than a fixed-width prose card.

**The Musical Anchor Rule.** Chord and requested degree stay prominent; accuracy is the primary evidence figure, with response timing visually secondary.

## Layout

The reusable desktop grid is `minmax(230px, 1fr) minmax(0, 3fr)` with the section gap from frontmatter. At a 1440px viewport the main outer box is capped (1344px), its side insets are (24px), and usable content is (1296px). The grid therefore resolves to an anchor (318px), gap (24px) and work area (954px). This is the delivered 1:3 track ratio, not the direction brief's approximate one-third/two-thirds composition.

Desktop main padding is (28px 24px 48px). The header's content aligns to the same content edges; its minimum height is (50px). Session bands bleed to the main box edges, with a minimum height (49px). Headings, feedback and controls retain predictable places rather than floating panels. Repeated exercise items alone have an outline; saved presets and page sections are unframed rows/regions.

At the compact breakpoint (max-width 700px), the header wraps the brand above navigation and main padding becomes (24px 16px 40px). Anchor/work and evidence grids become one column. At the observed phone width (390px), content is (358px). The M2 grid changes from six equal columns/two rows (85px-high choices, 10px gap) to four columns/three rows (56px-high choices, 8px gap). Chord/prompt precede controls; no answer choices disappear.

Configuration uses three equal independently accessible step controls. Pool grids auto-fit minimum tracks (84px desktop, 72px mobile). The mobile action region is fixed to the bottom, white, with two columns, a full-width Start and safe-area inset. The page reserves bottom space `calc(220px + env(safe-area-inset-bottom))`; long quality lists stay in ordinary page flow. A full-page screenshot's compositor placement does not establish that content is unreachable.

Insights keeps scope above two filters, then primary outcome and supporting evidence. At desktop the filters use two tracks capped (220px); mobile keeps two equal tracks. Compact scope uses a remaining-width track plus a disclosure track (130px), with its label and assessment source spanning both. Pattern rows become stacked labels, bar, counts and full-width action. Only the labelled detailed table region scrolls horizontally; its table minimum width is (620px).

**The Same Order Rule.** Mobile stacks anchor before work without dropping task controls, evidence counts or material caveats.

## Elevation & Depth

No box shadows, gradients, raised surfaces or decorative transitions are defined. Separation comes from the cool ground, white controls, gray rules and black/yellow bands. The sticky error strip and fixed mobile configuration region use stacking for availability, not simulated elevation. Reduced-motion preferences explicitly disable transitions/animation and use automatic scroll behavior; no decorative motion is part of the shipped vocabulary.

**The Flat Desk Rule.** Use rules and tonal contrast for structure; do not turn open task regions into elevated cards.

## Shapes

Controls and repeated exercise items have barely softened corners through the control radius. Navigation/step underlines and Stop's separator are square. Ordinary strokes are (1px); active underlines are (4px), not rounded card accents. Buttons have a target floor (44x44px); labelled pool rows are at least (44px) high around native (20px) checkboxes. Standard disclosures are at least (48px) high, while Full comparison conditions is at least (44px), including its wrapped mobile label.

Visible keyboard focus uses an ink outline (3px) with offset (3px), switching to Signal Yellow in the black header. Focus styling does not enlarge layout tracks. Programmatic page-heading/main focus omits the outline; interactive controls retain it.

## Components

### Buttons

Compact, direct and labelled. Primary commands use signal/ink; secondary controls use paper/ink with a control-gray stroke. Default and hover assignments live in frontmatter; secondary hover also changes its border to ink. Disabled controls have reduced opacity (0.48) and a not-allowed cursor. There is no separate decorative pressed-state animation.

M1 Done spans the response width with a larger label (24px) and minimum height (56px). Correct and Incorrect use equal secondary styling, equal grid tracks and the same minimum height (56px); neither is promoted with yellow/green/red. Replay remains secondary; task-column replay uses (48px) minimum height and (20px) text. Stop is a transparent command in the yellow session band with a left separator, not a red danger button.

### Inputs / Fields

White native selects/number fields use the field tokens, control-gray strokes and visible focus. Pool choices retain native checkboxes within labelled outlined rows; hover uses quiet fill/control-gray border and checked state uses ink. The volume slider retains a native track/thumb with an ink accent and adjacent percentage output. Invalid/unsaved status is explicit red text; invalid drafts do not visually masquerade as saved. Recovery uses the sticky alert strip with a pale error background (#fff0f1), danger border and labelled retry/dismiss action.

### Navigation

The black header contains the brand and icon-plus-text Practice, Insights and Legacy links. Active location uses a yellow bottom rule and semibold text; hover uses navigation-hover. Desktop links have minimum height (50px); mobile links (44px). Current state uses `aria-current`, not color alone. Configuration steps use native buttons with `aria-current="step"`, quiet active fill and the same square yellow underline, not a forced wizard.

### Repeated Items

Only M1/M2 exercise entries are outlined compact items with title, Start and Customize; primary Starts are yellow. Saved/focused presets are secondary unframed rows with quieter Start controls. Configuration, practice and evidence sections are not nested cards.

### Practice Workspace

The task anchor contains known chord, prompt and M1 target/method where applicable. M2 provides the stable twelve-choice grid. Feedback reserves a line (24px minimum); the separate playback status reports actual sounding audio. M1's reference-ready empty-feedback fallback is **Rate your response**, independently of **Reference playing**. Incorrect reveals the native non-target/Unknown selector only in its existing state. Replay, Reveal and manual Next/Finish keep their established applicability. These visual patterns do not redefine readiness, first evidence, synthesis or automatic progression; see [UX principles](../UX_PRINCIPLES.md) and [lifecycle ownership](../V2_QUESTION_LIFECYCLE.md).

### Evidence and Disclosure

Results use a yellow page band and large accuracy anchor with assessed/unassessed text. Insights places scope before accuracy and directly labelled yellow bars beside supported pattern evidence. Bars have a low gray track (10px high); their percentage widths come from real evidence, and adjacent text carries the same values. Timing remains secondary and unavailable values remain text, not fabricated zeroes. Native details/summary reveal full settings, conditions, timing/replay detail, question review, breakdown and history. Full conditions can expand across the scope width; detailed tables retain native headers/caption and a focusable labelled scroll region.

### Semantics and Assets

The permanent polite, atomic live announcer sits outside the replaceable main content. Native buttons, labelled fields, fieldsets/legends, details/summary, a skip link and alert/status regions carry semantics; decorative Lucide glyphs have empty alternatives alongside visible labels. Focus keys restore the operated control on relevant rerenders. These are observed implementation provisions, not an accessibility certification. Runtime imagery consists of interface SVGs; there are **zero decorative raster plates**. Approved boards and review screenshots remain development references, not runtime assets.

The sidecar's ten self-contained, `ds-`-scoped examples sample these delivered primitives. Its synthesized eight-step OKLCH ramps are panel previews only, not additional approved CSS colors or contrast-tested state choices.

## Do's and Don'ts

### Do:
- **Do** keep black navigation, yellow task/action emphasis and white controls distinct from the cool open ground.
- **Do** preserve the anchor/work relationship and stack its semantic order on mobile.
- **Do** keep musical anchors and accuracy prominent, with timing and playback status subordinate.
- **Do** give M1 Correct and Incorrect equal visual weight and retain explicit self-rating labels.
- **Do** retain native semantics, visible focus, labelled evidence and the interaction target floor.
- **Do** keep long settings reachable and confine horizontal scrolling to detailed evidence.

### Don't:
- **Don't** reintroduce forest/mint identity into V2 or apply this replacement to Legacy.
- **Don't** turn full task sections into nested/elevated cards or cover open content with yellow.
- **Don't** remove counts or material caveats to fit a mobile screenshot.
- **Don't** treat generated comp text, glyphs or example numbers as domain truth.
- **Don't** use these visual tokens to redefine metrics, lifecycle behavior or Release 1 scope.
- **Don't** treat captures, component previews or a limited fix verdict as whole-surface accessibility certification.

## Target pools, voicing mix and Overall extension (2026-10-26)

The user approved the voice-mix desktop/mobile compositions. The implementation
extends the existing Signal Route system: per-quality checkbox groups, labeled
original-voice range controls and unrecorded audition in Targets; Overall/M1/M2
navigation, primary degree/confusion evidence and subordinate timing/replay in
Insights. Existing typography, colors, controls and Split Desk breakpoints remain.
Desktop/mobile captures were inspected and the module navigation spans the scope
width on mobile. This extension does not replace tokens or the visual identity.
