# Handoff: sampling-session tool and a richer, human-sounding sample set

> **Partly superseded 2026-11-06 by `HANDOFF-sampler-pilot.md`** (one-chord pilot first, attempt log, articulation names, 2 firm + 2 light grazes). Read that first; this file's gear, analysis and memory notes still stand.

Written 2026-11-05 at the end of a brainstorming chat. **Built so far:** the `/sampler` input check (2026-11-06) and the guided recording session (2026-11-06; described in `CLAUDE.md`). **Not built:** everything in "The sound plan" and "Loading and memory" (the app doesn't play recorded samples yet), the pilot ear tests, the phone memory test and the compressed format. Delete this file once its contents are in the code, `CLAUDE.md` and the READMEs.

## Goal

Make the guitar (later mandolin, banjo) sound like a human playing bluegrass. Today there is one sample set: 6 strings x frets 0-12, one velocity, one take (`static/samples/guitar/{E,A,D,G,B,ee}{0..12}.mp3`, 78 files, 6.4 MB). Repeating one sample sounds like a machine, and a real hand varies in many ways at once.

The first thing to build is a **sampling-session tool**: a separate page (not part of `/arranger`) that guides the user through recording the sample set, then trims, checks, names and exports it. The user is not recording tonight; build the tool first.

## Decisions already made (don't re-litigate)

- **Single-string samples only. No recorded whole strums.** The user is planning smarter voicings (extensions, voicings chosen from the abcjs melody), so chord-specific recordings would be a dead end. The code builds strums from single-string notes.
- **The chuck (strum) matters most;** the boom is fine. The tradition in mind is bluegrass: flatpick, firm down-stroke on 2 and 4, bass note alternating root and fifth. Up-strokes and ghost notes are only seasoning.
- **Tempo stays in code,** not in recordings. The pendulum model of the strum spread already exists in `guitar.js`. Record **intensity** (hard, medium, soft), not tempo.
- **Stay on the web** (SvelteKit). No Electron, Swift or Android. Escape hatch only if tests prove a wall: a Capacitor wrapper with a native audio plugin for just the sampler or recorder.
- **The sampling tool is a dev tool:** only in dev on localhost, on a computer (like `/todo`); built 2026-11-06 as `/sampler`. The user records with an interface and monitors through it. The samples it makes ship with the app; the phone only plays them. The tuner is a separate decision and may stay on both devices.

### The user's recording gear

- Behringer UMC404HD interface (4 preamps, 24-bit, up to 192 kHz).
- AKG P420 large-diaphragm condenser (main mic: about 8-12 in away, aimed where the neck meets the body, not into the soundhole).
- Shure Beta 57A dynamic (possible second mic; tighter and punchier). Record both as two channels and decide the blend later. Check polarity between the two.
- Alvarez SLM80 acoustic dreadnought.
- Record at **48 kHz, 24-bit** to match the app's export rate. Record dry and in a quiet room; the app adds its own reverb.
- Monitoring is done on the interface (direct monitor), so the app never has to feed the player their own playing back.
- Input settings: echo cancellation and auto gain **off**, choose the input device by name (not the laptop mic).

## The sound plan

### Why repitching and faking, to cut recording effort

The user wants the least tedious recording session for the most mileage.

- **Repitching.** Record the open string plus frets 2, 5, 8 and 11 on each string (5 notes per string instead of 13). Each fretted recording covers the frets either side by resampling +-1 semitone, which is mostly inaudible on a plucked string. +-2 is borderline; beyond that it sounds wrong. Open strings get their own recordings (they ring longer and brighter). A capo behaves like a fretted note. The code already resamples notes above the 12th fret. Check by ear before trusting it.
- **Intensity: record hard, derive soft.** Soft from hard works (lower gain, low-pass filter, gentler attack; `guitar.js` already does something like this above 120 BPM). Hard from soft doesn't. Record hard hits, plus maybe one real soft layer.
- **Round robin from a few real takes** (2-3), plus random micro-variation per hit: pitch a few cents, level +-1 dB, filter cutoff, sample start trim of a few ms. The ear catches the first ~30 ms (the pick transient) most, so vary that the most. Never play the same take twice in a row.
- **Dead-strum bank (the shortcut for the chuck).** Record a few dozen strums across all strings while the fretting hand mutes them: down and up, three intensities. This is a clean "chk" of pick sweep and string thump. The chuck becomes single-string body notes spread by the pendulum model, with a random dead-strum clip layered on the sweep. It replaces recording a damped sweep per string. **This is the idea most in need of an ear test.**
- **Up-strokes:** reverse the string order, lighter, favouring the higher strings.
- **Palm-muted boom:** fake it from the open version with a quick fade and a low-pass.
- **Alternative if layering a dead strum doesn't sound right:** split each sample into an attack clip (first ~30 ms, string- and direction-dependent) and a body (the ring), and let the code pair them. Needs a short crossfade at a zero crossing.
- **Variation in the stroke itself (code):** which string the stroke starts on, how far it goes (often only the top 2-3 strings), occasional muted or ghost strings, occasional soft up-stroke at faster tempos, a dead damped chuck, a release thud when the hand stops the strings.
- **Voicing engine consequence:** chuck strings are no longer fixed to strings 3-5. A voicing may strum 4-5 strings, so every string needs strum-style attacks.

### Rough minimum for the guitar (estimates)

- Body notes: 6 strings x 5 notes x about 3 hard takes + one softer layer, about 150 clips.
- Thumb-pluck set for the 3 bass strings: about 45 clips.
- Dead strums: about 40.
- Total about 235 clips, against about 1,900 for the brute-force grid.
- Record in long continuous runs, one string at a time.

The system must **use whatever recordings exist and fall back to derived ones,** so the user can start small and add a real soft layer or more takes later without rework.

The mandolin follows the same plan with one sample per course (string pair); its chop is like the dead strum. The banjo's notes die away fast, so its samples can be short and cheap.

## Loading and memory (the real iPhone constraint)

The limit is **decoded memory, not download size.** Web Audio decodes to 32-bit float: about 192 KB per second of mono audio at 48 kHz. 500 samples of 1.5 s is about 140 MB decoded; the 1,900-clip grid would be about 550 MB. (This is arithmetic, not measured.) iOS Safari has had crashes and slow memory release when many files are decoded at once (WebKit bugs 227636, 189337). No API exposes the memory limit, and an over-limit tab is killed instead of throwing.

Plan, biggest win first:

1. **Load only what the song needs.** `preparePerformance` already returns every note as plain data. Add a step that lists the exact samples used (string, fret, intensity layer, round-robin takes), then fetch and decode only those. This also works for melody-aware voicings, since the voicing is chosen before the sample list is built.
2. **Trim each sample to its job.** A chuck body might be 0.4-0.6 s; only bass notes need 1.5-2 s. Fade the end.
3. **Decode one file at a time,** on a single audio context, and release unused buffers (least recently used first).
4. **Tiers for phone and desktop.** Tag samples in the manifest by tier (the desktop loads more takes and layers; the phone fewer). A "sample quality" setting.
5. **Cache the compressed files on the device** (the planned PWA). Only decoding repeats.
6. **Load per instrument;** no banjo samples if a song has no banjo.
7. **File format:** MP3 adds a small delay at the start, which hurts splicing. Opus in WebM works in Safari from 17.4 for mono/stereo (not Ogg); a recent WebKit bug (327697) says multichannel Opus can fail in `decodeAudioData`, which doesn't affect mono. WebCodecs `AudioEncoder` can encode in the browser. **Don't pick until tested:** encode the same ~20 samples a few ways and compare size, splice accuracy and decode time on the user's phone.

**Test first:** a phone memory-ceiling test. Load samples in growing batches on the user's iPhone and see where it slows or reloads.

## The sampling-session tool (built 2026-11-06)

What's left of this list, or done differently:

- Takes are saved when recording stops, not in chunks while recording: a crash mid-take loses only that take. Fine for short hits; revisit if takes get long.
- No live tuner yet: each take's pitch is measured, and the check asks for a retune past 10 cents. A live tuner is its own roadmap step.
- Export is WAV (24-bit, cut and faded) + `manifest.json`; compressed files wait for the format test below.
- Every kept take is also written to `samples-source/` in the project (cut + raw + manifest): the masters, gitignored, backed up by the user. Decided 2026-11-06: masters never go in `static/` or a database. Shipping files will be built from them into `static/samples/` (after the mic-blend and format choices) and found via the manifest plus one base URL, so moving them to a bucket (Firebase Storage or Cloudflare R2, to match the database choice) is a one-line change.
- Recording is one target per take (R, play, R). The "long continuous runs" idea (one recording, hits split automatically) would sit on top of `analysis/findHit.js`; try it if pressing R per hit gets tedious.
- Thresholds for the checks are guesses checked on synthetic plucks only. Tune them (`analysis/takeProblems.js`, `analysis/analyseTake.js`, `analysis/findHit.js`) after the first real session.

The original list:

A separate desktop-only route. Suggested features:

1. Choose an **instrument checklist** (guitar first; mandolin and banjo later). Each checklist is data: strings, tuning, which frets to record, intensities, takes per note. One tool serves every instrument.
2. The tool **prompts each target** ("D string, fret 5, hard, take 2"), records the hit, finds the first transient and trims with a few ms of lead-in, and names the file from the target.
3. A **progress grid** shows which strings, frets and intensities are done.
4. A **waveform** with playback and Keep / Redo, with keyboard shortcuts, so the user can stay with the guitar in their hands.
5. **Automatic checks** (the tool can measure; the AI cannot listen):
   - pitch: detect the fundamental and compare it with the target note; show cents sharp/flat and prompt a retune if the guitar drifts
   - intensity: peak and loudness and brightness compared with the other takes in the group; flag outliers
   - clean take: clipping, double hits, noisy start, cut-off note
6. **Save takes to the device as they are recorded** (chunked, e.g. OPFS or IndexedDB) so a crash or closed tab loses nothing; **resume** a session later. This follows the project rule against letting unsaved work vanish (see `storage/drafts.js`).
7. **Keep the raw 24-bit recordings** so everything can be reprocessed.
8. A final **export step:** encode compressed files and write a **manifest** (string, fret, intensity, take, tier, file). The app's sampler reads that same manifest, so one file describes the library. `export/wav.js` and `export/zip.js` already exist for WAV and zip output.
9. Don't normalize individual samples; it would erase the intensity relationships.

### Fits the recording roadmap

The mic input in `todo.json` (steps 6-8: mic input, tuner, latency calibration) is this tool's foundation. It comes before the big sample set, because it is the tool used to build it. This note changes the order logic: mic input first. The user reorders `todo.json`; don't edit their column.

## Pilot ear tests (one string, one fret, to decide how much to record)

1. Is a note repitched +-1 and +-2 semitones indistinguishable from the real recording?
2. Does a soft hit derived from a hard one sound like a real soft hit?
3. Do 2-3 real takes plus random variation avoid sounding machine-like?
4. Does a dead-strum clip layered under single notes sound like a real chuck?

## Answered by the user (2026-11-06)

- **Flatpick.**
- **Chord shapes: G, C, D, A and E** (open "cowboy" chords); every other key comes from the capo. The capo goes anywhere from 1 to 5, sometimes up to 7 (e.g. a song in D: D shapes with no capo, C shapes at fret 2, or G shapes at fret 7). Open shapes stay in frets 0-3, so strummed notes stay at fret 10 or below: the recorded frets (0, 2, 5, 8, 11 with +-1 repitch) cover it. The capo chooser in `abcChords.js` prefers G/C/D/Am/Em home shapes; A and E should count too.
- **`guitar-chords.json` is temporary.** The user plans a voicing engine that builds voicings from theory with functions (string set, frets, chord tones), possibly on the fly from the melody, instead of looking up shapes. Don't build new work on the JSON table: the sample list, capo choice and strum strings should take a voicing (strings + frets) from whatever produces it.

- **If the dead-strum bank fails the ear test, switch to the attack/body split.**
- **The voicing engine may strum all six strings,** bass strings included. Rare in bluegrass, but wanted for things like an ending that lands on a big, ringing 1 chord instead of boom-chuck. So the strum-note group covers all six strings (it already does), and the strum code mustn't assume only the top strings.

## Project rules to keep in mind

- Design for **phone and desktop**: decide how each works (here: record desktop-only, play everywhere).
- Keep code modular: small functions in their own modules, thin components. Put tuning numbers in named constants near the top of each module.
- **Never let unsaved work vanish** (drafts on the device).
- **Clean up whatever you start** (listeners, timers, frame loops, audio nodes and contexts).
- Every new control gets a tooltip in `src/lib/tooltips/tips.js`.
- Keep `src/lib/README.md` and `src/lib/arranger/README.md` current if files move.
- Prefer native Web Audio nodes and `AudioWorklet` for new DSP.
- The automated browser pane doesn't run `requestAnimationFrame` (see `CLAUDE.md` for the timer trick).
