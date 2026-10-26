# 04: Guided Singing complete flow

**What to build:** Let a musician perform the displayed sequence over continuous harmony, hear one full reference and self-assess every target position independently.

**Blocked by:** 03: Editable progressions and multi-note practice.

**Status:** ready-for-agent

- [ ] Expose Guided Singing independently and show all requested degrees/chord occurrences before the initial pass.
- [ ] Play full accompaniment without a separate target melody. Do not apply single-chord M1 target-pitch-class exclusion; all-chord-tone target sets still retain harmony.
- [ ] Keep Done unavailable until the initial complete accompaniment pass finishes. Interrupted/failed playback cannot falsely unlock completion.
- [ ] Done triggers the full accompaniment-plus-target reference; self-rating follows hearing that reference, without chord-local or isolated-note checks.
- [ ] Record Correct/Incorrect per target position. Incorrect requires a different supported wrong degree or Unknown; unassessed remains distinct from incorrect.
- [ ] Keep automatic Recognition and singing self-rating provenance explicit. Never claim microphone/pitch verification or infer per-note grades from an overall rating.
- [ ] Persist first individual outcomes and frozen question material; reference/review replay and repeated actions cannot replace or duplicate grades.
- [ ] Browser tests cover full pass, replay, Done, reference and partial self-assessment; target sets and voice continuation/cancellation receive appropriate public audio checks.
