# Jazz Ear Lab — Project Intent

> **Status:** Confirmed project intent (2026-10-23)  
> **Purpose:** This document defines *why* Jazz Ear Lab exists, *what musical ability it aims to develop*, and *how to judge whether a design supports that goal*. It is a product-direction reference, **not** a feature specification, curriculum syllabus, technical architecture, or approval of a particular implementation.

## 1. Mission

Jazz Ear Lab is an ear-training system for developing **accurate, fast, and increasingly automatic hearing of jazz melody in harmonic context**.

Its ultimate musical aim is to help a musician hear another player's phrase, understand its relationship to the underlying harmony, and respond musically; or internally imagine a phrase and know what it sounds like and how it relates to the changes—without consciously calculating every note.

The app's **primary responsibility** is strengthening hearing, recognition, and audiation. Translating that hearing into immediate bass execution is an important downstream goal, but deserves a separate practice mode or workflow rather than being treated as proof of success in every ear-training exercise.

## 2. Primary user and problem

The initial reference user is a jazz bassist who already understands music theory and common chord progressions, but wants to reduce the delay between:

1. **Hearing → understanding:** hearing a lick played by another musician and quickly perceiving its chord-relative role and melodic intervals, sufficiently to formulate a response.
2. **Audiating → knowing:** imagining a lick and understanding its pitches or harmonic relationships naturally, rather than deriving each note intellectually.
3. **Knowing → playing:** transferring that understanding to the bass promptly. This is a related goal to address with a dedicated instrumental workflow.

A broader target audience or public-product positioning has **not yet been decided**.

## 3. Target musical ability

### 3.1 Continuous Harmonic Hearing

The intended outcome is **Continuous Harmonic Hearing**: a melody is heard as music unfolding *within changing harmony*, not simply as isolated intervals or a sequence of manually decoded labels.

The user's preferred real-world strategy is a flexible hybrid:

- **Phrase beginnings / anchors:** readily perceive an opening note's **chord degree** in the current harmonic context.
- **Small melodic movements:** frequently follow the phrase using **relative intervals**, contour, and familiar melodic movement.
- **Large leaps, phrase endings, and harmonic landmarks:** use chord-relative functions (including chord tones and guide tones) to reorient when helpful.
- **Chord changes:** remain aware of the changing harmonic context; in less familiar or irregular progressions, explicitly re-anchor more often when necessary.

These are **useful listening strategies, not mandatory rules** about which mental method must be used for any particular note. Both chord-degree recognition and relative-interval recognition should be cultivated, then integrated.

### 3.2 Accuracy before speed

**Fast and wrong is still wrong.** Accuracy has priority over response speed.

The desired development is:

1. Recognize accurately in a meaningful harmonic context.
2. Maintain that accuracy with unfamiliar melodic material.
3. Generalize across keys.
4. Gradually reduce the time required for *correct* responses.

Being correct through slow conscious calculation can be a useful intermediate step, but it is **not** the ultimate musical outcome.

## 4. Scope and learning progression

### 4.1 Start with familiar harmonic language

Prioritize **diatonic progressions and common non-diatonic cadences**, for example:

- ii–V–I and other familiar diatonic movement;
- *Autumn Leaves* changes;
- Rhythm Changes;
- backdoor progressions / cadences.

The first goal is to internalize the *sound* of chord tones, guide tones, melodic tension, and resolution in these recognizable contexts, instead of repeatedly reasoning through their theoretical names.

Irregular or less predictable progressions (for example, *Dolphin Dance*) are a **later expansion**, where the listener may need to establish new harmonic anchors more frequently.

These examples indicate musical scope; they are **not** an exhaustive or fixed curriculum sequence.

### 4.2 Order of generalization

Once a particular harmonic context is becoming familiar, the preferred order of challenge is:

1. **Novel melody (first):** vary starting degrees, intervals, contour, leaps, and melodic material while the harmonic context remains recognizable.
2. **New keys (second):** transfer the same musical understanding across tonal centers without falling back into laborious note-name calculations.
3. **Greater speed (third):** shorten reaction time while protecting recognition accuracy.

This is an **order of emphasis**, not three locked stages. Some timing pressure and key variety can still appear earlier when appropriate. Avoid equating memorization of repeated questions with transferable hearing.

### 4.3 Progressive listening format

Support a gradual path from:

1. **Note-by-note recognition:** hear, pause, identify, and establish a reliable harmonic impression.
2. **Full-phrase dictation:** hear an uninterrupted phrase, then identify the relevant chord degrees and/or intervals.
3. **Time-constrained recognition:** respond more quickly and with less opportunity to pause or replay.

These exercise formats should remain **independently accessible**, rather than being restricted to a mandatory unlock sequence.

For the primary melody-in-context use case, it is acceptable—and often desirable—to **show the chord progression and current chord**. The task is to hear a melody *against known changes*, not necessarily to identify the changes by ear. Hiding harmonic labels may be a distinct optional challenge, not an assumed prerequisite for mastery.

