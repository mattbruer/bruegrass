# The arranger

The `/arranger` page turns a chord chart you type, like

```
"Chorus"|G|G|C,G|D|
```

into a bluegrass rhythm section (guitar boom-chuck, mandolin chop, upright
bass) that plays in the browser and can be exported as MIDI. An optional
melody, written in ABC notation, plays along on the guitar samples.

## How text becomes sound

```
chord chart text
   │  chart/parseArrangement.js   text → sections of bars of chords
   ▼
sections
   │  chart/timeline.js           where every chord and beat falls (in quarter notes)
   ▼
timeline
   │  instruments/performance.js  every instrument's notes (guitar.js, mandolin.js, bassline.js)
   │  instruments/band.js         those notes as sound: samples and the upright's synth
   │  instruments/tuneInstruments.js  what the tune's voices play on (guitar samples or a synth), picked per strip in components/mixer/instruments/
   │  instruments/strumPatterns.js  the guitar's strum patterns, as data
   │  instruments/seededRandom.js the repeatable random choices
   │  instruments/mandolin.js     off-beat chops
   │  instruments/bassline.js     the band's own bass part (instruments/upright.js plays it; bassFills.js walks under held tune notes)
   │  bass/songBass.js            the bass in use: your edited line, else bassline.js's
   ▼
notes
   │  playback/scheduler.js       queues notes on the audio clock, a little ahead
   │  playback/metronome/         the click: its grid (song bars, or any meter alone), sounds, scheduler, and the pendulum's swing
   │  playback/mixerGraph.svelte.js  channels (trim, EQ, fader, pan, mute/solo) → reverb aux (+EQ) → master EQ → master
   │  playback/output/            output gain → true-peak limiter (loudness to −14 LUFS, never clips) → speakers
   ▼
sound
```

`playArrangement()` in `playback/livePlayback.js` is where playback starts:
it prepares the notes, builds the band and runs the scheduler. The Export
dialog renders the same band and mixer offline (`export/renderSong.js`) to
WAV files, or writes the MIDI file.

## Folders

