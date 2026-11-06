# Handoff: sampler pilot — get one G chord sounding right before recording anything else

Written 2026-11-06 at the end of a long brainstorming chat, updated after the build chat that followed. Read this first; `HANDOFF-sampling-session.md` is the earlier plan and is partly superseded (see the bottom).

## Where it stands (updated 2026-11-06, end of the build chat)

**Built and committed** (branch `feature/sampler`), nothing recorded yet; the user is pausing the sampler for other features and isn't set up to record right now:

- **Pilot checklist** (`checklists/guitarPilot.js`, 59 clips) from the G voicing via `checklists/voicing.js`, everything **played in motion to a click** (the user's idea: tempo sets how fast the hand crosses the strings, and posed single strokes don't sound like playing): grazes on D G B e at **80 and 140 BPM** (4 kept each: two a touch louder, two a touch lighter), plucked low E 3 and open D, dead strums, and the real boom-chuck (`pattern: true`, one take) as the A/B target at 100 BPM.
- **Bite test, set up:** the user's observation that the faster the tempo, the less the pick bites the string. Bite is a continuum (pluck = full grab, graze = a little, dead strum = none) and tempo is one thing that sets it; the later motion model (grab vs graze contact) should take it as an input. The two graze tempos are two layers (`Layer.tempo`, in target ids and file names as `normal-80bpm`). Still to do, with the Hear-it loop: compare them blind and by measured brightness/attack (low-end energy isn't measured yet), and test whether a slow graze through the arranger's "lighter touch" filter passes for a real fast one. If it does, one tempo plus the filter covers the range; if not, tempo stays a recorded layer.
- **Metronome click** while recording (`recording/clickTrack.js`; a group's `click`, a layer's `tempo` overrides it).
- **Many hits per recording** (`analysis/findHits.js`, UI `components/session/RunHits.svelte`): press R once, play as many as you like, R to stop. Every hit is found and checked; you tick the ones to keep (up to the takes still missing) and K cuts each out as a take of its own, then throws the rest of the recording away. Until then the whole recording is saved, so closing the page loses nothing.
  - **Beat-guided** when recorded to a click (`analysis/beatGrid.js`): the clear hits show where the beat falls (the player's own beat, so click and mic delays don't matter), then softer hits within 60 ms of a beat count too (a light graze right after a loud one, which the strict pass misses). Each hit's timing against that beat ("8 ms late") is shown and saved with the kept take (`analysis.offBeatMs`) for the humanizer.
  - Each hit shows its length, so the ones let ring are easy to find. "Cut short by the next hit" isn't flagged in motion, where it's expected.
  - Checked in Node (onsets within a few ms; with the beat 7 of 7 hits found against 5 of 7 without; timing within ~3 ms, limited by the 5 ms loudness windows) and end to end in the browser pane with a fake mic.

**Next:** the build order below continues: attempt log, Hear-it loop (where the bite test gets judged), humanizer (it can learn timing from `offBeatMs`), knobs.

## What changed, in one paragraph

The old plan was to record the whole guitar set (about 235 clips) with the guided session. The user decided that's too much work to risk redoing if the sound plan changes. Instead: make the sampler work on **one voicing, G major, over several numbered attempts**, until it sounds right, and only then record the rest. The sampler gets two new things for that: a way to **hear** the attempt as a bluegrass loop and compare it blind, and an **attempt log** so a second, third or fifth try is cheap. The user may start recording as soon as the pilot checklist exists, so build that first.

## How to work with this user (the most important part)

Also in `CLAUDE.md` ("How the user thinks") and the memory files `feedback-design-for-change`, `user-artist-painter-approach`.

