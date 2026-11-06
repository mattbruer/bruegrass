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
- **Prefer the Web Audio API itself** wherever it's the better tool: native nodes (`BiquadFilterNode`, `IIRFilterNode`, `ConvolverNode`, `AnalyserNode`, `GainNode`…) and `AudioWorklet` for custom DSP. The user wants to use Web Audio's full capabilities, and more DSP is coming. Tone.js stays for scheduling, samplers and the existing channels; new processing goes in native nodes or worklets.
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
- `/sampler` (`src/routes/sampler/`, `src/lib/sampler/`, audio in `src/lib/recording/`): records the user's own instrument samples. A dev tool like `/todo`: it only exists in dev on localhost (`+page.js` 404s elsewhere; dashed link in the top bar's `DEV_PAGES`), and only on a computer (touch screens get a note; the link has `computerOnly`). The samples it makes ship with the app; the tool doesn't. The sound plan and what's still to build (sample playback, ear tests, loading) are in `HANDOFF-sampling-session.md`.
  - Input check: interface by name, saved in `storage/thisDevice.js`; echo cancellation, auto gain and noise suppression off; one meter per channel. `InputCheck.svelte.js` is the one place the input opens; it records (the `take-recorder` worklet, its own native 48 kHz `AudioContext`) and plays takes back for both users below.
  - Test take (`TestTake.svelte.js`): only in memory, so leaving with one asks (`guardLeaving.svelte.js`, which also asks while recording).
  - Guided session (`sampler/session/`, UI `components/session/`): walks a checklist target by target ("D string, fret 5, hard, take 2 of 3"). Checklists are data (`checklists/guitar.js`: strings, frets 0/2/5/8/11, layers of intensity × takes, plus bass notes and dead strums; `checklists/guitarPilot.js`: the G pilot from `HANDOFF-sampler-pilot.md`, notes taken from a voicing by `checklists/voicing.js`, groups named by articulation: graze, pluck, dead strum, and a real boom-chuck as the A/B target, all played in motion to a click; grazes at two tempos for the bite test). A layer may have a `tempo` (in ids and file names as `normal-80bpm`); a `pattern` group is one take of a whole strum pattern. A pitched group lists either strings × frets or its own `notes`; a group with a `click` (`checklists/groupClick.js`) plays a metronome while recording (`recording/clickTrack.js`, every click scheduled on the audio clock up front; the arranger's click channel can reuse it); `checklists/targets.js` spells them out with ids built from what each target is, so takes stay matched when a checklist changes. "What to record" (`components/session/RecordingList.svelte`, counts from `checklists/summariseChecklist.js`) shows the whole list and its total, from the session list or an open session. A new instrument is a new checklist file plus one line in `CHECKLISTS`.
  - Every take is analysed once when it stops (`analysis/`: onset, trim with 5 ms lead-in, YIN pitch within ±6 semitones, brightness, second hit, cut-off, noise before the hit) and saved at once to IndexedDB (`storage/samplingSessions.js`; raw float audio, never trimmed or normalised; the trim is a measurement). Nothing to lose on leaving, and sessions resume. `analysis/takeProblems.js` words the checks ("redo" or "listen"), comparing loudness and brightness with the other kept takes of the same note; thresholds are constants at its top. Checked in Node on synthetic plucks and in the browser pane through the real worklet with a stubbed `getUserMedia` (the pane blocks the mic).
  - A recording can hold many hits (`analysis/findHits.js`): play the note as often as you like, then stop; each hit is found (smoothed loudness rises), given a stretch of audio with 100 ms before it, and analysed like a take (`findHit`'s `hitAfter` measures the floor from the last note's ring). Recorded to a click, the beat guides it (`analysis/beatGrid.js`: softer hits near a beat count too, and each hit's timing against the player's own beat is shown and kept as `offBeatMs`). You tick hits (`components/session/RunHits.svelte`) and Keep cuts each out as its own take, filling the note's missing takes, then deletes the recording. Until then the recording is the target's new take, so nothing is lost on leaving.
  - Keys (`keyboardShortcuts.js`): R record/stop (again = redo), Space listen to the trimmed sample, K keep and go to the next missing target, X throw the new take away, ← →. Keep shortcuts in that one list.
  - Export (`session/exportSamples.js`): a zip of 24-bit WAVs cut to the trim and faded, every mic as its own channel, plus `manifest.json` (`session/sampleFiles.js`: names like `note/D-f05-hard-t2.wav`, tiers: takes 1–2 load everywhere, later takes desktop only). Optionally the uncut takes under `raw/`. The app's sampler will read this manifest. The same files (`session/sampleSet.js`, always with `raw/`) are written into the project as each take is kept: `samples-source/<session>-<id>/` (`session/ProjectCopy.svelte.js` → dev-only `routes/sampler/files/+server.js` → `server/sampleLibrary.js`). These are the masters, gitignored and backed up by the user, never `static/`: the shipping files will be built from them into `static/samples/` once the mic blend and compressed format are chosen, and found through the manifest plus one base URL so they can move to a storage bucket later. The compressed format isn't chosen yet (test on the iPhone first).
- Every page: the top bar (`src/lib/components/TopBar.svelte`) and the Settings panel (`src/lib/settings/`), set up in `src/routes/+layout.svelte`.

The user wants code they can read and change without help, and that makes the next feature easy to add:

- Very modular: small functions in their own modules, imported by thin components; small components composed together.
- Build for the next feature, not just this one. A new feature should mostly be new small modules plugged into existing seams (a list entry, a shared helper, a document collection), not edits spread across many files. When adding something, leave a seam the following feature can use (e.g. `storage/collection.js` made a second saved-document type a few lines; `TABS` makes a new Settings tab one line).
- **Design every change for both phone and desktop.** The user uses the app on an iPhone and a MacBook. For everything (features, controls, layout, wording), decide how it works on each: touch vs mouse/keyboard, hover (none on touch; use `ui-hover-only` for hover-only things), screen size (the mixer must fit a phone without vertical scrolling), and the iPhone's quirks. If something only makes sense on one, hide or adapt it on the other, and say what you decided. Check both sizes in the browser (the pane's mobile preset emulates touch).
- **Never let unsaved work vanish, especially on iPhone.** iPhone Safari never asks before leaving (switching apps can unload the page; a swipe closes the tab), so a "leave without saving?" prompt alone isn't enough. Anything the user can change and lose keeps a draft on the device while it has unsaved changes and offers it back next visit, using `storage/drafts.js` (`writeDraft`/`readDraft`/`clearDraft`; see `arranger/state/drafts.svelte.js` for the pattern). The user asked for this to be applied every time it comes up, without asking.
- **Clean up whatever you start**: event listeners, timers, frame loops (`onEveryFrame` returns its stop), observers, `$effect`s, audio nodes and contexts (an offline render disposes its context; see `renderOffline` in `export/renderSong.js`). In a component, return the cleanup from `onMount`/`$effect`; in an action, from `destroy`. Something deliberately kept for the life of the page (the live mixer graph and its watchers, the tooltip bubble) says so in a comment.
- One place per decision.
- Descriptive names; few comments (only where something non-obvious needs saying).
- Refactor toward this whenever touching code. Next candidate: `melody/abcChords.js`.