## 5. Capability boundaries

| Capability | Intended role in Jazz Ear Lab | Measurement boundary |
| --- | --- | --- |
| **Listening / recognition** | Identify chord-relative degrees, intervals, and melodic movement in context. | Can be objectively scored when the app has a known correct answer. |
| **Audiation / production** | Internally hear a requested pitch, function, or phrase and attempt to sing or produce it. | Without reliable pitch capture/verification, results remain **self-assessed**, not objectively correct/incorrect. |
| **Bass / instrument execution** | Translate heard or imagined music into immediate instrumental action. | Important downstream objective; design a **separate mode or workflow**. Do not infer execution fluency from recognition scores. |

Listening and audiation both matter; neither should be mistaken for the other. They may have shared musical content and practice infrastructure, but their results require distinct interpretations.

## 6. Success criteria and Insights principles

### 6.1 What counts as progress

Evidence of progress is increasingly **accurate recognition of unfamiliar material** in a known harmonic setting, followed by **faster correct responses** under genuinely comparable conditions and ultimately transfer to other keys and progressions.

Recognition tests should report, at minimum where supported by the exercise:

- **Accuracy first:** correct, incorrect, and unassessed outcomes are not interchangeable.
- **Correct-response latency:** how quickly correct answers were submitted, interpreted alongside accuracy, not as compensation for errors.
- **Context and difficulty:** chord/progression, key, task format, melodic novelty, relevant settings, and available sample size when recorded.
- **Generalization:** distinguish familiar/repeated material from fresh material, and like-for-like comparisons from mixed settings.

**An incorrect but fast response receives no positive speed credit.** A slower accurate answer should not be rated below a rapid wrong answer merely because of latency.

### 6.2 What the data must not claim

- Submission time includes perception, reasoning, and interface interaction. **It is not a pure measure of mental recognition speed.** Keep interaction methods consistent in comparisons and label the metric honestly.
- Do not blend objectively graded recognition with self-rated audiation into a single purportedly objective accuracy score.
- Do not treat a whole-phrase or whole-run self-assessment as verified **per-note** accuracy.
- Do not claim reliable improvement from tiny samples, repeated items, or uncontrolled changes in exercise settings.
- Do not claim that better in-app recognition automatically proves improved live improvisation or bass execution.

**Optional challenge:** musical-time constraints (e.g., answer within a beat or before the next note) may be useful and enjoyable. They do **not** replace the preferred baseline measure of ordinary response latency, with accuracy taking precedence.

## 7. Product experience principles

- Provide both a **guided learning path** and **direct practice** with adjustable settings; users need not complete a course before using individual exercises.
- Move from careful, supported recognition toward coherent phrase hearing and automatic response.
- Preserve the distinction between **practice**, which may include replay, pauses, hints, and self-exploration, and **assessment**, which should clearly state its scoring and comparability limits.
- Use realistic jazz harmonic and melodic contexts. Avoid reducing the product to decontextualized music-theory quizzes or mechanical answer selection.
- Let results guide the next useful exercise, especially when they reveal systematic weaknesses, but never claim greater diagnostic precision than the recorded evidence supports.
- Prefer **musical transfer** and reliable feedback over adding modes simply to increase feature count.

## 8. Explicit non-goals and open decisions

### Not current core requirements

- Requiring users to identify an unknown chord progression before recognizing the melody over it.
- Treating bass fingerboard speed or physical execution as the main app-wide score.
- Forcing all users into a single mandatory progression of exercises.
- Optimizing speed at the expense of accuracy.
- Presenting self-reported audiation as machine-verified note accuracy.
- Teaching or testing highly irregular harmonic progressions **before** developing fluency in common contexts.

### Still open — do not assume these are approved

- Exact exercise inventory, mode IDs, and whether an exercise is a new standalone mode or a variation of an existing one.
- How to generate or curate novel melodic material and how to define an item as truly *new*.
- Specific graduation thresholds, accuracy targets, speed benchmarks, and any adaptive difficulty algorithm.
- Details of the separate bass-execution workflow and how to validate performance.
- Whether and how microphone-based singing assessment will be implemented.
- Public audience, distribution, monetization, and collaboration requirements.
- UI components, visual style, persistence schema, and engineering architecture.

## 9. Decision test for future changes

When proposing a new exercise, metric, interface element, or architectural investment, ask:

> **Will this help a musician hear unfamiliar jazz melodic material within known harmony more accurately, more quickly, and more naturally—and will we be able to tell whether it worked without overstating the evidence?**

If the link is indirect, explain it. If it cannot be justified, reconsider the feature's priority.

---

**Document authority:** The musical intent and boundaries above are drawn from the user's confirmed GrillMe interview (Q1–Q12). Explanatory phrasing, examples, and possible measurement fields provide guidance; they do not constitute approval of specific implementations. Changes to this intent should be made explicitly rather than inferred from a feature request.
