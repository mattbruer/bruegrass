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
   │  instruments/guitar.js       boom-chuck notes on the guitar samples
   │  instruments/mandolin.js     off-beat chops
   │  instruments/bassline.js     the bass part (instruments/upright.js plays it)
   ▼
notes
   │  playback/scheduler.js       queues notes on the audio clock, a little ahead
   │  playback/mixer.svelte.js    channel faders, pan, reverb → speakers
   ▼
sound
```

`playArrangement()` in `instruments/guitar.js` is where playback starts: it
builds every instrument's notes and runs the scheduler.

## Folders

| Folder         | What's in it                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `state/`       | What the page knows, in small classes (see below).                                                                            |
| `chart/`       | Reading the chord chart and its timing: parsing, the timeline, keys and transposition, loop regions.                          |
| `instruments/` | What each instrument plays, and the guitar's chord shapes (`guitar-chords.json`).                                             |
| `playback/`    | The audio engine: the note scheduler and the mixer.                                                                           |
| `melody/`      | The ABC melody: turning it into notes, converting chords between ABC and the chart, following the sheet music while it plays. |
| `export/`      | The `.mid` download.                                                                                                          |
| `components/`  | Small Svelte components, by area: `player/`, `editor/`, `melody/`, `mixer/`, `keypad/`, `chart/`, `icons/`.                   |

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
| `arranger.layout`      | `state/PageLayoutState.svelte.js`  | what covers the bottom of the screen (mixer, keypad)                |
| `arranger.song`        | `state/SongState.svelte.js`        | which song is open; New, Open, Save, unsaved changes                |

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

- **The starter song** (what a new visitor sees) is in `starterSong.js`: a chord chart and its ABC melody. Swap both to change it.

- **All musical time is in quarter notes** from bar 1, so every part lines up.
  `chart/timeline.js` is the single source of truth; never assume a fixed bar length.
- **Tuning by ear:** musical choices (levels, timing feel, voicings) are named
  constants at the top of each file, so they're easy to adjust.
- **There are no automated tests.** To check pure logic (bass lines, timing,
  MIDI bytes), run a small Node script in a scratch folder. Stub the JSON and
  `mixer.svelte.js` imports, which need Vite/Svelte.
- The project's `CLAUDE.md` has more detail on each module.
