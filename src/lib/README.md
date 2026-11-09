# `src/lib`: where everything lives

Pages are in `src/routes` (one folder per URL). Everything they use is here,
grouped by feature. Import from here with `$lib/...`.

| Folder        | What's in it                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arranger/`   | The rhythm-section arranger (the `/arranger` page): chord charts, instruments, playback, melody. See [arranger/README.md](arranger/README.md).                                                                                                                                                                                                                        |
| `sampler/`    | The sampling page (`/sampler`, a dev tool: local dev on a computer only): record your own instrument samples: the input check and test take, then a guided session (checklists and a what-to-record list, take analysis and checks, many hits per recording to choose from, progress, export as WAVs + manifest, and a copy of every kept take in `samples-source/`). |
| `recording/`  | Recording from a microphone or audio interface, in plain Web Audio: the input (call-style processing off), meters' taps, the recorder, take playback and a metronome click. Shared with the arranger later.                                                                                                                                                           |
| `songs/`      | The song list (the `/` page): the list of MP3s and the player.                                                                                                                                                                                                                                                                                                        |
| `settings/`   | The Settings panel (opened from the top bar) and the saved preferences behind it.                                                                                                                                                                                                                                                                                     |
| `theme/`      | The look of the app: colour, shadow and corner tokens, and the shared `ui-*` classes.                                                                                                                                                                                                                                                                                 |
| `tooltips/`   | Tooltips on every control: the `use:tooltip` action and all their wording (`tips.js`).                                                                                                                                                                                                                                                                                |
| `todo/`       | The dev-only todo page's pieces (`/todo`, saved in `todo.json`). `server/todoList.js` reads and writes the file; `devOnly.js` says when dev tools show.                                                                                                                                                                                                               |
| `storage/`    | Saving and loading user data (songs, EQ presets, listening setups, which setup this device uses, each song's mix between saves, and drafts of unsaved work) in this browser's localStorage, and sampling sessions' audio in IndexedDB. A database later.                                                                                                              |
| `components/` | Small pieces used across the whole app (the top bar, the dialog frame, the name-it dialog, the unsaved-changes dot, `TabSwitch` for a few views in tabs, and `paper/`: any content laid out on printable pages).                                                                                                                                                      |
| `utils/`      | Tiny general helpers with no app knowledge (download a file, make a slug, watch for a touch screen).                                                                                                                                                                                                                                                                  |
| `assets/`     | Images bundled with the app (the favicon).                                                                                                                                                                                                                                                                                                                            |

## A few conventions

- **Small pieces, composed.** Functions live in their own modules and are imported by thin components. Each decision (a limit, a list of choices, a colour) lives in one place, so a change of direction is a one-file edit.

- **Files ending `.svelte.js`** use Svelte's reactive state (`$state`,
  `$effect`) outside a component. The suffix is required for that.
- **Styling** comes from the tokens in `theme/tokens.css` and the classes in
  `theme/ui.css`. Components don't use raw colours, so changing the look (or
  a user's Appearance settings) restyles everything.
- **Saving data** always goes through `storage/` (or `settings/` for
  preferences), never straight to `localStorage`, so where data lives can
  change in one place.