- **They change direction often.** Make every design cheap to change: layers, data and seams, not hard-coded logic. Motto: "make everything extendable." Build as if big code changes are expensive for a human.
- **Painter's approach (John Singer Sargent).** Get what reads from a distance right first, then build detail on that foundation. Big brush first, a thin end-to-end version, then refine. Applies to code and problem solving, not just audio. Judge audio at a distance: in the band mix, quiet, on a phone speaker.
- **Code style:** short, well-named functions with clear inputs and outputs; few comments (they dislike clutter; comment only where truly needed). A junior full-stack developer (about a year's experience) should follow it without effort. Physics and DSP maths needn't be junior-readable: it may be abstracted behind a clear function or come from a library.
- **Scope discipline:** bluegrass only for now (Irish second, then others, and custom patterns). Leave seams for them; don't build UI or options for them yet.
- Code is cheap for you to write and expensive for them to read and own. Prefer a small readable version they can try over a large one they must trust.

## The design, in three layers

| Layer   | Holds                                                                                                                                                                                                         | Changes when                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Samples | single-string recordings labelled by **articulation** (pluck, graze, dead strum, later release), string, fret, intensity, direction                                                                           | recording sessions                |
| Voicing | which strings and frets sound (from the voicing engine; `guitar-chords.json` is temporary)                                                                                                                    | the voicing engine                |
| Style   | when each hit lands, which strings, down or up, how hard, which articulation; plain data plus an optional generator. Bluegrass is the only style now. Every style: voicing + meter + tempo in, timed hits out | new styles, custom patterns later |

- Name things by what they physically are ("grazed note", "plucked note"), never by role ("chuck", "boom"), so another style can reuse the clips. Checklist groups should use articulation words.
- **Chord function (user, 2026-11-06).** In bluegrass the third is often left out of a tonic chord (the chord stays ambiguous major/minor, gives the soloist space, sounds cleaner); on a dominant chord the third and seventh make the tritone that gives tension. So the voicing engine should take the chord's **function** (tonic, dominant, ...) as well as its name. The sampler is unaffected: samples are single strings at frets, and a voicing is just a list of them. Leave the seam; build nothing now. Dominants will often use fretted thirds and sevenths that open tonic shapes avoid, which is another reason to test repitching (±1, ±2) and the recorded frets (0, 2, 5, 8, 11) in the pilot. G `[3, null, 0, 0, 3, 3]` (no third) is a good first voicing; a dominant such as D7 is a good later test.
- A hit asks for sounds ("string D, fret 0, graze, medium"); the sampler finds the best matching take and falls back to a derived one. It never names files.
- Style layer reads the meter from `timeline.js`. Today only denominators 4 and 2 are supported; Irish (6/8, 9/8) will need that extended later. Not now.
- No visible style selector yet. The loop takes a style object as input and bluegrass is the one supplied.
- A later **motion model** (the strumming hand as a driven pendulum, pick path across the strings, grab vs graze contact) slots into the style layer. Today's pendulum code in `guitar.js` (`strumOffsets`, `touch`) is the first version of it behind the same inputs and outputs.

## The pilot

**The voicing.** G = `[3, null, 0, 0, 3, 3]` (low E fret 3, A muted, D open, G open, B fret 3, high e fret 3). _Correction:_ earlier in the chat I said B was open; it's fret 3. The bluegrass chuck strums the top strings (G, B, e, sometimes D); the user almost never strums all six, but the option stays open, so don't assume four. Record the real frets of the voicing, with no repitching in the pilot.

**Attempt 1 is the foundation (painter's order), about 52 clips, about 20 minutes:**

| Group                                                   | Clips | Notes                                                                                                                                                            |
| ------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grazed notes on D (0), G (0), B (3), e (3), down-stroke | 16    | 2 firm + 2 light each. The user's call: a graze is a different way of meeting the string, not just a quieter pluck, so light is recorded, not derived from firm. |
| Plucked booms: low E fret 3, open D                     | 6     | 3 takes each. Pluck = the pick grabs the string. Booms and melody notes are the same articulation.                                                               |
| Dead strums (all strings muted), down and up            | 18    | 3 intensities × 3 takes                                                                                                                                          |
| Real G strums, for comparison only                      | 12    | never used as samples; they are the A/B target                                                                                                                   |

How to play the grazed notes: a real strum motion across the strings, with the fretting hand muting every string except the target. (User may try removing strings or mounting the guitar; I advised against both for the pilot: play it held, tape-mark the mic distance, and let the sampler's loudness/brightness checks catch drift.) Keep the other strings on at first; sympathetic ringing is a later layer.

**Changed 2026-11-06 (built):** grazed notes are 6 passes per string at the normal strum, to pick the best 4 by ear later (measured loudness sorts them into a touch louder and a touch lighter); firm grazes can come in a later attempt if the loop sounds flat. The 12 single real strums became 3 takes of the real boom-chuck to a click (100 BPM, 1-bar count-in, 8 bars), so the Hear-it loop can play at the same tempo and A/B in time, lined up on the first boom. Pilot total: 51 clips.

**Later attempts add one detail at a time, each judged at a distance:**

1. Release thuds (damping a ringing string), D G B e × 2 takes: about 8 clips. Needed for chord changes.
2. Sympathetic resonance test: 4 notes recorded twice, others muted and others free in the real G shape; subtract to hear the sympathetic part. Test whether it's audible in a mix before modelling it.
3. Take-count experiment: 5 takes at one intensity for the four strings, then compare 1, 2, 3 and 5 takes, humanizer on and off, blind.
4. Light up-strokes on the top strings; half-damped chuck levels ("chuck pressure": the left hand relaxing at the strum).
5. Then a second voicing, C, tested as a G to C chord change, not as another static chord. Later G to D.

## What to build, in order (each piece usable alone)

1. **Pilot checklist** (built): a new file in `src/lib/sampler/checklists/` plus one line in `CHECKLISTS`, built from a voicing (strings plus frets), groups named by articulation, no dependence on `guitar-chords.json`. This lets the user record. Keep the full guitar checklist.
2. **Attempt log.** An attempt is a numbered pass with: a note on what's different (mic, pick, how hard they played), the settings it was heard with, and answers to the ear tests (yes / no / not sure, plus notes). Starting a new attempt lets the user choose which clips to redo and which to carry over. It's a session with a link to the attempt it came from plus the carried targets, in the style of `storage/samplingSessions.js`. Everything saves as it happens (the existing rule against losing work).
3. **Hear-it loop.** Plays a G boom-chuck loop from only that attempt's kept takes, through the same "ask for sounds" path any style will use:
   - tempo control; the existing pendulum strum spread; never the same take twice in a row
   - listening modes for judging at a distance: in the mix with the other instruments, quiet, phone-speaker/blur (mono, low-passed)
   - A/B against today's samples, an earlier attempt, or the real reference strums
   - a blind A/B mode: about 12 randomised rounds, tracks how often the user picks the real one
   - save the loop as a WAV, to judge it on the iPhone
   - native Web Audio nodes (`AudioBufferSourceNode` with `detune`, gain, one `BiquadFilterNode` per voice)
4. **Humanizer** (own module, in front of every hit; one place for the decision). Varies: which take, level, pitch (a few cents), brightness, attack strength, tail length, start point (1–2 ms into the lead-in), micro-timing. Vary them **together** from one hidden "force" value (a harder hit is louder, brighter, sharper), plus a little independent noise; independent random settings sound like a fault. Set the ranges from the measured spread between the user's real takes (the sampler already measures loudness, brightness and pitch), kept as data per articulation. Live playback may use real randomness; exported WAVs use a seeded generator (as `bassline.js` does with mulberry32) so a song renders identically.
5. **Knobs** to adjust without re-recording (dead-strum layering level and timing, humanizer range, how soft hits are made from firm). The user said a derived soft hit probably can't replace a real graze; keep it as a test knob only.

## Finish line for the pilot

All three must hold:

1. Blind A/B against the user's own real G strums at the same tempo, over about 12 rounds or more, in the mix and at a distance: they can't pick the real one more often than chance (roughly 6 of 12).
2. Blind A/B against Strum Machine at the same chord and tempo, same conditions.
3. Stopping rule: each attempt changes one thing. If two attempts in a row don't improve the score, stop and decide whether the approach needs to change. A gap that belongs to the strum motion model doesn't block finishing.

Strum Machine's bar: it assembles individual notes, chords and strums recorded on real instruments ([strummachine.com](https://strummachine.com/)). The user's bet is the opposite: single strings only, and the flexibility (voicings chosen on the fly, any style) is the difference. Don't record whole strums as samples.

## Estimates for the full set (an upper bound; the pilot will shrink it)

About 330 clips if the pilot passes and nothing is cut: grazed notes 6 strings × 5 frets × 4 takes (120); plucked notes 6 × 5 × 3 (90, serving booms and melody notes); dead strums with damping levels (60); release thuds (24); sympathetic calibration (30); fret noise and slides (12, optional). Never choose these numbers before the pilot's experiments (repitch ±1 / ±2, take count, attack/body split). About 100 clips per song, so about 20 MB decoded and a few MB to download.

## Alternate tunings (user, 2026-11-06): plan for them in the full set, not the pilot

Irish players often use Drop D (low E down to D) and DADGAD (E→D, B→A, high e→D), and there are other tunings. The pilot stays in standard tuning with one or two chords; the full recording plan must allow for tunings.

- **Why it matters for samples:** a string tuned down is slacker, so its open note sounds different (looser, longer, buzzier) from the same pitch fretted or repitched. Open strings carry Irish drones, so they matter most.
- **The seam already exists:** a checklist names its tuning (`strings` with each open pitch; `STANDARD_TUNING` in `checklists/guitar.js`), and a target's pitch is `string.midi + fret`. A Drop D or DADGAD checklist is the same strings with different `midi` values.
- **The rule to keep:** a hit asks for a string, a sounding pitch and an articulation (low string, D2, pluck), not a fret, and the sampler finds the nearest recorded take on that string, at that tuning if one exists. The manifest should record the tuning (or each string's open pitch) per sample so takes from different tunings don't mix by accident.
- **Probably enough to record:** the retuned strings' open notes and a couple of low frets in each tuning, with fretted notes higher up repitched from standard-tuning takes, if the pilot's ±2 repitch test passes. Don't fix these numbers before the pilot.
- **Sympathetic resonance changes too:** the free strings ring at different pitches in each tuning (DADGAD drones a lot), so a resonance model needs its settings per tuning.
- **A cheap test any time:** tune the low E down to D, record open D 3 times, and blind A/B it against the standard low E repitched −2. That shows whether a retuned string needs its own recordings.

## Research notes (what is and isn't established)

- Sample libraries commonly record strums per direction, add dead strums and mutes, release samples, noises, and velocity layers with up to 7 round robins ([Acoustic Guitar Strums](https://soybean-carillon-kam6.squarespace.com/acoustic-guitar-strums), [Spitfire MG Soft Guitar](https://www.soundonsound.com/news/spitfire-audio-launch-mg-soft-acoustic-guitar)). Some drop strings in soft strums (a style-layer behaviour for us) and overlap strum ends to avoid a re-triggered sound.
- Repitching: sampling every 3 semitones and shifting ±1 is common practice ([Remix64 thread](https://remix64.com/community/viewtopic.php?p=95573)); 2–3 semitones is a comfortable range. Nothing found was guitar-specific. The ear test decides.
- Sympathetic resonance: no sources found. Our reasoning: the guitar is nearly linear, so the effect is each free string acting as a small resonator (its pitches, ring time, coupling), driven by the struck note. That means measured settings per string, not a recording per voicing. Unverified; the pilot tests it. Open strings matter most. Real strumming may be nonlinear.
- Physics libraries: none found for the web aimed at this. Faust's [`physmodels`](https://faustlibraries.grame.fr/libs/physmodels) (compiles to WebAssembly) has waveguide strings and bridges but adds a build step. Pick-string contact: [Revitar 2.0](https://www.kvraudio.com/forum/viewtopic.php?p=4269918) has source (old; a reference), and a [DAFx 2008 paper](https://dafx.de/paper-archive/details/XJTIoSIXj3qqer3WzLlEHQ) covers player touch. General rigid-body engines (planck.js, matter.js, cannon-es, Rapier) exist but are probably overkill; a hand-written pendulum and contact model may serve better. Licences are unchecked. **The proper physics research is deferred until we model the strum motion.**
- Why timing matters: string delay is spacing divided by pick speed (varies through the stroke); pick depth against the curved fingerboard decides how many strings are caught; grab vs graze is friction (the string slips off the pick when its pull-back exceeds the friction limit). Simplified models; the user's ear is the judge. The recorded real strums may also calibrate the motion model by measuring when each string was struck (separating strings in a recording is hard; try it, don't promise it).

## Loading and memory (unchanged from the old handoff, plus)

- Record at the best quality and keep the masters in `samples-source/`; shipping files are built from them, so more recording is never wasted. Don't choose the compressed format before the phone test.
- Spend recordings where the ear notices: the first about 30 ms (pick attack) is about 10 KB decoded against about 190 KB for a one-second tail, so many attack variants can pair with fewer bodies (attack/body split; a fallback if the dead-strum layer fails, and possibly the main structure; ear test 3 below).
- Load only what a song needs; trim; decode one at a time; least-recently-used release; tiers (desktop more takes, phone fewer); cache compressed files (planned PWA). Fallback if phone memory bites: a custom worklet sampler holding 16-bit integers.

## Open questions (for the pilot to answer)

1. Do 2–3 real takes plus the humanizer avoid sounding machine-like, or are more takes needed?
2. Is repitching ±1 acceptable on grazed notes? ±2? If not, more frets must be recorded.
3. Does repitching only the ringing body (keeping the real attack) work better?
4. Does the sympathetic part matter in a mix? If so, can a model built from a few measurements match it?
5. Does a dead-strum layer under single notes sound like a real chuck? If not, use the attack/body split.

## Also remember

- Notes and `CLAUDE.md` need keeping current when files move (`src/lib/README.md`, `src/lib/arranger/README.md`).
- Every new control gets a tooltip (`src/lib/tooltips/tips.js`); design for phone and desktop (the sampler is computer-only; playback and the loop's WAV are for judging on the phone); never let unsaved work vanish; clean up listeners, timers, audio nodes.
- The user wants Hear-it's meter and scope views to work in the browser pane: the pane doesn't run `requestAnimationFrame` (see `CLAUDE.md`).
- `todo.json`: don't edit "mine". Suggestions column may get the pilot, motion model and style-selector steps; keep it in build order.
- Delete this file once its contents are in the code, `CLAUDE.md` and the READMEs.

## Superseded from the old handoff

- "Record hard, derive soft" is replaced: grazed (strum) notes are recorded as 2 firm and 2 light, because a graze is a different contact, not a quieter pluck.
- The "note / boom / dead" group names are replaced by articulation names (graze / pluck / dead strum).
- The booms-only bass group becomes plucked notes on all six strings in the full set (the melody plays through these samples).
- The checklist should come from a voicing, not from `guitar-chords.json` or fixed strings.
- Everything else in the old file (gear, recording settings, memory plan, analysis checks) still stands.
