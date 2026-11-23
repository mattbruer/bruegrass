# Chord scales: the rules we work from

Notes in our own words from Dick Lowell and Ken Pullig, _Arranging for Large Jazz Ensemble_ (Berklee Press), chapter 1 (pp. 11–24) and chapter 8 (pp. 105–106). The scans are on the user's Mac in `reference/Matt/` (not in git). Page numbers are the book's. This file is the source for the chord-scale data in `src/lib/arranger/theory/`; when the two disagree, fix whichever is wrong and say which.

## How to read the tables

- A **chord scale** is the stepwise set of notes that suits a chord symbol in its context (its function in the key or mode). It's the raw material for lines and voicings (p. 15).
- Each scale degree is one of:
  - **chord tone**: plain number (1, 3, ♭3, 5, ♭5, ♯5, 6, 7, ♭7).
  - **T: tension**: an available upper extension (9, 11, 13 and altered ones). Sounds fine held, on a strong beat.
  - **S: scale approach**: the book's "avoid note". It belongs to the scale but isn't sounded as part of the chord: it's used as an approach note, moving by step to a chord tone or tension (pp. 11, 15).
- Degrees are counted from the chord's root. In the tables below, the chord's own tones come straight from its symbol; what the tables add is which other notes are T and which are S.

## Melody: target notes and approach notes (pp. 11–14, 106)

- **Target notes** are the melody notes heard as the chord: long or emphasized chord tones and tensions. The line-writing procedure (p. 106) adds: notes followed by a leap or a rest, notes that begin or end a phrase, and notes at the point of a chord change.
- **Approach notes** are short notes that lead by step to a target. Kinds:
  - **Scale approach (S…)**: a diatonic whole or half step into the target. Its S label is read against the chord of the target note.
  - **Chromatic approach (ch)**: a half step into the target, usually outside the key.
  - **Double chromatic (ch ch)**: two short, equal notes moving by half steps in the same direction into the target.
  - **Indirect resolution (S S, ch ch, S ch, ch S)**: two short, equal notes approaching the target by step from opposite sides.
- Chromatic notes (outside the chord scale) are used only when needed, and resolve by step to the next note (p. 106).
- An approach note can be harmonized on its own (pp. 11–14), or the band can hold the target's chord under it (the "independent lead" method, p. 14). For chord suggestions this means **only target notes decide which chords fit**; approach notes only have to resolve properly.

## Major key (C), diatonic (p. 16)

| Chord     | Scale      | Tensions     | Approach (avoid) |
| --------- | ---------- | ------------ | ---------------- |
| I (triad) | Ionian     | 9, 13, **7** | 4                |
| I6        | Ionian     | 9, 7         | 4                |
| Imaj7     | Ionian     | 9, 13        | 4                |
| II-7      | Dorian     | 9, 11        | **6**            |
| III-7     | Phrygian   | 11           | ♭2, ♭6           |
| IVmaj7    | Lydian     | 9, ♯11, 13   | none             |
| V7        | Mixolydian | 9, 13        | 4                |
| VI-7      | Aeolian    | 9, 11        | ♭6               |
| VII-7♭5   | Locrian    | 11, ♭13      | ♭2               |

Notes: over the plain triad the major 7th is a tension; on I6 the 6 is a chord tone. The 6 on II-7 is an approach note even though it's a whole step above the 5th (it makes a tritone with the ♭3). That's the one row a plain "half step above a chord tone" rule gets wrong.

## Minor key (C minor) (p. 17)

Built on three parent scales: natural minor, melodic minor (ascending, "jazz minor"), harmonic minor.

