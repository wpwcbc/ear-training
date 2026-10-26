# Progression compositions — ticket 01

Status: Ready for user composition review; approval is pending. These static
HTML proposals do not implement playback, persistence or grading. All examples
are synthetic. Existing application code and browser records are unchanged.

The existing Signal Route / Split Desk visual identity is retained. Prototype
navigation is for reviewing screens, not proposed application navigation.

| Surface / state | Desktop | Mobile | HTML |
| --- | --- | --- | --- |
| configure | [View](configure-desktop.png) | [View](configure-mobile.png) | [Open](configure.html) |
| recognition | [View](recognition-desktop.png) | [View](recognition-mobile.png) | [Open](recognition.html) |
| singing | [View](singing-desktop.png) | [View](singing-mobile.png) | [Open](singing.html) |
| singing-ready | [View](singing-ready-desktop.png) | [View](singing-ready-mobile.png) | [Open](singing-ready.html) |
| singing-reference | [View](singing-reference-desktop.png) | [View](singing-reference-mobile.png) | [Open](singing-reference.html) |
| singing-review | [View](singing-review-desktop.png) | [View](singing-review-mobile.png) | [Open](singing-review.html) |
| results | [View](results-desktop.png) | [View](results-mobile.png) | [Open](results.html) |
| singing-results | [View](singing-results-desktop.png) | [View](singing-results-mobile.png) | [Open](singing-results.html) |
| states | [View](states-desktop.png) | [View](states-mobile.png) | [Open](states.html) |

Recognition demonstrates arbitrary-order answers with filled beginning/end and
unfilled middle positions. The focused G7 field demonstrates keyboard focus.
Singing stages are separate proposals, not simultaneously enabled states.
The long-board example has 24 individually labeled positions in a local scrolling
region; its repeated chord occurrences retain distinct identities.

Verification: all nine pages were captured in Chromium at 1440px and 390px
(18 PNGs), and checked for whole-document horizontal overflow. HTML/source and
visual review identified and corrected conflated singing stages, incomplete rating
coverage, closed mix disclosure, biased Correct styling and ambiguous replay labels.
This establishes reviewable compositions, not functional or physical-device tests.

The fixed mobile configuration action bar belongs to the existing design. Full-page
captures display it at viewport height; it remains viewport-attached when browsing.
Do not read that screenshot placement as a content row in the progression editor.

All requested screen families are prepared. Ticket 01 remains open until the user
explicitly approves these compositions. Tickets 02–08 are not implemented; their
blocking edges remain in force. Existing unit/browser suites were not rerun for
this static mock-only change. No new dependencies or application routes were added.
