# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server.
- `npm run build`: production build. Use it as the type/compile check.
- `npm run lint`: runs `prettier --check` and then `eslint`.
- `npx eslint <files>`: lint only the files you touched.
- `npm run format`: prettier write.

There is no test runner yet (Vitest is the planned one: it reads the Vite config, so `$lib` and JSON imports just work). To check pure logic (bass lines, event timing, MIDI bytes), run a throwaway Node script in a scratch directory; only `guitar-chords.json` needs stubbing, because song logic never imports Svelte state (see "Layers" below).

## Stack

- SvelteKit with Svelte 5 runes (`$state`, `$derived`, `$effect`), plain JavaScript with JSDoc types (no TypeScript), Tailwind v4, Tone.js.
- **Prefer the Web Audio API itself** wherever it's the better tool: native nodes (`BiquadFilterNode`, `IIRFilterNode`, `ConvolverNode`, `AnalyserNode`, `GainNode`…) and `AudioWorklet` for custom DSP. The user wants to use Web Audio's full capabilities, and more DSP is coming. Tone.js stays for scheduling, samplers and the existing channels; new processing goes in native nodes or worklets.
- The `.svelte.js` suffix is required for any module that uses runes outside a component, e.g. `mixer.svelte.js`.

## The song is read once

A song is three texts, and each is parsed in one place, once per change, as a `$derived` in state. Everything else takes what it needs from there; nothing parses the open song's text itself.