| Chord           | Scale                                   | Tensions          | Approach |
| --------------- | --------------------------------------- | ----------------- | -------- |
| I-, I-maj7      | harmonic minor                          | 9, 11             | ♭6       |
| I-, I-6, I-maj7 | melodic minor                           | 9, 11, 7 (on I-6) | none     |
| I-, I-7         | natural minor                           | 9, 11             | ♭6       |
| II-7♭5          | Locrian                                 | 11, ♭13           | ♭2       |
| ♭IIImaj7        | Ionian                                  | 9, 13             | 4        |
| ♭III+maj7       | Lydian augmented                        | 9, ♯11            | 6        |
| IV-7            | Dorian                                  | 9, 11             | 6        |
| V7(9,♭13)       | Mixolydian ♭13 (from melodic minor)     | 9, ♭13            | 4        |
| V7(♭9,♭13)      | Mixolydian ♭9 ♭13 (from harmonic minor) | ♭9, ♭13           | 4        |
| ♭VImaj7         | Lydian                                  | 9, ♯11, 13        | none     |
| ♭VII7           | Mixolydian                              | 9, 13             | 4        |

## Borrowed (modal interchange) chords in a major key (p. 18)

Chords borrowed from the parallel key (same tonic), used in the major key.

| Chord                                      | Scale            | Tensions   | Approach |
| ------------------------------------------ | ---------------- | ---------- | -------- |
| I-7                                        | Dorian           | 9, 11      | 6        |
| ♭IImaj7                                    | Lydian           | 9, ♯11, 13 | none     |
| ♭IIImaj7                                   | Lydian           | 9, ♯11, 13 | none     |
| ♭III+maj7                                  | Lydian augmented | 9, ♯11     | 6        |
| IV6, IVmaj7 (going to IV-, or after V7/IV) | Ionian           | 9, 13      | 4        |
| IV-6                                       | melodic minor    | 9, 11, 7   | none     |
| IV-7                                       | Dorian           | 9, 11      | 6        |
| V-7                                        | Dorian           | 9, 11      | 6        |
| ♭VImaj7                                    | Lydian           | 9, ♯11, 13 | none     |
| VI-7♭5                                     | Locrian ♮9       | 9, 11, ♭13 | none     |
| ♭VIImaj7                                   | Lydian           | 9, ♯11, 13 | none     |
| ♭VII7                                      | Lydian ♭7        | 9, ♯11, 13 | none     |

Note ♭VII7 differs by context: Mixolydian in a minor key (p. 17), Lydian ♭7 when borrowed into major.

## The primary dominant, V7 (p. 19)

Many scales work on V7. The choice comes from the tensions in the chord symbol, the melody's notes, the context, and taste.

| Chord                        | Scale                  | Tensions                         | Approach                      |
| ---------------------------- | ---------------------- | -------------------------------- | ----------------------------- |
| V7                           | Mixolydian             | 9, 13                            | 4                             |
| V7sus4                       | Mixolydian             | 9, 13                            | **3** (the 4 is a chord tone) |
| V7(♭9,13), V7(♯9,13)         | Mixolydian ♭9 ♯9       | ♭9, ♯9, 13                       | 4                             |
| V7(9,♭13)                    | Mixolydian ♭13         | 9, ♭13                           | 4                             |
| V7(♭9,♭13), V7(♯9,♭13)       | Mixolydian ♭9 ♭13 (♯9) | ♭9, ♯9, ♭13                      | 4                             |
| V7alt, V7(♭5,♭9)             | altered                | ♭9, ♯9, ♭13 (♭5 is a chord tone) | none                          |
| V7(♯11)                      | Lydian ♭7              | 9, ♯11, 13                       | none                          |
| V+7                          | whole tone             | 9, ♯11 (♯5 is a chord tone)      | none                          |
| V7(♭9,♯11,13), V7(♯9,♯11,13) | half-whole diminished  | ♭9, ♯9, ♯11, 13                  | none                          |

## Secondary dominants (p. 20)

A secondary dominant resolves down a fifth to a diatonic chord other than I. **Rule: if the target chord has a major 3rd, use Mixolydian; if it has a minor 3rd, use a scale with ♭13.**

