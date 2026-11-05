# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server.
- `npm run build`: production build. Use it as the type/compile check.
- `npm run lint`: runs `prettier --check` and then `eslint`.
- `npx eslint <files>`: lint only the files you touched.
- `npm run format`: prettier write.

There is no test runner. To check pure logic (bass lines, event timing, MIDI bytes), run a throwaway Node script in a scratch directory. Stub the JSON import and the `mixer.svelte.js` import, because those modules expect Vite/Svelte.

## Stack

- SvelteKit with Svelte 5 runes (`$state`, `$derived`, `$effect`), plain JavaScript with JSDoc types (no TypeScript), Tailwind v4, Tone.js.
- The `.svelte.js` suffix is required for any module that uses runes outside a component, e.g. `mixer.svelte.js`.

## Layout

Code is grouped by feature under `src/lib/`. `src/lib/README.md` and `src/lib/arranger/README.md` are the maps; keep them current when adding or moving files.

- `/` (`src/routes/+page.svelte`, `src/lib/songs/`): a simple playlist of MP3s in `static/audio/`.
- `/arranger`: the main project, a bluegrass rhythm-section player/arranger, in `src/lib/arranger/`:
  - `chart/`: parsing, timing, capo, tempo, key choices
  - `instruments/`: what each part plays
  - `playback/`: scheduler and mixer
  - `melody/`: ABC, sheet music drawing and following
  - `export/`: MIDI
  - `state/`: small state classes combined in `Arranger.svelte.js`; components get them via `useArranger()`
  - `components/` (by area)
- The page `src/routes/arranger/+page.svelte` is only an outline.
- The arranger always opens on the starter song in `src/lib/arranger/starterSong.js` (Amazing Grace, written for this app); New starts from it too.
- Don't take ABC from thesession.org: its content licence forbids use with LLMs. Write public-domain tunes ourselves.
- Every page: the top bar (`src/lib/components/TopBar.svelte`) and the Settings panel (`src/lib/settings/`), set up in `src/routes/+layout.svelte`.

The user wants code they can read and change without help:

- Very modular: small functions in their own modules, imported by thin components; small components composed together.
- One place per decision.
- Descriptive names, and comments that explain the _why_.
- Refactor toward this whenever touching code. Next candidates: `instruments/guitar.js` (where playback starts lives there) and `melody/abcChords.js`.

## Saved data and settings

- `src/lib/storage/arrangements.js`: an arrangement is a plain document (`id`, `version`, `title`, `arrangement`, `abc`, `tempo`, `capo`, `transpose`, `mix`, `createdAt`, `updatedAt`). Pages only go through this module, never storage directly. Today it's localStorage, a per-device copy that works offline. A database is planned (social features, realtime, PWA), so keep data serializable and in this shape, and bump `ARRANGEMENT_VERSION` and migrate in `upgrade` when the shape changes.
- Songs are saved only when the user presses Save; there is no autosave and nothing auto-loads.
  - The song bar is `components/song/`, and the logic is `state/SongState.svelte.js`.
  - The first save asks for a name; after that, Save (or Cmd/Ctrl+S) saves under it.
  - A dot shows unsaved changes, judged by comparing `readSongFields` with the fields as last saved.
  - New, Open and leaving the page (`state/guardUnsavedChanges.svelte.js`, via `beforeNavigate`) ask before discarding unsaved changes.
  - The mix is saved with the song (`mixSnapshot`/`applyMix`/`resetMix` in `mixer.svelte.js`).
- `src/lib/components/Dialog.svelte` is the shared dialog frame used by Settings, Save and Open. Use it for any new dialog.
- `src/lib/settings/settings.svelte.js` holds preferences, grouped by Settings tab, and saves them (only values of the right type are restored).
- The panel is `SettingsPanel.svelte`, with one component per tab in `tabs/` and shared controls in `controls/`. To add a tab, add one line to `TABS`.

### Look and theming

