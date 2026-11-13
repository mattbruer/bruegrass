# Handoff: read each song once (the song model)

For a fresh chat (planned on Fable). Read `CLAUDE.md` and `src/lib/README.md` first, especially **Layers**. This file covers only what they don't.

## The goal

Every feature should read the open song from **one parsed model** that's worked out once per edit, instead of each feature parsing the text it needs itself. The aim is code that's easier to reason about ("where does the tune come from?" has one answer). Speed is a side benefit.

A song is three texts plus settings (`storage/arrangements.js`):

- **the chart** (`arrangement`)
- **the tune** (`abc`: the melody and harmony voices)
- **the bass** (`bass`, ABC; empty means the band writes its own)

## How it's read today (checked 2026-11-12)

**The chart: already done right.** It's parsed once in `ArrangementState` (`#read = $derived(readArrangement(this.text))`), and everything reads `arranger.arrangement.sections` and the related values. Only `chart/transposeChart.js` and the help page parse the chart again, and both are fine.

**The tune: read by drawing it.** abcjs parses a tune as it draws it. `melody/keepMelodyRead.svelte.js` calls `drawSheetMusic` (`abcjs.renderAbc`) into an element and puts the result in `melody.drawn`. `MelodyState` derives the notes, pickup, title and chord symbols from that. That's why a page without sheet music has to mount a hidden `MelodyReader.svelte`: without it the band would play without the melody. The tune is then parsed again elsewhere, each with its own `parseOnly`:

- `melody/roll/drawnMelody.js`: the piano roll, `readScore` per voice
- `melody/roll/harmonyOptions.js` and `freshHarmonyBars.js`: harmony
- `melody/harmony/harmonizeAbc.js`
- `melody/transposeAbc.js`
- `drawSheetMusic` itself, a second time when transposed (`asWritten`)

abcjs is loaded in one place now (`melody/abcjs.js`: `loadAbcjs`, `loadTuneReader`); the parsing is still scattered.

**The bass: read in many places, each time async.**

- `readWrittenBass(arranger.bass.notation)` is called from `PlayerState`, `ExportDialog`, `TracksView` and `TranscriptionGrid`.
- `readBassScore` is called from `MelodyDrawing.svelte.js` and `respellBass.js`.
- `bassFollowsChart.js` reads two versions of the bass.

Each call parses the bass ABC again.

## The idea to test (a hypothesis, not established)

1. **Separate reading from drawing.** Parse the tune with `abcjs.parseOnly` in state, as a `$derived` (or an async-derived pattern, since abcjs loads lazily), and get the notes from it. `setUpAudio` probably works on a parsed-only tune: check that first, it's the cheapest test. Drawing then becomes only the sheet music's job, and `MelodyReader.svelte` goes away. The sheet music follower (`follow.js`) needs `TimingCallbacks` on the _drawn_ tune for SVG positions, so it stays with the drawing.
2. **One `readSong` for all three texts**, held in state:
   - chart → sections
   - tune → parsed tune, voices, melody line, scores per voice (`readScore`)
   - bass → written notes (`readBass`)

   Features take what they need from it as parameters. Song logic stays plain, as the Layers rule says.

3. **Bass: one derived `writtenBass`** on `BassState` in place of the scattered `readWrittenBass` calls.

The cheapest first step is to count parses per keystroke (wrap `parseOnly` and `renderAbc` with a counter in the browser pane while you type in the ABC box and draw in the roll). Then do step 3, which is small and self-contained, before steps 1 and 2.

## Watch out for

- **The pickup.** `melodyFromTune` finds it itself, because abcjs's `getPickupLength` misses a pickup written after `|:`. Keep that.
- **Transposed sheet music.** `visualTranspose` also moves the chord symbols, so chords are read from an untransposed parse. That's the reason for the second parse in `drawSheetMusic`.
- **Hand-edited harmony.** It must survive. `freshHarmonyBars` and `keepParts` rely on comparing old and new parses bar by bar.
- **Drafts.** Nothing here changes the saved shape, so no version bump. If it does change, bump `ARRANGEMENT_VERSION` and migrate.
- **Ears.** Check by listening: Amazing Grace (pickup, words, harmony parts), a loop region, export WAV and MIDI, the piano roll's edit and undo, bass edits surviving a chart change, and Transcribe (the parts playing with the recording).

## Done looks like

- Each text is parsed once per change, in one place (count it the same way as the first step).
- No hidden `MelodyReader`.
- `src/lib/README.md`, `src/lib/arranger/README.md` and `CLAUDE.md` describe the model.
- `npm run build` and `npm run lint` are clean.
- Checked in the browser pane on phone and desktop sizes.