| Chord (in C) | Scale             | Tensions      | Approach |
| ------------ | ----------------- | ------------- | -------- |
| V7/II (A7)   | Mixolydian ♭13    | 9, ♭13        | 4        |
| V7/III (B7)  | Mixolydian ♭9 ♭13 | ♭9, (♯9), ♭13 | 4        |
| V7/IV (C7)   | Mixolydian        | 9, 13         | 4        |
| V7/V (D7)    | Mixolydian        | 9, 13         | 4        |
| V7/VI (E7)   | Mixolydian ♭9 ♭13 | ♭9, (♯9), ♭13 | 4        |

(♯9 in parentheses: optional, shown that way in the book.)

## Substitute dominants (pp. 20–21)

**Every subV7 (a dominant resolving down a half step to a diatonic chord) takes Lydian ♭7**: tensions 9, ♯11, 13; no approach notes. In C: subV7/II E♭7, subV7/III F7, subV7/IV G♭7, subV7/V A♭7, subV7/VI B♭7.

## Dominants that don't resolve: "special function" (pp. 21–22)

Dominant 7ths that move neither down a fifth nor down a half step. They're color chords, usually in a blues context, often moving to I. **Most take Lydian ♭7** (9, ♯11, 13; no approach notes). Exceptions:

| Chord (in C)                                 | Scale                 | Tensions                  | Approach |
| -------------------------------------------- | --------------------- | ------------------------- | -------- |
| I7, I9                                       | Mixolydian            | 9, 13                     | 4        |
| I7(♯9)                                       | "blues scale"         | ♯9, ♭5 (as a tension), 13 | none     |
| I7(♯9,13)                                    | half-whole diminished | ♭9, ♯9, ♯11, 13           | none     |
| III7 (E7)                                    | Mixolydian ♭13        | 9, ♭13                    | 4        |
| II7, ♭III7, IV7, ♭V7, ♭VI7, VI7, ♭VII7, VII7 | Lydian ♭7             | 9, ♯11, 13                | none     |

The I7 blues row matters for bluegrass: it's the book's version of a "bluesy" I7, and its ♯9 is our blue ♭3.

## Diminished 7th chords (p. 23)

Three kinds, by what the chord does:

