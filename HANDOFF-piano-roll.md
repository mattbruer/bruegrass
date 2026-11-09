# Handoff: piano-roll melody editor (draw a tune, get ABC)

Start a new chat with this file as the first thing to read. The chat should ask the user clarifying questions before building (see "Questions to ask first"). The user likes that.

## The goal

People who don't read music can draw a melody on a grid, the way the MIDI editor in Logic works, and the app writes it as ABC. abcjs then draws the sheet music, and the melody plays on the existing `melody` channel. Readers can still type ABC and see it drawn as notes. Both views stay in step.

This replaces the earlier idea of hum-to-ABC. It's more reliable, and the user sees exactly what they wrote.

## Why it's shaped this way

- **The note list is the document.** Plain data, one place for a decision. ABC is a derived view, the same way the arrangement is the document and the chart is a view of it. The user's principle: "arrangement is the document".
- **Make it cheap to change.** Small pure modules, thin Svelte components. The user likes short functions with clear inputs and outputs, few comments, and one place per decision (see CLAUDE.md, "Arranger architecture" and "How the user thinks").
- **Phone and desktop from the start.** The user uses an iPhone and a MacBook. The editor should work with a finger (tap to add, drag to move, drag an edge to resize) and with a mouse or keyboard.
- **Few big controls.** Non-readers and an elderly half-blind user may use this. Big targets, plain words, pictures where possible (see memory "Few big controls").

## The data model (proposed, to confirm)

```js
// one note, times in beats (quarter notes), from the start of the tune's first bar
{ midi: 64, start: 0, length: 1 }
```

- `midi` is the written pitch in concert pitch (ABC is concert pitch; see CLAUDE.md, "melody.js"). Check how `melody.js` and `transposeAbc.js` already convert, and match it.
- `start` and `length` are in beats. The grid snaps to an eighth or quarter by default.
- A list of these, sorted by `start`. Rests are the gaps.

## Pure modules (build and test these first, in Node)

Keep them free of Svelte and abcjs so they can be checked with a throwaway Node script in a scratch directory (CLAUDE.md, "Commands").

- **`notesToAbc(notes, { meter, key, tempo? })`**: writes ABC text. Splits notes at barlines, ties a note that crosses one, fills gaps with rests, spells pitches with `theory/musicInKey.js` so accidentals match the key. Look at `melody/abcChords.js` and `melody/words/abcWithWords.js` for how the app already writes ABC.
- **`abcToNotes(abc)`**: the reverse, for readers who type ABC. It's lossy for complex ABC (grace notes, unusual tuplets, multiple voices). Say so in the UI and fall back to ABC-only for those.
- **`snapToGrid(notes, grid)`** and small edit helpers: add, delete, move, resize. Pure, returns new arrays.

Existing code to reuse rather than rewrite:

- `melody/melody.js` (`melodyFromTune`): timing and pickups. Pickups need care, so read the CLAUDE.md note on them.
- `melody/transposeAbc.js`, `melody/words/`: ABC rewriting patterns.
- `theory/chordScales.js`: the key's notes, to shade in-key notes on the grid.

## UI

- A piano roll component: time across, pitch up. A window of about an octave and a half, with scroll.
- Shade the notes in the key, so people who don't read music stay in tune without knowing why.
- Play each note as it's drawn, through the existing `melody` channel (via `playArrangement`/`band.js`, the way the melody already plays). Hearing it straight away matters most for non-readers.
- Tooltips on every control: `use:tooltip={TIPS.area.thing}`, and add the tip in `lib/tooltips/tips.js` (CLAUDE.md, "Tooltips").
- It sits as a new input in the Melody tab, next to the ABC box (`components/melody/MelodyPanel.svelte`). It doesn't replace abcjs or the rest of the arranger.
- Use `ui-card`, `ui-button` and the other shared classes, and no hard-coded colours (CLAUDE.md, "Look and theming").
- Drafts: while the drawn melody has unsaved changes, it must keep a draft on the device (`storage/drafts.js`, the pattern in `arranger/state/drafts.svelte.js`). The user asked for this every time it comes up, without asking.
- Clean up listeners and audio when the editor unmounts.

## Questions to ask first

Each has my suggested default. Ask the user, and take the default if they say so.

1. **Source of truth.** When the user draws, is the note list the saved melody, with ABC written from it? Or is ABC always the saved form, and the piano roll only edits it? _Default: the note list while drawing, ABC stored in the song as today, so older songs still load._
2. **Grid.** Eighths only, or sixteenths and triplets as well? _Default: eighths, with a switch to sixteenths._
3. **Meter and key.** Where do they come from? The song's time signature and key, or set in the editor? _Default: from the song._
4. **Starting points.** Walk through these with the user (below). Which are needed in the first version?
5. **Harmony parts.** Do drawn melodies get the harmony parts (`melody/harmony/`) as they do now? _Default: yes, through the existing path._
6. **Scope of the first build.** _Default: draw from scratch, tap and drag, play as drawn, write ABC into the Melody tab. Everything else later._