## The todo list (`todo.json`)

- The user's roadmap: `todo.json` at the project root, shown on the dev-only `/todo` page (two columns, "My ideas" and "Claude's suggestions"). The Todo button in the top bar and the page only exist in dev on localhost (`$lib/devOnly.js`); anywhere else `/todo` is a 404 and nothing can write the file. The page writes through form actions in `src/routes/todo/+page.server.js` → `$lib/server/todoList.js`.
- **Read it at the start of a chat** to know what the user wants next.
- **Keep the suggestions column going:** as you work, add ideas that fit where the app is heading, and drop ones that are done, adopted or stale. At most about 10, each a very short, high-level line (the user asks for details when they want them). Edit `todo.json` directly; keep the shape (`id`, `text`, `done`, `addedAt`).
- **The suggestions are a roadmap, in build order** (the page numbers them): each step should set up the next, so later work needs the least refactoring. Insert a new idea where it fits that order, not at the end. The current order's logic: (1) export, because rendering offline makes the audio graph work in any audio context, so every later node is built that way from the start; (2–3) a click channel, then count-in on top of it; (4–5) the scheduler learns to start mid-song and change tempo per pass; (6–8) mic input, then the tuner and latency calibration on it, which leads straight into recording; (9–10) ear-test the first recorded samples, then let the band play them from the sampler's manifest; (11–12) independent abcjs display work, any time.
- Don't edit "mine" except to tick off something you've built (`done: true`), and say so.
- **Where it's heading: recording.** The user wants to record themselves playing along with the backing track (not built yet). Make choices that keep that easy: a stable audio clock, measured latency (`outputLatency`), mic input through Web Audio with echo cancellation and auto-gain off, and the mixer able to take a new input channel.