- **Passing diminished** (♯I°7, ♯II°7, ♯IV°7, ♯V°7: a dim7 a half step below the next chord's root). Scale: the key's notes with the chord's tones in. Tensions are the key's notes a whole step above a chord tone; key notes a half step above a chord tone are approach notes (S♭2, and S4 on ♯I°7, ♯II°7, ♯V°7; on ♯IV°7 the 4 is a tension).
- **Chromatic diminished** (♭III°7, resolving to II-7): the same idea, approach note on the ♮3.
- **Auxiliary diminished** (I°7, V°7: a dim7 on the same root as the chord it decorates). Whole-half diminished scale: every note between chord tones is a tension, no approach notes.

## Modal tunes (p. 24)

**In a modal context there are no avoid notes.** Each mode has a **characteristic note** that gives the mode its color and should be used freely:

| Mode       | Tonic chord | Characteristic note |
| ---------- | ----------- | ------------------- |
| Ionian     | Imaj7       | 4                   |
| Dorian     | I-7(13)     | 6                   |
| Phrygian   | I-7(♭9)     | ♭2                  |
| Lydian     | Imaj7(♯11)  | ♯4                  |
| Mixolydian | I7          | ♭7                  |
| Aeolian    | I-7         | ♭6                  |
| Locrian    | I-7♭5       | ♭5                  |

For bluegrass: a Mixolydian tune (Old Joe Clark) is modal, its ♭7 is the point, and its ♭VII chord is a chord of the mode, not a borrowed one.

## Using this for bluegrass

These are our working assumptions, to try by ear. They aren't from the book.

- **Bluegrass is triad-based.** The triad rows (the I row's "7 is a tension") apply to the chords the band plays; the seventh-chord rows apply when the chart actually has the 7th.
- **A tension in the melody doesn't change the chord.** A held 2 or 6 over G is G's T9 or T13: the band still plays G, not Gadd9 or G6.
- **Blue notes.** A ♭3 or ♭7 over a major chord is idiomatic (a bent ♭3 over G). Treat them like the I7(♯9) blues row: tensions, not clashes, on I and IV.
- **Strong beats come from the boom-chick.** In 2/4 or cut time, the bass's beats (1 and 3 in 4/4) are the strong ones. A strong-beat note is a target unless it's short and steps straight into a longer note.
- **Picking target notes**, combining p. 106 with beat strength: long notes, notes on the bass's beats, notes followed by a leap or a rest, the first and last notes of a phrase, and notes where the chord changes. Everything else is an approach note if it moves by step into the next note.
- **A chord fits a bar** when every target note is a chord tone or a tension of that chord's scale, and every approach note steps into its target (scale or chromatic). An approach (S) note on a target is the sign of a poor fit.

## Where this lives in the code

- `theory/chordScaleBook.js`: the tables above, row for row, as the book writes them (`1 T9 3 S4 5 T13 T7`); `theory/degreeLabels.js` reads that notation.
- `theory/chordTypes.js`: every kind of chord, its notes in the same notation, and whether it's everyday bluegrass (major, minor, 7th) or a jazzier colour.
- `theory/chordScaleFor.js`: which row a chord gets from what it does (the key and the chord it goes to): a dominant falling a fifth (V7/x: Mixolydian, or a ♭13 scale before a minor chord), falling a half step (subV7: Lydian ♭7), the key's own chord, a borrowed one, a dominant that doesn't resolve, a passing, chromatic or auxiliary diminished. A row written for a seventh chord serves the triad on the same root, its 7th becoming a tension; a sus chord's 3rd becomes an approach note. A chord no row fits gets the key's notes, a note a half step above a chord tone being an approach note.
- `theory/melodyTargets.js`: target notes (sounding as the chord changes, on the bass's beats, longer than a beat, or before a leap or a rest) and approach notes (anything else that steps to the next note).
- `theory/chordsThatFit.js`: every root with every chord type, tried in a chord's place; it fits when every target is a chord tone, a tension or (on a major I or IV) a blue note, everywhere the chord plays, and some melody note under it is one of its chord tones. Ranked by how much of the melody's weight its chord tones carry, less a little for each note outside the key or beyond the triad (tuning in named constants at the top).
- `instruments/voicing.js`: a chord voiced on a fretted instrument when it's asked for (then remembered): the instrument is data; the chord's character notes (3rd, 7th or 6th, altered 5th, added 9th) are kept first, then the root, the plain 5th left out first. `instruments/guitarVoicing.js` is the guitar at the bottom of the neck (frets 0–4, root in the bass), after your shapes and the built-in ones; the mandolin's chop (`instruments/mandolin.js`) keeps its movable major and minor shapes and voices every other type with all four courses fretted near its home fret.
- `theory/passingChords.js` + `chart/passingChordSuggestions.js`: chords for approach notes (pp. 11–14): the target chord's V7 (and V triad), its tritone sub, the target chord moved by the melody's step (chromatic or parallel), the key's chord a step away (diatonic), a passing diminished a half step below; each only when the approach note is one of its chord tones or tensions. Only approach notes on a beat, in bars of quarter-note beats; plainest first. `chart/withPassingChord.js` writes one into its bar (`|G,G7|`).
- Shown in the chord dialog: tap a chord on the strip. `ChordsThatFit.svelte` lists the chords that fit the melody (the chart's own first, then bluegrass, then jazzier behind a button); tapping one puts it in the box and says why. `PassingChords.svelte` lists passing chords for the approach notes under it; Add writes one into the bar (the harmony parts then ask before they follow).

Not done yet: the chord tutor and `chordScales.js` still use their own scale choice (they'll read these tables once the suggestions are tried by ear); Mixolydian tunes aren't a key the app knows, so the modal page's "no avoid notes" isn't used. A voicing doesn't know the melody yet: a top-note voicing, or picking which notes to keep from the melody note, is one more input to `voiceChord`.
