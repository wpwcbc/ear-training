# 07: Integrated four-mode setup-to-evidence journeys

**What to build:** Complete the redesigned configuration-to-practice-to-evidence journey in every mode, including keyboard/narrow-screen and saved-history use, and deliver a reviewable integrated release candidate.

**Blocked by:** 01 — M1/M2 configuration: chapters, disclosures and valid Start; 02 — Progression configuration: custom harmony to saved practice; 04 — M1 Harmonic Board: target, reference and self-rating; 06 — Guided Singing: visible phrase and per-position checking (03 and 05 are required transitively)

**Status:** done

- [x] Every earlier ticket brings its own passing acceptance; this ticket does not defer their validation. Combine C+B configuration with A practice in all four modes and verify direct Start/Customize still work.
- [x] Run complete Customize → existing optional audition → Practice → current-question check/self-rating → Results → Overall flows on isolated synthetic records, verifying the configured conditions remain frozen and reload/history remain available.
- [x] Check preset/context switching, valid saves, invalid drafts and storage-failure recovery across chapter changes and practice entry; preserve unrelated presets and records without data migration.
- [x] Confirm default and long/repeated progressions, keyboard-only interaction and desktop 1440/mobile 390/320 across the combined surfaces, including representative layout boundary/zoom checks. No attached action area covers a field, error, note or final control.
- [x] Review representative runtime config/practice/check/error captures against the approved A and integrated C+B compositions. Actual model values and enablement govern generated-image discrepancies; no new visual identity or workflow.
- [x] Run the TypeScript build, normal meaningful tests and affected browser regression coverage. Report inherited baseline failures separately without weakening musical/evidence assertions or claiming a fully green suite without evidence.
- [x] Verify Legacy, Results and Insights retain existing behavior and records while remaining outside visual redesign scope, including first-answer/self-rating grain, frozen replay and unavailable progression timing.
- [x] Record completed acceptance, representative visual evidence, code review and remaining physical-audio/Safari/screen-reader limits. Do not claim publication/deployment or learning effectiveness from local automation.

**Spec acceptance coverage:** T1–T12: integrated journeys; earlier tickets retain ownership of their individual cases.

**Design authority:** confirmed V2 Configuration, Practice and Answering Layout Redesign specification; approved C+B config and A practice briefs/compositions. This ticket does not reopen design selection.

Delivery and verification: [implementation report](../../../V2_LAYOUT_REDESIGN_IMPLEMENTATION.md). Completed locally on 2026-10-27; deployment is separate.