- The look is Soft UI, and it all comes from five tokens at the top of `src/lib/theme/tokens.css`: background, text, accent, depth and roundness.
- Everything else is derived from those tokens in CSS: softer text colours, the shadow edges (OKLCH lighter/darker of the background, so dark themes work), and the corner sizes.
- Settings → Appearance changes the same five variables at runtime (`theme.js` `applyTheme`, presets, and the WCAG contrast check).
- `src/app.html` has a tiny copy of `applyTheme` that runs before first paint. Keep the two in step.
- Shared classes are in `src/lib/theme/ui.css`: `ui-card`, `ui-well`, `ui-button`, `ui-button-primary`, `ui-button-on`, `ui-field`. They're named for what a thing is, not how it looks.
- Components must not hard-code colours or corner sizes. Use the variables `--color-*`, `--shadow-*` and `--corner-*`, or Tailwind classes like `text-ink-soft`.

## Arranger architecture

### Arrangement text

Parsed by `parseArrangement.js`. Example: `"Chorus"|G,G|C,C|G,G|D,D|`, plus `"Break" as Chorus` for repeats.

- Each line is a section.
- `|` separates measures and `,` separates chords within a measure. A bar's beats are split evenly between its chords, with any odd beat going to the earlier chords.
- Time signatures use abc-style inline fields:
  - `[M:3/4]` lasts until changed, carrying into later sections.
  - `[2/4]` applies to one bar only (crooked tunes).
  - The default is 4/4.
  - Only denominators 4 and 2 are supported.
- Sections store `measures: string[][]` plus a parallel `meters`.
- **When the syntax changes, update the help page** `src/routes/arranger/help/+page.svelte`.
  - Its audience is non-technical, so keep it in plain language with one idea per section.
  - Each example goes through `{@render example(...)}`, which draws it as a chart. The examples must parse.

### `timeline.js`

The single source of musical time. All times are in quarter notes.

- `slotPositions` gives each chord's start and length.
- `rhythm` gives the boom/chuck grid: `beatGroups` makes 2 = boom-chuck and 3 = boom-chuck-chuck.
- The guitar, mandolin, bass line, MIDI, chart and playhead all derive from it. Never assume a fixed bar length.

### `guitar.js`

The core of the arranger.

- **Chord shapes** come from `guitar-chords.json`. Each shape is 6 frets from low E to high e, with `null` for a muted string. The capo adds to every fret.
- **Samples** are in `static/samples/guitar/{E,A,D,G,B,ee}{0..12}.mp3`.
- **`buildEvents`** turns sections into timed note events:
  - A bass note plays on each boom of the rhythm grid. Root and fifth alternate within a run of the same chord; both are found as the lowest note in the shape with the right pitch class.
  - Strings 3–5 are strummed on each chuck.
  - A note rings until its string is reused or the chord changes.
- **Strum spread** uses a pendulum model of the right hand (string spacing and swing amplitude vs. tempo).
- **Lighter touch** above 120 BPM: lower level, low-pass filter and softer attack.
- **`playArrangement`** places every note at an absolute audio-clock time (`start + pass × duration + offset`).
  - A Tone context timer queues passes within a lookahead, catches up if it's late, and skips past-due notes.
  - Don't use `setTimeout` for musical timing.
  - It returns `{ position(), stop() }`.

### `mixer.svelte.js` and `Mixer.svelte`

- Reactive `mixer` settings drive a lazily built Tone graph: per-instrument channel strips with sub-part `Tone.Volume`s (guitar: `bass`, `strum`), a shared reverb bus fed by sends, and master.
- Instruments connect via `getChannel(id, part)`.
- New instruments should add a channel to `mixer.channels` rather than connect to the destination directly.
- Every mixer control is a `Slider.svelte`, the same on desktop and touch. Only the cap drags, and it moves relative to where it is, so the track never jumps. Off the cap, touches are left to the page (`touch-action: pan-x`). Tapping the readout resets; arrow keys step past detents.
- The console is one row that scrolls sideways on narrow screens, so in the mixer up/down only ever means a fader. Keep strips short enough that the drawer fits a phone without vertical scrolling.

### `midi.js`

- A hand-written Standard MIDI File (format 1, PPQ 480), not `@tonejs/midi`.
- It contains a tempo track with markers per section, the guitar track (channel 1), a separate bass track (channel 2), the mandolin chop (channel 3) and, when there's an ABC melody, a Melody track (channel 4, same guitar-sampler mapping, one pass with no trailing pickup).
- If the melody has a pickup, every track moves one bar later so the pickup can end that bar; the arrangement then starts on Logic's bar 2.
- Track names match the user's Logic instruments ("Bluegrass Guitar" sampler preset, "Roots Upright").

