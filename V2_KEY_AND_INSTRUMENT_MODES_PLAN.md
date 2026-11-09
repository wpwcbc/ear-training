# V2 progression keys and instrumental modes — interview

Status: interview closed, ready for specification (2026-10-29, Asia/Hong_Kong).
Specification: [V2 Progression Keys and Play by Ear](V2_KEYS_AND_PLAY_BY_EAR_SPEC.md),
published as a repository-local ready-for-agent document.

No further user decisions are needed at this stage. This is a requirements/design
record, not application implementation authorization. Explicit user decisions and
agent-selected defaults are distinguished below; the numbered rounds remain a
historical record, not outstanding questions.

## Consolidated understanding

### Progression keys — explicitly confirmed

- Every progression mode keeps an editable C-reference source, including minor
  and borrowed harmony. Selecting a practice key changes sounding/displayed
  practice chords, without rewriting the source chord inputs or chord qualities.
- Provide Fixed key and Random key. Random supports a selectable 12-key pool
  and All. Draw once per question, using shuffled equal-coverage cycles; avoid
  adjacent repeats across cycles when more than one key is selected.
- Replay and reference retain the question's chosen key and targets.

### Two instrumental modes — explicitly confirmed

- **Single Chord · Play by Ear** and **Progression · Play by Ear** are dedicated
  listen-first instrumental-reproduction modes, distinct from shown-degree
  Audiation and system-graded Degree Recognition.
- Show known harmony but hide target degrees during listening and performance.
  Automatically run demonstration → count-in → accompaniment-only performance.
  There is no manual Start playing step and no degree-answer board.
- Single-chord performance uses one four-beat bar and a one-bar count-in, with
  configurable BPM. Progression uses its configured BPM and chord durations.
- Done becomes available only after performance accompaniment naturally ends.
  Done triggers the full reference; correct degrees and self-assessment follow.
- Self-assessment supports All correct, or marking incorrect target positions
  with optional wrong-degree/Unknown annotations, followed by explicit Remaining
  notes correct and submit. Untouched positions are not silently assessed before
  that confirmation. There is no microphone/MIDI pitch grading.

### Evidence — explicitly confirmed

- Record post-accompaniment completion delay from natural backing completion to
  the first Done, freezing it before reference listening and self-assessment.
- It includes subsequent thinking/playing and button interaction; it does not
  establish actual played-note onset or verified rhythmic/instrument fluency.
- Each question/phrase contributes at most one timing sample, never one per note.
  Display comparable all-correct-question timing summaries separately for each
  Play by Ear mode. Incorrect/unassessed phrases earn no positive timing result.
- Keep this new metric out of existing Overall response-time statistics.
  Assessed note outcomes contribute to Overall accuracy with clearly identified
  instrumental/self-assessed provenance. Preserve existing modes and metrics.

### Agent-selected defaults — no additional interview required

After Q15, the user objected to routine confirmation questions. The assistant
undertook to use its stated recommendations and label them as defaults; these
items are not recorded as explicit yes answers to Q16–Q19.

- Replaying before Done restarts the full demonstration/count-in/backing cycle
  with the same key and targets. Mark replay-assisted timing separately from
  unassisted timing; do not promote it as a fresh unassisted speed result.
- Audio/background interruption invalidates the interrupted timing rather than
  making it zero; offer recovery while preserving existing evidence. Post-Done
  reference/review does not overwrite first Done or submitted self-assessment.
- Judge self-assessed pitch-class/degree and target order; permit a comfortable
  octave for the instrument. Do not add independent rhythm grading.
- Default to Fixed C (zero transposition). Random initially selects all 12 keys;
  one selected key is valid, no selected key disables Start with a correction.
- Preserve old preset chords, sounds, custom names, links and history. Do not
  guess the old tonic, silently rewrite old chords into C, or fabricate old
  Play by Ear timing. New questions retain the source/key configuration and
  actual sounding harmony needed for faithful reference/results.

General vocabulary: [GLOSSARY.md](GLOSSARY.md). Feature vocabulary:
[CONTEXT.md](CONTEXT.md). No ADR is needed for these reversible feature choices.

## Historical interview

## Requested scope

- All progression modes: edit a C-key source progression, with a separate target-key setting.
- Fixed target key or random draw from a selectable key pool; provide All.
- A new progression instrumental reproduction mode: listen to the complete phrase, play it back as a whole, then self-assess without degree-answer submission. Allow All correct or marking individual errors and what was played instead.
- A new single-chord listen-then-play instrumental reproduction mode. The user explicitly corrected the initial audiation interpretation: hear the target first, then imitate it.

Preserve the distinction between self-assessed playing and objectively graded recognition; no pitch verification was requested.

## Current implementation facts