## Saved data and settings

- `src/lib/storage/arrangements.js`: an arrangement is a plain document (`id`, `version`, `title`, `arrangement`, `abc`, `tempo`, `capo`, `transpose`, `mix`, `createdAt`, `updatedAt`). Pages only go through this module, never storage directly. Today it's localStorage, a per-device copy that works offline. A database is planned (social features, realtime, PWA), so keep data serializable and in this shape, and bump `ARRANGEMENT_VERSION` and migrate in `upgrade` when the shape changes.
- Songs are saved only when the user presses Save; there is no autosave and nothing auto-loads. The one safety net is drafts: while the song or the listening setup has unsaved changes, `state/drafts.svelte.js` keeps a draft (1 s after a change, and at once when the page is hidden), and the next visit asks "Pick up where you left off?" (`components/song/RestoreDraftsDialog.svelte`; closing it restores, so nothing is lost). Drafts aren't written until that's answered, the restored song shows as unsaved on top of its saved version, and choosing to discard on leaving forgets them. Drafts are per device and never sync.
  - The song bar is `components/song/`, and the logic is `state/SongState.svelte.js`.
  - The first save asks for a name; after that, Save (or Cmd/Ctrl+S) saves under it.
  - A dot shows unsaved changes, judged by comparing `readSongFields` with the fields as last saved.
  - New, Open and leaving the page (`state/guardUnsavedChanges.svelte.js`, via `beforeNavigate`) ask before discarding unsaved changes.
  - The mix is saved with the song (`mixSnapshot`/`applyMix`/`resetMix` in `mixer.svelte.js`).
- EQ presets (`storage/eqPresets.js`, one strip's EQ) and listening setups (`storage/listeningSetups.js`, every strip's EQ) are documents in the same style, through `storage/collection.js`. Which setup this device uses is in `storage/thisDevice.js`, kept apart because it must never sync between devices.
- `src/lib/components/Dialog.svelte` is the shared dialog frame used by Settings, Save and Open. Use it for any new dialog. `NameDialog.svelte` asks for a name (songs, presets, setups), and `UnsavedDot.svelte` marks unsaved changes.
- `src/lib/settings/settings.svelte.js` holds preferences, grouped by Settings tab, and saves them (only values of the right type are restored).
- The panel is `SettingsPanel.svelte`, with one component per tab in `tabs/` and shared controls in `controls/`. To add a tab, add one line to `TABS`.

### Tooltips

