# 05: Progression Recognition: complete harmonic answer board

**What to build:** Listen to a whole progression and answer every target position on one A Harmonic Board, in any order, then compare selected and correct degrees at their original musical positions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Use the compact task band and actual chord occurrences as the board anchor. Desktop places ordered note positions beneath chord columns; mobile stacks chord groups with neighbouring positions together. Do not lead with a giant generic chord count.
- [ ] Keep all target positions on one answer surface, including repeated chords and 1–4 positions/chord. Long content scrolls vertically with no forced serial editor, hidden targets or pagination.
- [ ] Preserve the complete initial-listen gate, legal options, Don't know, arbitrary answer order and whole-progression replay that retains entered answers.
- [ ] Preserve complete-answer joint submission, first per-note outcomes and replay attribution. Checking compares selected/correct degrees at the same target positions, with established reference and Next/Finish behavior.
- [ ] Preserve musical/keyboard reading order, contextual field names, stable focus/status and interruption/save-recovery behavior; data and audio scheduling remain unchanged.
- [ ] Establish only the reusable progression group/target-position presentation needed by this working Recognition slice; keep the existing Guided Singing route usable until 06 migrates it.
- [ ] Verify desktop 1440/mobile 390/320 with 2×1, 3×2 and 32×4 content, repeated symbols and supported long chord labels. Test missing-answer blocking, early/late/middle fill order, retained replay, joint check and unchanged Results/Overall note-grain evidence.

**Spec acceptance coverage:** T8, T10, T11, T12.

**Design authority:** confirmed V2 Configuration, Practice and Answering Layout Redesign specification; approved C+B config and A practice briefs/compositions. This ticket does not reopen design selection.
