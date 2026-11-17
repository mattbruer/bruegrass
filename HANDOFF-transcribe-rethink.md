# Transcribe: back to the drawing board

A brief for redesigning how a recording becomes something you can learn, play along with, or arrange. Written after a long round of trying designs on the `tune-by-section` branch (29 commits, not merged; `main` is untouched).

## The jobs

Each feature must work alone or together (Strum Machine + Amazing Slow Downer + a light Logic).

1. **Learn a part.** Most people. "I want the mandolin break." Slow it down, see where it is, maybe draw the notes, loop it, play along. They don't care about the rest of the song.
2. **A play-along.** The chords of a song (or a part of it) for the band to play, at a steady tempo.
3. **A full recording** (the user's own Logic workflow). Map the whole reference: bars, sections, chords, every part drawn. Then a new song at a steady tempo, rearranged by section (copy a chorus, use a verse as a starting point, drop the fiddle and dobro breaks), MIDI replaced by real takes.

The design should make job 1 nearly effortless, and not make it pay for job 3.

## What real recordings do (the hard part)

- **Accidental crooked bars.** On and On, around bar 106: the guitar solo was improvised, the band got lost and adjusted. Nobody meant a 5-beat bar. Asking "add or remove a beat?" is hard even for a Berklee grad listening slowly.
- **Intentional crooked bars** are clearer, but still happen anywhere.
- **Solos are almost always over the verse or chorus changes** (bridges are rare in bluegrass). So a solo whose length differs from its verse means something went off.
- **An extra bar at the end of a solo** is common before the singing returns or the break passes on. Not always.
- **Pickups.** A verse's first notes are often sung in the last beats of whatever comes before. Only the tune has a pickup; chords and band stay on the bar lines. Not needed until the melody is drawn.
- **Time signature** must be known before bars can be found. Compound times (6/8) wait for their strum patterns.
- **Beat 1 is often within the first second.** The lanes currently start at the lead-in, not at 0:00.

## Tried and dropped (and why)

| Tried                                                            | Why dropped                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Transcribe and arranger sharing one song, always in sync         | The arrangement isn't the recording: sections get dropped, copied, reordered |
| "Split the tune / Keep as one / Pickup" panel in the arranger    | Buttons nobody understands; the tune should just follow the sections         |
| A pickup chosen per section ("Tune starts …") in the naming step | Confusing; pickups are only relevant once there's a melody                   |
| A page of written instructions                                   | Nobody reads; must be idiot-proof                                            |
| Big name buttons (Intro, Verse, Chorus…)                         | Users want to type the name, on the track lane                               |
| Tapping beat 1 blind                                             | Easier to see the song on a lane with a playhead (tap kept as an option)     |
| Snapping beat 1 to the nearest hit                               | Moved it off where the user put it; trust the user                           |
| A separate "how do you count it" step with explanations          | Time signature belongs with beat 1, as plain choices with a "?"              |
| "Fix this bar" with beats − / +                                  | Users can't tell whether to add or remove; ask where "one" is instead        |
| Separate passes for checking bars and naming parts               | Labour-intensive; one pass at most                                           |
| Every part of the whole song required                            | Most people want one part                                                    |

## Principles learned

- Ask only what the user knows ("where is 'one'?"), and let the app work out the rest.
- Show the music: a track lane, a visible draggable playhead, deep zoom, slow-down.
- Fewest words; never instruct what the controls already make obvious.
- Scope first ("the whole song, or one part?"), so the common case is short.
- The easy path must never pay for the messy one; messy tools appear only when needed.
- Accidents belong to the recording, not the arrangement: straighten them when sending.
- Try it by hand before trusting a design; sketch the messy case (bar 106) first.

## Worth keeping (on the branch, as parts)

- `transcription/drawRecording.js` + `RecordingStrip.svelte`: the waveform drawn from the audio, only what's on screen, Logic-style around a zero line, zoom to 512× (single samples), draggable playhead knob.
- `beats/snapToHit.js` `tapToHit`: a tap moved back onto the hit just before it (reaction time).
- `TranscriptionState.oneIsHere` + `beatGrid.withOneAt`: fix bars by saying where "one" is; the bar before takes whatever beats it had.
- `SpeedControl.svelte`: one speed slider for every screen.
- `formatClock(seconds, { tenths })`.
- The "focus" idea: one part chosen first (`focus = { name, from, to }`), beats found only within it.
- `melody/sections/` + `state/SectionedText.svelte.js`: the tune kept by section so it moves with the chart in the arranger (no buttons), a renamed copy getting its own tune, section pickups laid over the end of what comes before.
- Send to the arranger (`arrangeFromTranscription.js`): practise one part, or build an arrangement from chosen sections.
- Transcribe in the top bar.
- `transcription/gridViews.js`: the grid showing only what a step needs.

## Open ideas, not tried

- **Solo length check:** name a solo "played over the Verse"; if its length differs, say so ("one bar longer: an extra bar at the end?"), and write it in the chart as the verse plus its extra bar.
- **Straighten on send:** accidental odd bars made regular when an arrangement is made.
- **Point at likely drift:** where strong hits stop landing on "one". Test on On and On, bar 106, before building.
- **Lanes from 0:00**, not the lead-in.
- **Pickups noticed in the roll:** notes drawn just before a part, offered as its pickup.

## Suggested next step

Start from the three jobs. For each, sketch the least a person must do, and walk the messy case (On and On, bar 106; a solo with an extra bar) through it before writing code. Build the new design from `main`, taking parts from the branch.