- Existing Transpose destructively changes saved/editor chord symbols rather than retaining a C-source progression (`src/v2/progression-ui.ts`, Transpose control).
- Current progression config has no target-key policy or random pool (`src/v2/progression.ts`).
- Progression recognition plays target melody and asks for degrees. Progression audiation shows requested degrees, plays accompaniment, and exposes self-rating after the full reference.
- Single-chord audiation already supports the played response-method tag. A dedicated entry must make its task clear.
- Existing progression evidence is marked sung; a new instrumental task must not inherit this provenance.
- Existing self-ratings freeze per target position. A bulk All correct must mean an explicit assessment of each position, rather than an inferred whole-phrase result.

## Decision tree and first frontier

1. C-source semantics → target-key display, spelling, minor/borrowed harmony and historical preset conversion.
2. Random-key granularity → pool weighting, repetition and replay stability.
3. Listen-then-play task → target visibility, playback/reference boundaries and per-position self-assessment.
4. Single-chord instrumental task → dedicated entry, shown targets versus imitation and method provenance.
5. Error annotation vocabulary → degree versus note name, Unknown and evidence granularity.

### Round 1 — answered (2026-10-29, Asia/Hong_Kong)

Q1. Keep edited chords in canonical C even when target is another key, including minor/borrowed chords; transpose sounding/practice chords rather than modifying the source?
Recommended: yes. Dm7–G7–Cmaj7 at target Eb sounds/displays Fm7–Bb7–Ebmaj7 while the editor remains unchanged.

Q2. Draw a random key per question/phrase or once per practice session?
Recommended: per question/phrase; replay/reference keep the same drawn key.

Q3. Is progression instrumental reproduction listening to the melody with known chords but hidden target degrees, then reproducing the whole phrase, without degree-answer fields?
Recommended: yes; distinguish imitation from shown-degree audiation.

Q4. Does single-chord instrumental audiation show the requested degree and require playing it before hearing the target reference, rather than first hearing the target and imitating it?
Recommended: yes, retaining the M1 task with instrumental production.

Q5. For a wrong note, should optional detail be the chord-relative degree played, or an absolute note name?
Recommended: optional wrong degree plus Unknown; this is post-performance annotation, not a degree quiz.

Confirmed answers:
- Q1 yes: retain C-source chords, transpose actual practice harmony including minor/borrowed qualities.
- Q2 yes to the recommendation: draw per question; replay/reference retain that question's key; All selects all 12 pitch-class keys.
- Q3 yes: progression demonstration precedes whole-phrase instrumental reproduction; target degrees are hidden initially; no degree-answer submission.
- Q4 correction: the single-chord mode also demonstrates the target before instrumental imitation. It is not a shown-degree audiation task.
- Q5 yes to the recommendation: optional wrong chord degree or Unknown, as post-performance annotation rather than a quiz.

Both new modes are self-assessed instrumental reproduction. They do not replace the existing degree-audiation or recognition modes. At this round, labels, performance/reference boundaries and metrics were open; later rounds resolve them.

### Round 2 — answered; timing policy was then open (2026-10-29, Asia/Hong_Kong)

Q6. Random sampling: shuffled equal-coverage key cycles versus independent draws that can repeat?
Recommended: shuffle the selected keys, use each once per cycle, avoid immediate repeats across cycles when pool has more than one key.

Q7. Instrumental performance accompaniment: after the demo, manually start a count-in/accompaniment-only pass, versus playing without app accompaniment?
Recommended: an explicit Start playing action; progression uses configured tempo and accompaniment without target melody, single chord uses its chord accompaniment; no microphone/MIDI verification.

Q8. Checking boundary: Done triggers the whole reference, then exposes correct degrees and self-assessment?
Recommended: yes; no target-degree disclosure during the initial demonstration or the user's attempt.

Q9. Bulk rating: All correct explicitly rates every target; alternatively mark errors and explicitly confirm Remaining notes correct before submitting?
Recommended: yes. Merely marking an error does not silently assess all other positions.

Q10. Paired names: Single Chord · Play by Ear and Progression · Play by Ear?
Recommended: yes, a third family beside Degree Audiation and Degree Recognition.

Q11. Evidence: separate instrumental modules/provenance, contributing assessed notes to Overall accuracy but no speed score?
Recommended: yes; self-ratings remain clearly distinguished from system-graded recognition.

