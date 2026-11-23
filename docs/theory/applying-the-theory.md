# How we apply the theory

The rules the app follows when it reads a melody against the chords. They're used in two places: **the harmony parts** (how the voices move) and **the alternative chords** (what else could go on a bar or beat). The chord symbols are what the rhythm section plays; nothing here changes them unless you pick a new chord.

Each rule says where it comes from: **(book p. n)** is Lowell & Pullig, _Arranging for Large Jazz Ensemble_ (the tables are in [chord-scales.md](chord-scales.md)); **(ours)** is an assumption to check by ear. **Your call** marks a decision that's still open. Mark this page up: it's the spec, and the code follows it.

To see the rules at work, tap a chord (or any beat) on the strip: under the chords that fit, the dialog lists every melody note there, what it's doing and what it is in the chord in the box.

## 1. Which notes count

- Every melody note sounding from where the chord starts until the next chord: **the whole bar** when one chord covers it. (ours)
- A section played more than once: a chord has to work every time. (ours)
- A note held over from the bar before, sounding as the chord starts, counts. (book p. 106: notes at a chord change)

## 2. Strong and weak beats

- **Strong** = where the bass plays: beats 1 and 3 in 4/4, beat 1 in 3/4 and 2/4. Everything else is **weak**, off-beats included. (ours)
- **Your call A:** two levels (strong/weak), or a ladder (beat 1 > beat 3 > beats 2 and 4 > off-beats), where the stronger the beat, the more the note has to fit?

## 3. What each note is doing

- **Target** (heard as the chord, has to fit). Any of: it sounds as the chord starts; it's on a strong beat; it's longer than a beat; a rest or a leap (more than a whole step) follows it; the next note repeats it. (book pp. 11, 106; the strong beat is ours)
- **Approach** (not counted): any other note that moves by step (a half or whole step) to the next note. In practice: quick notes on weak beats, passing between targets. (book pp. 11–14)
- **Anticipation** (counts for the next chord): a note of the next chord arriving up to a beat early, tied across the change or repeated on it. (ours, standard theory)
- **Suspension / retardation** (counts for the previous chord): a note of the chord before, held or repeated over the change, then stepping down (suspension) or up (retardation) into the new chord. (ours, standard theory)
- If only approach notes sound under a chord, they all count: a chord put there is heard against them. (ours)
- **Your call C:** which other kinds of non-chord tone get a pass on a weak beat: a **neighbour** (steps away and back), an **escape tone** (steps away, leaps back), others? And on a strong beat, an **appoggiatura** (leapt to, resolving by step)? Today a neighbour passes (it steps on), an escape tone and an appoggiatura count as targets.

## 4. When a chord fits

- Every counted note is a **chord tone** or an **available tension** of the chord's scale, the scale picked by what the chord does there (book pp. 16–24: V7/II takes Mixolydian ♭13, a subV7 Lydian ♭7, …).
- Never a scale **approach (avoid) note**, like the 4th over a major chord, unless it's a suspension resolving into the chord. (book p. 15)
- Blue notes: a ♭3 or ♭7 over a plain major or 7th chord on I or IV counts. (ours, after the book's blues I7, p. 21)
- Some melody note under it is one of its chord tones, or the chord isn't heard in the tune at all. (ours)
- **Strong beats (decided, B):** bluegrass harmonises strong beats with **chord notes**. That's the default; a choice above the list (remembered on the device) also allows the **sweet colours** (the 6th or 9th over a major chord; the 9th, 11th or ♭7 over a minor one: the chord's pentatonic, where bluegrass melodies sit) or **any colour** (every tension, as jazz does). A blue note or a suspension is allowed on a strong beat whatever the choice. With chord notes only, D isn't suggested for bar 14 of Amazing Grace (its held B is D's 6th), though the song plays D there: switch to sweet colours to get it back. (the user's call; the sweet set is ours)

## 5. Which alternatives come first

- Every target's weight is its length, doubled on a strong beat. A chord tone scores 1, a tension 0.7, a blue note or suspension 0.5. Each chord note outside the key costs 0.15, each beyond the triad 0.1. Bluegrass chords (major, minor, 7th) are listed before jazzier ones; the chord there now comes first. (ours: numbers to tune)
- **Your call D:** what should make one alternative better: most strong-beat notes as chord tones, plainest chord, in the key, how it moves to the next chord (a dominant into its target), the same function as the chord it replaces?

## 6. The harmony parts

**Bluegrass texture** (the user): at most three parts. The melody (the lead) sits in the middle: with two parts, the lead and a harmony above it (the tenor); with three, a line above (tenor) and a line below (baritone). Almost never more; sometimes a bass singer for vocals, who mostly sings roots (not built yet).

- **Strong beats get chord tones in the voices** (the user): when the lead sings a colour note on a strong beat, the tenor and baritone still sing chord tones (the next ones up and down). Built into the Passing chords style; the stack stays as it was.

- Target notes: the stack, the next chord tone up or down from the lead, in the band's chord. (as before)
- The **Passing chords** style only: an approach note gets a passing chord of its own in the voices, plainest first (the dominant of the chord it leads to, then the key's chord a step away, then the same chord moved by the melody's step, then a passing diminished, then the tritone sub) (book pp. 11–14, 23); an anticipation takes the chord it reaches; through a suspension the voices hold their notes. (the order is ours)
- Every other style ignores all this: their lines are exactly as before.
- **Later (the user):** a layout with the **melody on top** and the voices below filling out the chord, the way jazz soli are written; it may sound good in bluegrass too. The parts are data (`harmonyParts.js`: each counts chord tones from the lead), and the baritone (−1) with the low tenor (−2) already give a version of it; a real option would be one more entry, voicing close under the lead.

## A worked example: Amazing Grace, bar 14 (chord D, key G, 3/4)

| Beat | Note       | Strong? | Doing                    | In D         | In Em       | In F          |
| ---- | ---------- | ------- | ------------------------ | ------------ | ----------- | ------------- |
| 1    | B, half    | yes     | target: the chord starts | 13 (tension) | 5th         | ♯11 (tension) |
| 3    | A, quarter | no      | approach: steps to G     | not counted  | not counted | not counted   |

With **chord notes** (the default) only Em fits: B is its 5th. With **sweet colours**, D fits too (B is its 6th). With **any colour**, F fits as well (B is its ♯11).
