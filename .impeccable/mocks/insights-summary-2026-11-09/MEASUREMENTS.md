# Raster measurements and comparison contract

All values below are original image pixels, relative to the extracted panel.
These are measured raster targets, not recovered CSS. Glyph height estimates
cannot identify a font's CSS size exactly; compare rendered text-region crops
at scale 1 before accepting typography. No tolerance is implicitly authorized.

## Overview geometry

| Element | Desktop 1084 x 956 | Mobile 379 x 956 |
| --- | --- | --- |
| Header | y 0..59 | y 0..38 |
| Content bounds | x 26..1063 | x 21..361 |
| Scope controls | y 156..194, height 38 | y 86..144, rows 25 |
| Totals | y 217..247 | y 153..188, two lines |
| Summary | y 271..492 | y 220..394 |
| Summary accent | x 30..40, y 329..420 | x 23..30, y 257..347 |
| Narrative lines | y 331,363,395, line step 32 | y 258..341, line step about 18 |
| Practice action | x 855..1054, y 429..474 | x 225..357, y 352..383 |
| Evidence action | x 34, y 442 | x 25, y 362 |
| Main column divider | x 519, y 508..825 | no vertical divider |
| Confusion controls | x 334..490, y 509..541 | x 231..360, y 403..426 |
| Confusion header | y 556..584 | y 434..454 |
| Selected row | y 584..621 | y 454..480 |
| Expanded contribution | y 621..730 | y 480..554 |
| Remaining rows | y 730..768..806, step 38 | y 554..580..606, step 26 |
| Matrix bounds | x 537..1054, y 610..730 | x 22..360, y 711..798 |
| Matrix rows | height 40 | height 29 |
| Label column | width 57 | width 40 |
| Degree columns | about 62 each, seven columns | about 43 each, seven columns |
| Legend | y 756..778 | y 835..863 |
| Secondary rules | y 851,893,935 | y 876,907,938 |

Desktop visible glyph heights: brand about 26, H1 44, section titles 28,
narrative 22, controls 18, matrix values 18, secondary disclosure 22. Mobile:
brand 17, H1 28, section titles 18, narrative 15, controls 12, matrix values 12.
Headings/selected rows/actions are bold; narrative and helper copy regular.
Use the source image to verify weight and wrapping, not an inferred font name.

## Detail panel geometry

| Panel | Regions and measures |
| --- | --- |
| Matrix 971 x 503 | header 0..40; title/scope 50..109; controls 118..152; rule y167; matrix x135..453,y248..413; four 79px columns and 41px rows; evidence divider x623,y185..486; evidence x650..944; footer y433..493 |
| Evidence 448 x 503 | header 0..40; back x22,y51; title y86; scope y118; totals y146..184; roots table x25..428,y223..315,31px rows; source divider y330; selector x25..428,y364..399; action x25..428,y439..482 |
| Setup 971 x 373 | header 0..37; back y49; title y77; fields x31 and285,y120..278,step25; rule y297; actions x25..256 and275..497,y312..353 |
| Return 450 x 372 | header 0..40; title x22,y62; filter x25..112,y105..145; scope y157; rule y188; selected row y202..261; count x340; detail chevron x414 |

Detail heading glyph heights about 30; body 18..20; controls 18. Source/evidence
tables use a single horizontal rule between rows, not standalone cards.

## State panel geometry

All six panels: header y0..52; period control x18..186,y65..107; content
x18..454; first rule y123; title y144..165. Lower-row panels differ by about
4px in the first rule/title; retain their individual reference crops.

No records/empty period: icon x40..85,y204..257; message x118..430,y203..253;
action x91..401,y302..350. Unassessed: icon x24..78,y203..253; message x98,
y203..227; support y240; rule y288; footer y315..338.

Limited: icon x29..70,y185..226; heading x100,y183; support y214..254;
rule y275; limited indicator x24..229,y286..320; explanation x24,y331..371;
action x91..401,y387..435. All-correct: icon x26..78,y188..240; heading
x105,y183..234; support y250; rule y292; secondary text y318; action
x91..401,y382..431. Unknown-direction: icon x25..78,y190..241; message
x98,y182..234; support y246; rule y288; explanation x16,y315..357 and evidence
x312,y327. State headings about 24px glyph height, body about 20, action 24.

## Known source restrictions

These state/detail crops are panels, not approval for adding a framed card or
new page. Existing documented corrections still apply. Native overview sizes
are actual comparison viewports; 1440/390/320 checks are responsive observations,
not independently approved visual references. Do not stretch references to them.
