# V2 critique follow-up

The user selected core singing/keyboard work first and all five priority findings
plus both secondary findings from the whole-V2 critique. This change extends the
existing M1/M2 Split Desk design rather than replacing its identity.

## Delivered behavior

1. Guided Singing groups target notes horizontally within each chord. The complete
   default three-chord/six-note sequence comes before Done and fits the inspected
   390×844 and 320×844 viewports; 1440×1000 is also checked. Longer custom sequences
   can still require scrolling. Per-note checking remains independently scored.
2. Progression settings/actions preserve keyboard focus across rerenders. After
   self-rating, focus moves to the next unrated note (or Next/Finish), bringing it
   into view. The existing persistent live region announces progression readiness,
   checking and playback; route changes clear stale single-chord announcements.
3. Results reference replay preserves expanded question and progression details.
   Visible Reference playing and Stop reference controls accompany playback;
   stopping or natural completion returns focus to Replay whole reference.
4. Insights Sessions and latest matching session include progression runs, with
   direct result URLs that survive reload. Dates and session entries reflect the
   selected evidence, including progression-only history.
5. Source conditions show readable chord/beat sequences, BPM, notes per chord,
   targets, voice mix, volume and timing availability. Implementation versions
   remain inside a secondary Technical versions disclosure.
6. Chord editing controls explicitly name their occurrence: Chord 2 beats,
   Move chord 2 up and Remove chord 2. Singing notes also have labelled groups.
7. Empty progression Insights names the selected exercise and opens its matching
   configuration instead of directing users exclusively to M1/M2.

No audio scheduling, note generation, scoring formulas or stored-record schema
changes are required. Existing progression and single-chord records remain in
place; the history integration reads their current data.

## Verification

- TypeScript build and `npm test`: passed (16 test-file subtests).
- `npm run test:v2:critique`: passed. Exercises both progression modes through
  real controls: narrow-screen target visibility, keyboard tabs, partial ratings,
  submit, replay stop/natural completion, retained disclosures, readable conditions,
  matching results links/reload, empty state and contextual chord control names.
- `tests/browser-v2-progression.mjs`: passed. Retained arbitrary-order answers,
  whole replay, first grades, storage-failure retry, singing reference readiness,
  partial ratings, Overall 1/7, no progression timing sample, preset isolation,
  Unlimited and audio peak checks.
- `tests/browser-v2-m1-grading.mjs`: passed.
- `tests/browser-v2-target-mix.mjs`: passed, covering Customize, unrecorded audition,
  frozen practice configuration, Results and Overall.
- Runtime evidence: `.impeccable/review/v2-critique-fixes/`. Screenshots use isolated
  generated practice records; they are not evidence of learning improvement.
- Browser checks used installed Chromium; the default Edge binary for older suites
  is unavailable. Previously reproduced failures in unchanged homepage/general
  V2/Split Desk tests remain outside this change; no full-suite-green claim is made.

The Impeccable launcher/detector is absent, so no detector or accessibility
certification is claimed. Physical audio quality, Safari/iOS and real screen-reader
walkthroughs remain unverified. Pushing this branch does not deploy the public site.