**Note numbering.** Logic numbers middle C as C3.

- The guitar is shifted by `GUITAR_OFFSET = 12`, so the low E sample sits on Logic's E2.
- Bass pitches in `bassline.js` are already in file numbering (range 40–55).

### `melody.js`

- An optional melody in ABC notation (the "Melody" box on `/arranger`), drawn with abcjs and played on the guitar samples through the `melody` mixer channel. abcjs's own playback is not used.
- `melodyFromTune` takes a parsed abcjs tune. It uses `tune.setUpAudio` (repeats and endings played out) to get notes in quarter notes, timed from bar 1's downbeat, so pickup notes are negative. It finds the pickup itself, because abcjs's `getPickupLength` misses a pickup written after `|:`.
- Sync contract: the melody and the arrangement are written separately and only share a clock. The melody's bar 1 starts with the arrangement's bar 1, at the arranger's tempo (the ABC's `Q:` is ignored). The melody loops with the arrangement's pass length. Anything past the end is cut, and a short melody leaves a gap.
- The pickup plays before the band (`leadIn` delays the band's start) and again at the end of every pass.
- A loop region plays the matching melody bars (`loopOffset` in `loop.js`).
- Pitch: ABC is concert pitch, so a note sounds at written MIDI −12 (guitar sounds an octave below written) + transpose (the Key setting). The capo doesn't move it: the arrangement's shapes + capo reach the tune's concert key. `finger()` picks strings with a position-playing hand model. Notes above the high-e 12th fret sample are resampled.

### `abcChords.js`

- Converts chords both ways between the ABC melody and the arrangement. Both directions read `abcjs.synth.sequence(tune)`, which lists the tune in play order with repeats and endings played out. Each note or rest has `timing` (its place in the written score, in whole notes), `duration`, `chord`, and `elem.startChar`.
- `arrangementFromAbc`:
  - Bars come from the bar lines. A pickup is dropped. A short bar at the end of a repeat is merged with the pickup that follows it.
  - Chords change on the nearest beat, using the fewest even slots (`G,C,D` = 2+1+1).
  - Sections split where the score jumps back (a repeat). They're lettered A, B… by where they start in the score, and an identical repeat becomes `"A" as A`.
  - The capo is chosen so chords land on shapes in `guitar-chords.json`, preferring G/C/D/Am/Em home shapes.
- `abcWithChords`: writes the arrangement's concert-pitch chords into ABC that has none, on the note where each change lands. It reports changes during held notes, and repeated bars the arrangement chords differently on another pass.
- Chord shapes are bluegrass voicings with a low fifth, so `bassNote` can alternate root and fifth. Keep that when adding shapes.

### `follow.js`

- While playing, the sheet music follows the band: the sounding note gets the `abcjs-playing` class, an `abcjs-cursor` rect glides across the staff, and the page scrolls to a new line if it's out of view (only while the sheet music is on screen).
- Positions come from abcjs `TimingCallbacks(tune).noteTimings`, which lists notes as played (repeats expanded) with their SVG `elements`, `left`, `endX`, `top` and `height`. Its milliseconds are rescaled to quarter notes by proportion (total played quarters ÷ total ms), because abcjs's `qpm` counts the meter's beat, not quarters.
- Time comes from `playArrangement`'s `beats()` (the audio clock), mapped the same way `melody.js` times the melody (`melodyTime`), never from abcjs's own timer.

### `bassline.js`

- The MIDI-only bass part: root–fifth (usually the fifth below) and stepwise walks/approaches into chord changes.
- Choices are seeded (mulberry32), so exports are deterministic.
- Repeated sections (same chords) are guaranteed to differ from their previous pass.
- Gates and velocities shape articulation.
- Tuning constants sit at the top of the file.

## Working with the user

The user listens to results in the browser and in Logic and gives feedback by ear. Keep musical tuning in named constants near the top of each module so it is easy to adjust.