- Every control gets a tooltip: `use:tooltip={TIPS.area.thing}` (`src/lib/tooltips/tooltip.js`). Shared controls take a `tip` prop instead (`Slider`, `ChannelFader`, `ToggleSwitch`). **When adding a control, add its tip.**
- All the wording is in `src/lib/tooltips/tips.js`, grouped by area: one or two plain sentences on what it does, for a non-technical user. Lists keyed by id (EQ bands, reverb controls, chord displays, visualiser views) follow the ids in the code that defines them.
- Behaviour (timings are constants at the top of `tooltip.js`): mouse after 1.5 s (the user found shorter annoying), then instant when moving straight to the next control (0.3 s); keyboard focus. **No tips on touch-only devices** (the user's call: hover isn't a thing on a phone or tablet), so the ? button and the Settings row carry `ui-hover-only` (in `theme/ui.css`, hidden under `@media (hover: none)`); an iPad with a trackpad can hover, so it keeps them. One shared bubble, a native `popover`, so it sits above dialogs. The ? button in the top bar (`tooltips/TipsToggle.svelte`) and Settings → General → Tips both turn them off (same setting, `settings.showTips`); the text stays on the control as `aria-description` for screen readers.
- Deliberately without tips: the phone music keypad (touch only anyway), text areas, plain Cancel/Close, and Settings rows that already show a description.

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
  - Each beat group of the rhythm grid gets a **strum pattern** (`strumPatterns.js`, plain data): one character per stroke of a hand that keeps moving down and up (even = down, odd = up), `B` bass, `x` strum, `.` miss, at `steps` strokes per quarter. Boom-chuck most of the time, with bum-titty (`B.xx`: a quarter, then two eighths down-up; two-beat groups only) sprinkled in (`STRUM_MIX`, seeded so export and MIDI match live's first pass). A new pattern is one entry.
  - Root and fifth alternate on the `B`s within a run of the same chord; both are found as the lowest note in the shape with the right pitch class.
  - A strum is strings 3–5; an upstroke plays them high to low, 3 dB lighter. A light upstroke graze (top two strings) sounded wrong with these samples: it cut the chuck's ring short and replaced it quieter. Try again with real graze samples.
  - A note rings until its string is reused or the chord changes. Looping, the guitar's notes span 4 passes (`LOOP_PASSES`), so the sprinkle varies.
- **Strum spread** uses a pendulum model of the right hand (string spacing and swing amplitude vs. tempo; faster strokes swing smaller). Hypothesis to test: bluegrass is more a bounce (the hand speeds up and slows down through the stroke) than a pendulum; Irish keeps the pendulum.
- **The hand's feel** (`hand.js`): one hidden force per stroke (a slow drift plus scatter, seeded) sets the whole stroke: level (every string together), brightness (each guitar note has its own native low-pass, from the touch cutoff), sweep speed and a few ms early/late. Notes carry `force` (dB) and `nudge` (s); `band.js` applies them as each note plays, scaled by the Feel amount, so it A/Bs live. The MIDI file includes it at 1×.
- **Listening-test controls** under Play/Stop (desktop A/B tools, not designed for phones): Feel and Vary, each with an amount slider, and a Strum menu (Mix or one pattern, restarts playback). All in `settings` so they're remembered.
- **Fake round robin** (`roundRobin.js`): every sample play (guitar, melody, mandolin) is nudged at random by a few cents, up to 1 dB, and a start up to 1.5 ms into the sample, so repeats don't sound like a machine gun. The Vary button turns it off, and its Amount slider scales it for ear tests (pitch never past ±5 cents) (checked per note, so it A/Bs while playing).
- **Lighter touch** above 120 BPM: lower level, low-pass filter and softer attack.
- **`playArrangement`** (now in `playback/livePlayback.js`) places every note at an absolute audio-clock time (`start + pass × duration + offset`).
  - A Tone context timer queues passes within a lookahead, catches up if it's late, and skips past-due notes.
  - Don't use `setTimeout` for musical timing.
  - It returns `{ position(), stop() }`.

### The mixer (`playback/` and `components/mixer/`)

- `mixer.svelte.js` holds the settings, with snapshot, apply and reset. `faderTaper.js` holds the fader curve. `mixerGraph.svelte.js` builds the Tone graph lazily and keeps it in step.
- Each instrument has a channel (input trim → EQ → fader/pan) with sub-part `Tone.Volume`s (guitar: `bass`, `strum`), a post-fader send to the reverb aux, mute and solo.
- Instruments connect via `getChannel(id, part)` from `mixerGraph.svelte.js`.
- Meters and the master visualiser read **analyser taps** (`playback/analysis/taps.js`), created in `mixerGraph.svelte.js` and published as `audioTaps.current` (null until the first Play).
  - There's one tap after each channel's fader and pan, one on the reverb aux, the master's waveform and spectrum (taken after the output stage: what reaches the speakers), and the output stage's loudness/limiter readings.
  - A tap always exposes its data through a function (`read()`). `audioTaps` is `$state`, and Svelte's proxy copies a plain object's values the first time they're read, so an object that audio code keeps mutating would freeze in the UI.
  - Everything that animates subscribes to the one shared loop in `analysis/frameLoop.js` (`onEveryFrame`), and writes straight to the DOM or canvas each frame, not through Svelte state.
  - Level maths is in `analysis/levels.js`; meter movement (fall, peak hold, clip latch) is in `analysis/meterBallistics.js`.
  - The meters use the fader's dB scale, so they line up with its marks.
  - The master visualiser is a small fixed-size card after the master strip (size: `--scope-width` and `--scope-screen-height` in `MasterScope.svelte`). Its views are separate draw functions in `components/mixer/scope/`.
- The automated browser pane in this app doesn't run `requestAnimationFrame`. To test meters or the visualiser there, replace it with a 16 ms timer, then navigate away and back so the frame loop restarts on it.
- The default mix (pans, sends, reverb level) is a documented block at the top of `mixer.svelte.js`. Resetting a control (tap its readout, double-click its cap) returns it to that default.
- **Headroom.** Every channel starts with an input trim (`INPUT_TRIM_DB` in `mixerGraph.svelte.js`, −14 dB), before its EQ. With every fader at unity the master peaks around −8 dBFS: healthy mixing headroom. Change the trim, not the samples or instrument levels, to move the whole mix up or down; it keeps the balance between instruments. Loudness is added at the very end, by the output stage, never by raising the trim.
- **Output stage** (`playback/output/`, after the master fader; the "Loudness" strip, `components/mixer/output/`). Like a mastering chain: output gain (native `GainNode`) → true-peak lookahead limiter (worklet) → compare trim → speakers, with a loudness meter branch (K-weighting as two native `IIRFilterNode`s → worklet).
  - The user never wants the master to clip and doesn't want loudness left on the table. Target −14 LUFS (streaming level), ceiling −1 dBTP; tuning constants in `output/outputSettings.js`. `DEFAULT_OUTPUT_GAIN_DB` (+7.7) was measured in the browser: the starter song's default mix is about −21.7 LUFS before it.
  - `mixer.output.gain` saves with the song. Match (`output/outputStage.svelte.js`) sets it from the song's integrated LUFS since Play; the integrated reading resets on Play and on a gain change.
  - Compare is a level-matched A/B (not saved): while comparing, everything is trimmed back down by the output gain, and B bypasses the limiter, so A and B differ only by the limiter.
  - Verified in Node against references: K-weighting matches the BS.1770 48 kHz table; a −20 dBFS stereo 1 kHz sine reads −20.0 LUFS; the limiter holds plucks, clicks, +12 dB sines and inter-sample test signals to −1.0 dBTP, and passes signals under the ceiling bit-exact (5 ms delay). Its detector uses 16 taps per phase (12 let full-band noise through by ~1 dB).
- **AudioWorklets** (`playback/worklets/`): our own DSP on the audio thread. `worklets.js` is the one place they're loaded (Tone's loader only takes one module per context); a new processor is a self-contained `*Processor.js` file (no imports) plus one line in `PROCESSORS`. ESLint gives `**/worklets/*Processor.js` the worklet globals, and `vite.config.js` keeps processor files from being inlined as data: URLs (Safari won't load those). A processor that throws logs `Audio processor "…" stopped`. In the browser pane, a worklet's messages arrive normally; for its numbers on screen, use the rAF-timer trick above.
- **EQ** (Logic Channel EQ-style) on every channel, the reverb aux (after the plugin) and the master (the whole mix):
  - Bands and their defaults are defined once in `playback/eq/eqBands.js`: low/high cut (12 or 24 dB/oct), low/high shelf, four bells. The settings live in each strip's `eq` in `mixer.svelte.js` and save with the song.
  - `createEq.js` builds it from native `BiquadFilterNode`s, because `Tone.Filter` rejects the negative Q a Butterworth cut needs in dB. A 24 dB/oct cut is two 12 dB stages.
  - `eqResponse.js` works out the curve with the same (RBJ) formulas the browser uses, for the graph and the strip thumbnails; it matches `getFrequencyResponse` exactly.
  - The UI is `components/mixer/eq/`: `EqButton` (the curve thumbnail, under the name at the top of every strip, placed by `Strip.svelte`) opens one shared, non-modal `EqWindow` (`eqWindowState.svelte.js` says which strip). The graph shows the strip's sound after the EQ (`audioTaps.current.afterEq`).
- **Listening setups and EQ presets.** Every speaker and pair of headphones sounds different, so the user should tune and save EQs per device and per speaker/headphones; the UI says so plainly, so keep that wording when changing it.
  - A listening setup is every strip's EQ (`eqsSnapshot`/`applyEqs` in `mixer.svelte.js`, strips from `stripsWithEq`). `playback/eq/listeningSetup.svelte.js` is the one place for its rules: this device's setup goes on at page start and stays through New and Open (`applySongMix`); while it's in use the song's own EQs are put aside and saved back unchanged (`songMixSnapshot`), so it never marks the song changed; setup edits save only when you press Save, and leaving the page asks first.
  - The UI is `components/mixer/listening/`: a small button in the mixer's title row (kept small so the drawer fits a phone) opens the "What are you listening on?" dialog. The EQ window's note links to it.
  - EQ presets (`playback/eq/eqPresets.svelte.js`, UI `eq/EqPresetPicker.svelte`) are one strip's EQ; any preset loads on any strip, the strip's own listed first.
- **Every bus after the channels must be stereo** (`new Tone.Channel({ channelCount: 2 })`). A Tone Channel defaults to mono and would fold every pan back to centre; that was the "pan does nothing" bug.
- Solo is done in our own code, not Tone's `Channel.solo`, which would also mute the master and aux. A soloed channel mutes the others; the reverb aux is solo-safe. Solo isn't saved with a song.
- The reverb aux is Logic-style, a strip with an insert slot (power = bypass) that opens the plugin window, a non-modal `Dialog`.
  - The plugin is hand-built on Web Audio (`playback/reverb/`): a generated impulse response (decay, damping, width) into a convolver, plus pre-delay, low/high cut and separate wet/dry (100/0 by default).
  - Its controls are defined once in `reverbSettings.js`.
  - Older songs' `reverb.decay` maps to `plugin.decay` in `applyMix`.
- New instruments should add a channel to `mixer.channels` rather than connect to the destination directly.
- Every mixer control is a `Slider.svelte`, the same on desktop and touch. Only the cap drags, and it moves relative to where it is, so the track never jumps. Off the cap, touches are left to the page (`touch-action: pan-x`). Tapping the readout resets; arrow keys step past detents.
- The console is one row that scrolls sideways on narrow screens, so in the mixer up/down only ever means a fader. Keep strips short enough that the drawer fits a phone without vertical scrolling, upright and on its side.
  - On its side (`max-height: 600px`, the one breakpoint for it), each strip lays its controls out two to a row beside the fader (the fader is always a strip's last control), name beside EQ; the drawer goes up to the top bar and the hint line hides. Measured at 812×375: the drawer fits exactly.
  - Slider tracks use `touch-action: pan-x pan-y`: the console's own `pan-x` still limits the mixer to sideways swipes, while a window like the EQ can scroll up/down over its sliders.
  - Floating windows start just under the top bar on short screens, and the EQ graph is shorter there (9rem), so the EQ window fits a phone.
  - `:hover` styles go inside `@media (hover: hover)`: on a touch screen a tapped hover sticks.

### Playback and export: one band, two clocks

- `instruments/performance.js` (`preparePerformance`): every note of every instrument for a song, as plain data (loop for live; one pass for export, like the MIDI file).
- `instruments/band.js` (`createBand`): turns a performance into sound (sample players, the upright synth, touch filters) in the current Tone context. `{ live: false }` for offline: Tone reports an offline player stopped before it has played, so the live clean-up (dispose on stop) would silence it.
- `playback/livePlayback.js` (`playArrangement`): the lookahead scheduler. `playback/graph/buildMixerGraph.js`: the whole mixer in any context; `mixerGraph.svelte.js` is the live wrapper.
- **Export** (`export/`, the Export… button and dialog in `components/export/`, phone and desktop; MIDI is a choice there, hidden on touch):
  - `renderSong.js`: `Tone.Offline` at 48 kHz renders one pass + a reverb tail (decay + 1 s, 2–8 s). Bar 1 starts one bar in when the melody has a pickup, so files line up with the `.mid`. Full mix = as heard (mutes kept, solos dropped). Stems come from one render, each to its own channels of a native `ChannelMergerNode`: dry by default (after the input trim: mono, unity, no EQ/pan/reverb) or processed (post-fader stereo + a Reverb stem; they sum to the mix before the master). Stems ignore mutes.
  - Don't set an offline destination's `channelCount` (it's fixed; setting it throws a message-less `InvalidStateError`); only `channelInterpretation: 'discrete'`.
  - `wav.js` (24-bit PCM) and `zip.js` (stored, CRC-32) are hand-written and checked against Python's `wave` and `zipfile`. `exportAudio.js` names (`song-120bpm.wav`, `song-120bpm-stems.zip`) and downloads.
  - Rendering stops live playback first (Tone.Offline swaps Tone's global context).
  - Measured on the starter song: full mix 2.5 s to render, peak −1.0 dBFS; stems + mix 8.5 s; melody pickup at 1.0 s, bar 1 at 1.5 s, 29.0 s long.
  - Later: compressed formats for sharing (WebCodecs `AudioEncoder` can make AAC/Opus without a library like ffmpeg.wasm).

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

## How the user thinks

- They change direction and add ideas often, and don't always have a clear vision up front. Make every design cheap to change: layers, plain data and seams, so a big change touches one place. Motto: make everything extendable. Build as if big code changes were expensive for a human.
- Painter's approach (Sargent): get what reads from a distance right first, then build detail on that foundation. Start with a thin end-to-end version, then refine; no speculative options or abstractions. Judge audio at a distance (in the mix, quiet, on a phone speaker).
- Code for a reader with about a year of full-stack experience: short, well-named functions with clear inputs and outputs, few comments (they dislike clutter; comment only where truly needed). Physics and DSP maths may be abstracted or come from a library.
- Build for one case first (e.g. bluegrass), leave seams for the next (Irish, custom patterns), and don't build UI for the others yet.

## Working with the user

The user listens to results in the browser and in Logic and gives feedback by ear. Keep musical tuning in named constants near the top of each module so it is easy to adjust.
