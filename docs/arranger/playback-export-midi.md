# Playback, export and MIDI

### Playback and export: one band, two clocks

- `instruments/performance.js` (`preparePerformance`): every note of every instrument for a song, as plain data (loop for live; one pass for export, like the MIDI file).
- `instruments/band.js` (`createBand`): turns a performance into sound (sample players, the upright synth, touch filters) in the current Tone context. `{ live: false }` for offline: Tone reports an offline player stopped before it has played, so the live clean-up (dispose on stop) would silence it.
- `playback/livePlayback.js` (`playArrangement`): the lookahead scheduler. `$lib/audio/mixer/buildMixerGraph.js`: the whole mixer in any context; `mixerGraph.svelte.js` is the live wrapper.
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
