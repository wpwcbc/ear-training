# Jazz Ear Lab — keys and instrumental reproduction

Domain glossary from the completed keys/instrumental-mode interview. Existing
general vocabulary remains in [GLOSSARY.md](GLOSSARY.md). This file records domain
terms; feature requirements and agent defaults belong to
[V2_KEY_AND_INSTRUMENT_MODES_PLAN.md](V2_KEY_AND_INSTRUMENT_MODES_PLAN.md).

## Language

**C-source progression**:
The editable chord sequence expressed relative to C, including minor and borrowed
harmony. Choosing another practice key leaves this original sequence unchanged.
_Avoid_: Transposed progression (when referring to the editable original).

**Practice key**:
The key in which a progression question actually sounds and its chords are shown.
It is a transposition destination, distinct from each chord's root and quality.
_Avoid_: Chord root (a progression contains multiple chord roots).

**Random-key pool**:
The selected keys eligible for a new progression question's key draw. All selects
all twelve pitch-class keys. Each selected key appears once per shuffled cycle;
with multiple keys, adjacent cycles avoid an immediate repeat. Replaying or
checking a question keeps its drawn key.
_Avoid_: Root pool (single-chord root selection is a different setting).

**Instrumental reproduction**:
Listening to a demonstrated target or phrase and then imitating it on an
instrument. The target degrees are initially hidden; performance is self-assessed.
This is distinct from degree audiation, where the requested degree is shown
before the target reference, and degree recognition, which grades chosen labels.
_Avoid_: Instrumental audiation (for a listen-first imitation task).

**Wrong-degree annotation**:
An optional post-performance description of the chord-relative degree played
instead of a target; Unknown is available. It is not a required recognition answer
and does not establish machine-verified pitch accuracy.
_Avoid_: Answer submission (when only an instrumental self-rating is being recorded).


**Play by Ear**:
The instrumental-reproduction exercise family, with Single Chord and Progression
contexts. Both demonstrate sound before the user imitates it on an instrument;
results are self-assessed rather than system-verified.
_Avoid_: Degree Audiation (for these listen-first tasks), or Degree Recognition
(which requires submitting degree labels for system grading).


**Performance accompaniment**:
The accompaniment-only pass automatically following the demonstrated sound and
count-in in Play by Ear. It does not replay the target melody. Its natural end is
the boundary after which additional completion time is measured.
_Avoid_: Reference playback (which includes the target for checking afterward).

**Post-accompaniment completion delay**:
Elapsed time from natural performance-accompaniment completion until the first
Done action. It includes any subsequent thinking, playing and button interaction;
reference listening and self-rating occur afterward. One sample belongs to the
whole question or phrase, not independently to each target note. It is separate
from the existing recognition response-time metric and is not proof of motor or
rhythmic fluency.
_Avoid_: Verified playing speed, per-note response time, or Overall response time.