- **The chart** (`arrangement`): `ArrangementState` (`readArrangement`) → `arrangement.sections` and the rest.
- **The tune** (`abc`): `MelodyState` (`melody/readTune.js`, abcjs `parseOnly`) → `melody.tune` (abcjs's parse), `melody.sequence` (as played, for chord symbols), `melody.line` and `pickup` (the band's notes), `melody.voices` (a score per voice for the piano roll, worked out only when something asks), `warnings`, `title`.
- **The bass** (`bass`): `BassState` → `bass.read` (its score) and `bass.written` (the notes the band plays, null for the band's own line).

abcjs loads after the page: `state/abcjsLoaded.svelte.js` holds it, the reads are empty until it arrives and redo themselves when it does. Code that must have the tune right now (Play, Export, writing harmony) does `await abcjsReady()` first. Plain logic takes abcjs or a parsed tune as a parameter (`tuneReader(abcjs)` for code that reads _other_ versions of a text: the band's own bass line, a harmony option, the steps of one roll edit).

## Layout

Code is grouped by feature under `src/lib/`. `src/lib/README.md` and `src/lib/arranger/README.md` are the maps; keep them current when adding or moving files.

**Layers** (the rule that keeps logic testable; `src/lib/README.md` has the detail): song logic is plain `.js` and never imports `.svelte.js` state: whatever it needs (the mix, the edited bass line) is a parameter, and state or a component at the edge passes it. `.svelte.js` state sits above it, thin components above that. The sound engine that knows nothing about songs is `$lib/audio/` (worklets, EQ, reverb, output stage, meters and frame loop, the mixer's graph builder and fader curve, mic recording, the time stretcher); the band's mixer state is `arranger/mixer/`. **A backend** is coming (SvelteKit server routes or an API): song storage is async already (`storage/arrangements.js`), so it's the one module that changes; keep new saved data behind `storage/` with async functions. **Paid plans**: `$lib/account/plans.js` is the one place that says what each plan includes; code asks `planAllows('feature')`, never a plan's name (first entry: lossless take sharing).

- `/` (`src/routes/+page.svelte`, `src/lib/playlist/`): a simple playlist of MP3s in `static/audio/`.
- `/arranger`: the main project, a bluegrass rhythm-section player/arranger, in `src/lib/arranger/`:
  - `chart/`: parsing, timing, capo, tempo, key choices
  - `instruments/`: what each part plays
  - `playback/`: scheduler and mixer
  - `melody/`: ABC, sheet music drawing and following
  - `export/`: MIDI
  - `voicings/`: My chords, your own guitar shapes (the chord book is `instruments/chordBook.js`)
  - `theory/`: music theory in a key, kept for the planned jazz style and its richer harmony (not used by playback yet). `analyzeProgression.js`: function analysis the way a jazz school (Berklee) teaches it, behind the **Roman** chord display (at first its own Function button; Roman showing only scale degrees, II7 for a V7/V, was misleading, so Roman became the analysis; Nashville stays scale degrees; the user may rename the button: one line in `CHORD_DISPLAYS`): a dominant resolving down a fifth is V7/x (A7 → D in G is V7/V; unresolved on a key note, still named for the chord a fifth below), one sliding down a half step is subV7/x, a minor chord a fifth above a dominant is its related IIm7/x (a diatonic one keeps its numeral, with the II offered), anything else its plain numeral with why (in the key, borrowed by modal interchange, passing diminished, a bluesy seventh, outside). **Modal interchange**: `theory/modes.js` is the modes as plain data (scales; which are the key's own; the order borrowed chords are looked for: parallel minor first in major, Dorian then major in minor, then Phrygian, Mixolydian, Lydian, Locrian, melodic minor); `chordFamily.js` stacks each mode's sevenths, and the reason names the mode ("borrowed from C Phrygian"). A borrowed major triad on a flat root stays itself when it falls a fifth (Eb → Ab in C is bIII bVI), while one on a key note is still a secondary dominant (A → D in G is V/V); an unresolved chord is only named as a dominant when it has a 7th. Upper-case numerals with the chord's quality (IIm7, V7, VIIm7b5), decided only in `functionLabels.js`. Written to read like the theory: root motion in words (`rootMotion.js`: `fallsAFifth`, `slidesDownAHalfStep`, `noteBelow(root, A_FIFTH_BELOW)`), one function per reading (`secondaryDominant`, `tritoneSub`, `unresolvedDominant`, `relatedTwoReading`, `plainReading`). The test progressions (about 40, majors, minors, modal interchange) live only in a scratch script so far. Each reading carries `why` and `options`. It reads the whole song in play order and wraps round (the last chord leads to the first); the piano roll, with no neighbours to look at, gets `functionOnItsOwn`. **The chord tutor** (`components/chordTutor/ChordTutorDialog.svelte`): tap any chord on the scrolling strip, in any display, for a short lesson aimed at bluegrass players who don't care about numerals (`theory/chordLesson.js`): the chord's notes; **what to play over it**, in plain words first ("the G major scale, with C♯ instead of C", described from the key's scale or the chord's own major/minor scale, whichever needs fewer changes), then the scale's name and notes (A Mixolydian), and **▶ Hear it** (`playback/auditionScale.js`, on the Melody channel, at concert pitch: capo and Key added); **the note to lean on** (its first note outside the key, 3rd then 7th, and where it resolves by a half step; for an all-key chord, its 3rd); and what it does (the numeral and why). The scale is chosen by function (`theory/scaleToPlay.js`, Berklee chord-scale): the scale the chord comes from (the key's, or the mode it's borrowed from) with the chord's own notes swapped in, which gives Mixolydian for V7/V, Mixolydian ♭13 for V7/II, Phrygian dominant for V7/VI, Dorian for a borrowed IVm, Locrian for IIm7b5/II; a tritone sub gets Lydian ♭7, a diminished chord whole-half (spelled plainly). Names in `theory/scaleNames.js` (data). Not read yet: extensions (9, ♭9, 13 on a chord). `chordScales.js` (harmony parts) still picks scales by root alone: the next refactor is for harmony to use `scaleToPlay` so there's one place. Not tried by ear or on a real iPhone. **The analysis can be wrong, so it's editable**: "Not right?" in the tutor (`chordTutor/CorrectReading.svelte`) offers the other readings or your own; yours is written into the chart after the chord as `A7{V7/V}` (`chart/analysisMarks.js`: the parser keeps it as `marks`, parallel to `measures`, transposing keeps it, a chord in an `as` repeat is marked where it's written). Not built: ii–V brackets under the chords, the chord's scale (`chordScales.js`) in the dialog, a melody-aware analysis. `musicInKey.js`: Roman numerals (`bII7`, `#iv°`, `I/3`), notes as scale steps, correct spelling (`chordName`, `plainestNote`). `chordScales.js`: chord-scale theory, the user's way of understanding music (the rules we follow, from a Berklee text, are in [docs/theory/chord-scales.md](docs/theory/chord-scales.md), which also maps the newer modules built on them: the tables as data, chords that fit the melody, generated guitar shapes): the key's mode for diatonic chords, Lydian/Dorian/Mixolydian/Phrygian dominant/Lydian dominant/whole-half for the rest, bebop notes, tensions minus avoid notes (a half step above a chord tone, except on dominants).
  - `state/`: small state classes combined in `Arranger.svelte.js`; components get them via `useArranger()`
  - `components/` (by area)
- The rest of the arranger's features are in [docs/features/](docs/features/): the pages, the lyric chart, the piano roll, the tune by section, the player bar, recording and sharing, Transcribe, the slow-down player, the metronome, the tuner and the sampler.
- The arranger's engine: [docs/arranger/](docs/arranger/): the chart text and timing, the guitar, the mixer, playback and export, MIDI, and the melody, harmony and bass.
- **Before changing a feature or engine area, read its doc above first** (the one matching the feature), so the rules it records aren't broken. If no doc covers it, say so before you start.

## Building

The user wants code they can read and change without help, and that makes the next feature easy to add:

- Very modular: small functions in their own modules, imported by thin components; small components composed together.
- **Features move often** (a control goes from a menu to the bar to a wizard step and back). Each control is a self-contained component that takes only what it needs and calls state methods, so moving it is one import and one tag. The host decides layout; the component doesn't assume where it sits.
- Build for the next feature, not just this one. A new feature should mostly be new small modules plugged into existing seams (a list entry, a shared helper, a document collection), not edits spread across many files. When adding something, leave a seam the following feature can use (e.g. `storage/collection.js` made a second saved-document type a few lines; `TABS` makes a new Settings tab one line).
- **Design every change for both phone and desktop.** The user uses the app on an iPhone and a MacBook. For everything (features, controls, layout, wording), decide how it works on each: touch vs mouse/keyboard, hover (none on touch; use `ui-hover-only` for hover-only things), screen size (the mixer must fit a phone without vertical scrolling), and the iPhone's quirks. If something only makes sense on one, hide or adapt it on the other, and say what you decided. Check both sizes in the browser (the pane's mobile preset emulates touch).
- **Never let unsaved work vanish, especially on iPhone.** iPhone Safari never asks before leaving (switching apps can unload the page; a swipe closes the tab), so a "leave without saving?" prompt alone isn't enough. Anything the user can change and lose saves itself as it changes (songs and listening setups: `arranger/state/autosave.svelte.js`) or, for work that isn't a document yet (a transcription, a chord shape being typed), keeps a draft and puts it back next time, using `storage/drafts.js`. The user asked for this to be applied every time it comes up, without asking.
- **Clean up whatever you start**: event listeners, timers, frame loops (`onEveryFrame` returns its stop), observers, `$effect`s, audio nodes and contexts (an offline render disposes its context; see `renderOffline` in `export/renderSong.js`). In a component, return the cleanup from `onMount`/`$effect`; in an action, from `destroy`. Something deliberately kept for the life of the page (the live mixer graph and its watchers, the tooltip bubble) says so in a comment.
- One place per decision.
- Descriptive names; few comments (only where something non-obvious needs saying).
- Refactor toward this whenever touching code. Next candidate: `melody/abcChords.js`.

## Saved data

- Pages go only through `storage/`, which is async, so a backend can replace it later. Songs save themselves (no Save button); anything the user can lose gets a draft.
- **No versions or migrations** (the user's call): the app isn't live, so saved data may stop loading when a shape changes. Don't add version numbers, upgrade steps or rescue code.
- Full detail: [docs/saved-data.md](docs/saved-data.md).

## Look and tooltips

- Every control needs a tooltip (`use:tooltip={TIPS.area.thing}`) and a token colour, never a hard-coded one. Check contrast in a screenshot before calling a control done.
- Full detail: [docs/look-and-tooltips.md](docs/look-and-tooltips.md).

## Todo list

- Read `todo.json` at the start of a chat to know what the user wants next. Keep its suggestions column current; don't edit "mine" except to tick off what you've built (`done: true`), and say so.
- Full detail: [docs/todo-roadmap.md](docs/todo-roadmap.md).

## How the user thinks

- They change direction and add ideas often, and don't always have a clear vision up front. Make every design cheap to change: layers, plain data and seams, so a big change touches one place. Motto: make everything extendable. Build as if big code changes were expensive for a human.
- Code for a reader with about a year of full-stack experience: short, well-named functions with clear inputs and outputs, few comments (they dislike clutter; comment only where truly needed). Physics and DSP maths may be abstracted or come from a library.
- Build for one case first (e.g. bluegrass), leave seams for the next (Irish, custom patterns), and don't build UI for the others yet.

## Working with the user

The user listens to results in the browser and in Logic and gives feedback by ear. Keep musical tuning in named constants near the top of each module so it is easy to adjust.