## The user experiences to walk through

- **A. Knows the chords, wants a melody.** The song already has a chord arrangement. The editor opens in that song's key and meter, with the chords shown under the grid to draw against. Output: the melody sits over the chart.
- **B. Has an arrangement string, not a tune.** Starts from the song as it is. The chord progression is the only input; the user draws over it.
- **C. Knows a tune and wants to type it.** Types ABC in the box; the piano roll draws it so they can see and fix it. This is the `abcToNotes` path.
- **D. Starts from nothing.** A blank song, pick a key and meter, draw. Fits the "New" flow.
- **E. Edits an existing melody.** Opens the current ABC as notes (lossy case warned), edits, writes back.

Ask which of these to build first.

## Where it plugs in (verify these names in the code first)

- The Melody tab UI: `components/melody/MelodyPanel.svelte`.
- The melody state: `state/MelodyState.svelte.js`.
- Writing ABC: `Arranger.svelte.js` already writes the melody and harmony text. Check what the melody-setting path is.
- Playback: `playback/`, the melody channel via `partChannels.js`.
- Saved fields: `state/songFields.js`. If a new field is added (e.g. the note list), bump `ARRANGEMENT_VERSION` in `storage/arrangements.js` and migrate in `upgrade`, as CLAUDE.md requires.

## Checks before calling it done

- `npm run build` (the type/compile check).
- `npx eslint` on the files touched, and `npm run lint`.
- A Node script for `notesToAbc` / `abcToNotes`: round-trip common tunes, with pickups and repeats. Check the ABC parses with abcjs.
- In the browser preview: add, move, resize and delete notes with the mouse and with a phone-width view. Confirm the sheet music updates and the melody plays.
- Check the drafts behaviour: edit, reload, see the restore offer.

## Todo

The suggestion `melody-entry` in `todo.json` says "Simple form-based melody entry, plus MIDI import". Change it to the piano-roll editor when the work starts. Edit `todo.json` directly and keep its shape (`id`, `text`, `done`, `addedAt`). Tick `done` when built, and say so.

## Related files

- `CLAUDE.md` (project root): the architecture and rules.
- `HANDOFF-sampling-session.md`, `HANDOFF-sampler-pilot.md`: the format these handoffs follow.
- `src/lib/arranger/README.md` and `src/lib/README.md`: keep them current when files are added or moved.

## Decisions (asked 2026-11-08)

1. **Saved form: ABC only.** No new song field, no version bump. The editor reads notes from the ABC when it opens and writes back on every edit. Tunes it can't read fully stay ABC-only, with a note saying so.
2. **Rhythm: rich enough for anything.** Times are integer ticks, not float beats (48 per quarter covers sixteenths = 12, eighth triplets = 16, sixteenth triplets = 8, thirty-seconds = 6). The first grid offers eighths, sixteenths and triplets (Irish and some fiddle tunes need them). Any meter the chart allows, including `[M:]` changes and one-bar `[2/4]`.
3. **Two-way sync.** If there's ABC, it fills the editor; editing either side keeps the other in step.
4. **Editing keeps the rest of the ABC.** Header, bar lines and repeats stay; each edited bar's notes are rewritten; chords are written back from the chart; words are re-placed on the new notes (`melody/words/`); harmony parts are rewritten if the song has them.
5. **Most users start from chords under the bars** (experiences A/B): the chart's chords show under the grid.
6. **Key: guessed, with a manual override.** The user agreed to K:, and asked that it coordinate with the scrolling strip's key, always mindful of the capo and what a real player finds useful. Open point: one key decision for the strip and the melody (see below).
7. **Harmony parts:** drawn melodies get them through the existing path.

### Key coordination (open)

Today the strip's key is `songKey` (`chart/key.js`), guessed from the first chord: the _shapes_ key. The Key menu shows it moved by capo + transpose. The ABC's K: is concert: shapes key + capo. A correction kept only in K: would fix the melody but not the strip (or its Roman/Nashville labels, or the Key menu), and a song without a melody would have nowhere to keep it.

## Status (2026-11-08): first version built

Decisions 1–7 are built, with the key coordination settled as `[K:]` in the chart (CLAUDE.md, "The song's key" and "Piano roll"). Since built: the playhead on the roll, editable harmony parts and harmony options (CLAUDE.md, "Piano roll"). Not built yet: a pickup bar when drawing a new tune, MIDI import (in todo.json). Not checked by hand: the drawn note's sound, and the touch gestures on a real iPhone (the browser pane sends mouse clicks).
