# 07: Progression replay assistance and review reporting

**What to build:** Make additional whole-sequence listening visible while distinguishing one replay event from assistance applied to multiple assessed notes.

**Blocked by:** 06: Module and Overall per-note accuracy integration.

**Status:** ready-for-agent

- [ ] Recognition’s first submission and Guided Singing Done define the pre-check boundaries; freeze their attribution across subsequent review.
- [ ] A pre-check whole replay marks every assessed target position in that question assisted. Unassessed positions do not enter the assessed assistance denominator.
- [ ] One replay of six assessed notes is one replay event and six assisted outcomes. More pre-check replays increase event count, not the assisted-note numerator beyond six.
- [ ] Initial playback and first mandatory reference are not user-requested replays; after-boundary replay belongs to separately scoped review activity.
- [ ] Do not change first correctness, fabricate per-note timing or infer assistance from a whole-run rating.
- [ ] Expose module/Overall assistance with its assessed denominator; review/all-record totals retain their own scope and labels.
- [ ] Browser and public-model checks cover both mode boundaries, mixed assessed/unassessed positions, repeated replays, duplicate identities and review without first-evidence mutation.