Confirmed answers:
- Q6 yes: shuffled equal-coverage key cycles, with no immediate repeat across cycles when more than one key is selected.
- Q7 rejects a manual Start playing step. User wording: 「不用 彈完後立刻countin 立刻伴奏 由完成伴奏後開始計時 若是一伴奏沒法彈奏 之後多花時間想的話就會用這個時間」. An automatic demonstration → count-in → accompaniment-only performance pass is the current interpretation; the meaning of the initial 「彈完」 is being checked before treating this full phase sequence as settled.
- The timing start requested by the user is natural performance-accompaniment completion, capturing additional time spent thinking/playing afterward. Timer end and validity rules are not yet confirmed.
- Q8 yes: Done triggers full reference followed by correct-degree disclosure and self-assessment; target degrees remain hidden during demo/attempt.
- Q9 yes: All correct, or mark errors then explicitly confirm Remaining notes correct and submit. Untouched positions are not silently assessed before confirmation.
- Q10 yes: Single Chord · Play by Ear and Progression · Play by Ear.
- Q11 not yet answered: the user asks whether speed should count. No Overall timing inclusion or exclusion for the new modes has been approved. Existing modes' timing contracts remain unchanged.

### Round 3 — confirmed (2026-10-29, Asia/Hong_Kong)

Recommendation discussed: record post-accompaniment completion delay as its own descriptive metric, not as verified playing speed. Keep phrase timing at one sample per question, never duplicate it per target note. Consider a comparable all-correct-phrase median within each Play by Ear mode; keep the incompatible metric out of existing Overall response-time statistics. This recommendation was accepted in Q12–Q15.

Q12. Confirm automatic demonstration completion → immediate count-in → accompaniment-only pass, with no manual Start playing action?
Recommended: yes for both new modes.

Q13. Timing end and early Done: allow Done only after performance accompaniment naturally completes, measuring from that completion to the first Done press and freezing before reference/self-rating?
Recommended: yes; finished-on-time attempts yield near-zero additional delay, including button interaction.

Q14. Timing/accuracy presentation: separate Play by Ear post-accompaniment delay, comparable all-correct-phrase medians only, no inclusion in Overall response-time statistics; assessed per-note self-ratings can contribute to Overall accuracy with explicit instrumental/self-assessed provenance?
Recommended: yes. Incorrect/unassessed phrases do not earn a positive speed result and no per-note timing is inferred.

Q15. Single-chord Play by Ear performance accompaniment duration: one four-beat bar with configurable BPM, and a one-bar count-in?
Recommended: yes; progression uses its configured chord durations and BPM. Do not add these new controls to the existing single-chord modes.

Confirmed answers:
- Q12 yes: both new modes automatically proceed demonstration → count-in → accompaniment-only performance pass, without a manual Start playing step. This resolves the Q7 wording ambiguity.
- Q13 yes: Done is unavailable until natural performance-accompaniment completion. That completion starts the timer; first Done stops and freezes it before reference/self-rating. Button interaction is included; a near-zero value is not verified in-time playing.
- Q14 yes: the metric is post-accompaniment completion delay, with one sample per question/phrase. Summaries use comparable all-correct phrases, exclude incorrect/unassessed phrases from positive timing results, and do not contribute this metric to existing Overall response-time statistics. Assessed per-note self-ratings can contribute to Overall accuracy with explicit instrumental/self-assessed provenance. This resolves Q11.
- Q15 yes: single-chord performance backing is one four-beat bar with one four-beat count-in and configurable BPM. Progression uses configured chord durations/BPM. Existing single-chord modes gain no such controls from this feature.

### Round 4 — not individually answered; recommendations adopted as agent defaults

Q16. Pre-Done replay/recovery: restart the full demonstration → count-in → backing cycle, retaining the same drawn key/targets; classify replay-assisted attempts separately from unassisted timing. Audio/background interruption invalidates the interrupted timing rather than treating it as zero; recovery is explicit. Post-Done reference/review cannot overwrite the frozen first Done time or first submitted self-assessment.
Recommended: yes.

Q17. Self-rating criterion: matching pitch class/chord degree in the correct target order; octave-equivalent playing allowed, rhythm not independently graded. Post-accompaniment delay remains a separate descriptive metric, not a rhythm/pitch verification.
Recommended: yes, allowing a comfortable instrument register.

Q18. Key-setting defaults and invalid pools: fixed C initially; Random initially offers all 12 selected keys; All selects all 12. One selected key is valid, none disables Start with an actionable error. Defaults must not silently enable randomization for existing presets.
Recommended: yes.

Q19. Existing data: preserve old chord symbols, sound and historical records; initially use zero transposition (C reference), without guessing the old progression's tonic or automatically rewriting it into C. Old records gain no fabricated Play by Ear timing sample; new questions freeze both source/key settings and actual sounding harmony.
Recommended: yes; users can edit their C-reference source explicitly.

Closure: the user requested fewer obvious questions. The assistant stated it
would adopt these recommendations as defaults and document them, rather than
continue individual confirmations. The consolidated record above distinguishes
these defaults from Q1–Q15's explicit decisions. No further interview is needed
before specification work; application implementation has not started.