| Folder          | What's in it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `state/`        | What the page knows, in small classes (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `chart/`        | Reading the chord chart and its timing: parsing (sections via `sectionBlocks.js`, time signatures in `meterField.js`, the song's key as `[K:G]` in `keyField.js`, the words under each section in `sectionLyrics.js`), bars as a chart draws them (`chartBars.js`), the timeline, keys and transposition, loop regions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `instruments/`  | What each instrument plays, and the guitar's chord book (`chordBook.js`: your shapes first, then `guitar-chords.json`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `playback/`     | The audio engine: the note scheduler, the mixer (settings, fader curve, audio graph), the reverb plugin (`reverb/`), the channel EQ (`eq/`, with EQ presets and listening setups), the output stage (`output/`: loudness and limiter), the metronome (`metronome/`: clicks that play with or without the song), our own AudioWorklet DSP (`worklets/`) and analysis for meters and the visualiser (`analysis/`).                                                                                                                                                                                                                                                                                                                                                                                                             |
| `melody/`       | The ABC melody: turning it into notes, converting chords between ABC and the chart, following the sheet music while it plays. `melody/harmony/`: bluegrass harmony parts (tenor, baritone…) written into the ABC as extra voices (`keepParts.js` keeps hand-edited ones; `harmonyStyles.js` are the ways a part can be written). `melody/roll/`: the piano roll's logic: the ABC read as a score of bars and notes in ticks (`readScore.js`), notes written back bar by bar (`writeBar.js`, `scoreToAbc.js`), editing helpers, chord-tone options for harmony notes, harmony kept in bars the melody didn't change (`freshHarmonyBars.js`), harmony options to try (`harmonyOptions.js`), where the band is (`playheadTicks.js`), and the state (`MelodyDrawing.svelte.js`).                                                 |
| `bass/`         | The bass line once you edit it in the piano roll: the band's own line written out as ABC (`bassAbc.js`), read back for the roll and for playing (`readBass.js`), the one place that picks edited or generated (`songBass.js`), where the tune leaves room for the band's own line to walk (`melodySpace.js`), bars rewritten where the chart's chords change (`bassFollowsChart.js`, bars matched like a text diff by `matchBars.js`), and respelling in a newly named key (`respellBass.js`). Saved in the song's `bass` field; the song's bass style for the band's own line is `songBassStyle.svelte.js`.                                                                                                                                                                                                                 |
| `export/`       | Export: the full mix or stems as WAV (rendered offline), and the `.mid` file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `theory/`       | Music theory in a key, not used by playback yet: Roman numerals, notes as scale steps spelled correctly (`musicInKey.js`; `melodyNote` spells a melody's notes, used by the piano roll), and chord-scale theory (`chordScales.js`: each chord's scale, bebop note and tensions without avoid notes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lyricChart/`   | The lyric chart (`/arranger/chart`): bars with their words in rows (`chartRows.js`), as blocks for paper (`chartBlocks.js`), the header's key/capo/tempo/time (`chartDetails.js`), and lighting the playing bar (`followPlayback.js`). Drawn by `components/lyricChart/` on `$lib/components/paper/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `melody/words/` | The chart's words written under the melody as ABC `w:` lines: syllables, placing them in a bar, writing the lines.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `takes/`        | Recording along with the band: the record tracks (`recordTracks.js`, one mixer channel each), where a take sits on the song (`takeTiming.js`), the mic and recorder in the band's own audio context with the count-in (`recordAlong.js`), takes playing with the band (`playTakes.js`), takes as WAV files to send and add (`takeFiles.js`), and a take's waveform (`waveformPeaks.js`). Saved per song by `$lib/storage/songTakes.js`.                                                                                                                                                                                                                                                                                                                                                                                      |
| `share/`        | Sending a song to another device and opening one sent: one package (`songPackage.js`) as a link (`shareLink.js`, no takes) or a song file (`songFile.js`, a zip with every take); takes compressed to send (`takeFormat.js`, the one place the format is chosen; `mp3.js`, which also trims MP3’s leading silence), gathering the open song (`gatherSong.js`, a received take goes on in the file it came in), saving a received one (`receiveSong.js`), the share sheet or download (`handOver.js`), a file dropped on the page (`dropSongFile.js`). UI in `components/share/`, the Export dialog and Open.                                                                                                                                                                                                                 |
| `tracks/`       | The tracks view (`/arranger/tracks`): the song as lanes on one timeline, like a DAW. Lanes as plain data (`lanes.js`: band parts as chord or note blocks, record tracks with their take in use as a clip), the bar ruler from the count-in bar (`ruler.js`), the scale (`trackScale.js`), take waveforms (`takeWaveforms.js`, from `takes/waveformPeaks.js`), dragging a clip (`dragSideways.js`) and the playhead (`followPlayhead.js`). Drawn by `components/tracks/`.                                                                                                                                                                                                                                                                                                                                                     |
| `voicings/`     | My chords: your own guitar shapes, typed as frets (`typedFrets.js`), checked (`checkVoicing.js`), saved on this device for every song (`myChords.svelte.js`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `components/`   | Small Svelte components, by area: `page/` (the player bar fixed to the bottom of the screen, and `BottomDrawer`, the drawer frame the editor and mixer share), `player/`, `editor/` (with `EditDrawer`: Chords and Melody tabs), `melody/` (with `MelodyReader`, for pages without sheet music), `mixer/` (with `mixer/eq/`, the EQ window, and `mixer/listening/`, listening setups, and `mixer/output/`, the Loudness strip), `keypad/`, `chart/`, `lyricChart/` (the lyric chart's header, rows and bars; `ArrangerChart` is the open song on paper, `LyricChart` the same without paper), `voicings/` (My chords), `tracks/` (the tracks view's ruler, lanes, take clips), `pianoRoll/` (draw the melody, harmony lines and bass line: the grid, its toolbar and voice picker, in the Melody tab's Draw view), `icons/`. |

## How the page is put together

`src/routes/arranger/+page.svelte` is just an outline: it creates the page's
state and lays out a handful of components. The state is one `Arranger`
object (`state/Arranger.svelte.js`) made of small pieces:

| Piece                  | File                               | Holds                                                               |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `arranger.arrangement` | `state/ArrangementState.svelte.js` | chord chart text, tempo, capo, key, and what's worked out from them |
| `arranger.loop`        | `state/LoopState.svelte.js`        | which bars play                                                     |
| `arranger.melody`      | `state/MelodyState.svelte.js`      | the ABC melody and the tune drawn from it                           |
| `arranger.player`      | `state/PlayerState.svelte.js`      | play/stop, and a problem to show                                    |
| `arranger.layout`      | `state/PageLayoutState.svelte.js`  | the player bar, which drawer is open (edit/mixer), the keypad       |
| `arranger.song`        | `state/SongState.svelte.js`        | which song is open; New, Open, Save, unsaved changes                |
| `arranger.recording`   | `state/RecordingState.svelte.js`   | recording along with the band, and the open song's takes            |
| `arranger.receive`     | `state/ReceiveState.svelte.js`     | a song someone sent, waiting to be opened                           |

Components get it with `useArranger()` (`state/context.js`), so nothing is
passed down through layers.

`arranger.song` (`state/SongState.svelte.js`) is which song is open: the
starter song as a new song until you save it (the song bar in
`components/song/` has New, Open and Save). `state/songFields.js` moves a
song between the page and a saved document, and
`state/guardUnsavedChanges.svelte.js` asks before unsaved changes are lost.

**Where to make a change:**

- **Behaviour** (what happens when you press Play, how the loop picks bars): in the state classes, or the plain functions they call (`chart/`, `melody/`, `export/`).
- **What's on screen:** in the one small component that shows it. Components hold almost no logic.
- **Looks:** in the theme tokens (`$lib/theme`).

## Good to know

- **Listening setups.** Every speaker and pair of headphones sounds
  different, so the EQs of every strip can be saved together as a listening
  setup ("iPhone speaker", "AirPods"), and each device remembers which one
  it uses and keeps it on for every song (`playback/eq/listeningSetup.svelte.js`).
  While a setup is in use, the EQs belong to it, not the song. A single
  strip's EQ can also be saved as a preset (`playback/eq/eqPresets.svelte.js`).

- **The starter song** (what a new visitor sees) is in `starterSong.js`: a chord chart and its ABC melody. Swap both to change it.
- **Example songs** (the Examples menu in the song bar, `components/song/ExampleSongSelect.svelte`) are listed in `exampleSongs.js`; a new one is one entry.

- **All musical time is in quarter notes** from bar 1, so every part lines up.
  `chart/timeline.js` is the single source of truth; never assume a fixed bar length.
- **Tuning by ear:** musical choices (levels, timing feel, voicings) are named
  constants at the top of each file, so they're easy to adjust.
- **There are no automated tests.** To check pure logic (bass lines, timing,
  MIDI bytes), run a small Node script in a scratch folder. Stub the JSON and
  `mixer.svelte.js` imports, which need Vite/Svelte.
- The project's `CLAUDE.md` has more detail on each module.
