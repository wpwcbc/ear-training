# 02: Progression Recognition minimal complete flow

**What to build:** Let a musician practise a common progression with one target per chord end to end: hear the full sequence, answer every position on one board, submit once and inspect actual per-note results.

**Blocked by:** 01: Desktop/mobile progression compositions.

**Status:** done

- [x] Expose Recognition directly, with visible chord sequence/current-chord indication and degree relative to the current chord, not the key.
- [x] Generate independent targets from the appropriate quality pools; retain ordered occurrence identities even when chord symbols repeat.
- [x] Play accompaniment plus melody continuously, hide expected degrees and enable the whole board only after initial playback completes.
- [x] Allow last/first/middle answers in any order, editing before submission and whole replay without regenerating material or erasing answers. No local/isolated-note replay.
- [x] Require each slot to contain a supported degree or Don’t know before joint submission. Don’t know is incorrect without a fabricated confusion direction.
- [x] Persist the first submitted answer set and note outcomes; reveal correct degrees and offer a full reference. Review cannot duplicate or overwrite first grades.
- [x] Provide minimal valid session/Results persistence with frozen targets/configuration; later tickets extend session controls rather than postponing evidence integrity.
- [x] Exercise the real browser flow and model/audio public contracts where needed; interruption, replay replacement and navigation cannot publish false completion or stale sound.

Delivery evidence is recorded in the V2 progression modes implementation report. Automated checks and manual limitations are distinguished there.
