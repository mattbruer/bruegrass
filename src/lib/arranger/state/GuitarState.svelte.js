/**
 * What the guitar plays on each chord of the song (instruments/guitarPlan.js:
 * the shape, each boom's note, each chuck's strings), worked out once per
 * change, the chord picked to look at and change, and changing it. Your
 * changes are saved with the song (`song.guitarChords`,
 * instruments/guitarEdits.js), through Undo.
 *
 * A fill (instruments/guitarFill.js): notes you write for the picked
 * chord's last bars, played in place of the band's strum.
 *
 * Patterns (instruments/guitarPatterns.js): one chord's changes copied to
 * paste onto another, or saved under a name for every song.
 */
import { emptyFill } from '../instruments/guitarFill.js';
import { isEmptyPattern, patternOf, patternOnto } from '../instruments/guitarPatterns.js';
import {
	deleteGuitarPattern,
	listGuitarPatterns,
	saveGuitarPattern
} from '$lib/storage/guitarPatterns.js';
import { guitarChords } from '../instruments/guitarPlan.js';
import { withGuitarEdit, editedGuitar } from '../instruments/guitarEdits.js';
import { isNoChord, sectionsToPlay } from '../chart/noChord.js';
import { slotPositions } from '../chart/timeline.js';
import { concertChord } from '../chart/concertChords.js';
import { mod12, songKey } from '../chart/key.js';

/**
 * @typedef {import('../instruments/guitarPlan.js').GuitarChord & { sounds: string }} GuitarChordInSong
 *   sounds: the chord as it sounds with the capo and key ("A" for a G shape with capo 2)
 */

export class GuitarState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** Where the picked chord starts (quarters from bar 1). */
	pickedStart = $state(0);

	/** A chord's changes, copied to paste onto another (kept for this visit). */
	copied = /** @type {import('../instruments/guitarPatterns.js').GuitarPattern | null} */ (
		$state.raw(null)
	);
	/** Your saved patterns, for every song (loaded with `loadPatterns`). */
	patterns = /** @type {import('$lib/storage/guitarPatterns.js').SavedGuitarPattern[]} */ (
		$state.raw([])
	);

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/**
	 * Every chord the guitar plays, in order ([]: a chart the band can't
	 * play). None where the chart says N.C.: the band is silent there.
	 * @type {GuitarChordInSong[]}
	 */
	chords = $derived.by(() => {
		const { arrangement, song } = this.#arranger;
		if (!arrangement.isPlayable) return [];
		const shift = mod12(arrangement.pitchShift);
		const key = songKey(arrangement.sections);
		const written = slotPositions(arrangement.sections);
		try {
			return guitarChords(sectionsToPlay(arrangement.sections), {
				edits: song.guitarChords,
				style: arrangement.style
			})
				.filter((_, slot) => !isNoChord(written[slot].name))
				.map((chord) => ({ ...chord, sounds: concertChord(chord.name, key, shift) }));
		} catch {
			return [];
		}
	});

	/** The picked chord: the one sounding at `pickedStart`. */
	picked = $derived(
		this.chords.findLast((chord) => chord.start <= this.pickedStart + 1e-6) ??
			this.chords[0] ??
			null
	);

	/** The picked chord's fill as saved (bars and notes), or undefined. */
	#savedFill() {
		const chord = this.picked;
		if (!chord) return undefined;
		return editedGuitar(this.#arranger.song.guitarChords, chord.start, chord.name).fill;
	}

	/** Play the picked chord's last bar as a fill you write, starting empty. */
	writeFill() {
		this.change({ fill: emptyFill() });
	}

	/** The picked chord back to the band's strum (the fill is forgotten). */
	endFill() {
		this.change({ fill: undefined });
	}

	/**
	 * Change the picked chord's fill.
	 * @param {Partial<import('../instruments/guitarFill.js').Fill>} change
	 */
	changeFill(change) {
		const fill = this.#savedFill();
		if (fill) this.change({ fill: { ...fill, ...change } });
	}

	/** The picked chord's changes as a pattern (null: nothing changed to take). */
	pickedPattern = $derived.by(() => {
		const chord = this.picked;
		if (!chord) return null;
		const { song } = this.#arranger;
		const pattern = patternOf(chord.name, editedGuitar(song.guitarChords, chord.start, chord.name));
		return isEmptyPattern(pattern) ? null : pattern;
	});

	copy() {
		this.copied = this.pickedPattern;
	}

	/**
	 * Play the picked chord as a pattern says (all of it on the same chord,
	 * the right hand on another).
	 * @param {import('../instruments/guitarPatterns.js').GuitarPattern} pattern
	 */
	use(pattern) {
		const chord = this.picked;
		if (chord) this.change(patternOnto(pattern, chord.name));
	}

	async loadPatterns() {
		this.patterns = await listGuitarPatterns();
	}

	/** @param {string} name keep the picked chord's changes as a pattern, for every song */
	async savePattern(name) {
		if (!this.pickedPattern) return;
		await saveGuitarPattern(name, this.pickedPattern);
		await this.loadPatterns();
	}

	/** @param {string} id */
	async deletePattern(id) {
		await deleteGuitarPattern(id);
		await this.loadPatterns();
	}

	/** @param {number} quarters pick the chord sounding here */
	pickAt(quarters) {
		this.pickedStart = quarters;
	}

	/**
	 * Change part of how the picked chord is played, keeping your other changes.
	 * @param {import('../instruments/guitarEdits.js').GuitarChange} change
	 *   a part set to undefined goes back to the band's
	 */
	change(change) {
		const chord = this.picked;
		if (!chord) return;
		const { song, history } = this.#arranger;
		const now = editedGuitar(song.guitarChords, chord.start, chord.name);
		history.edit(
			() =>
				(song.guitarChords = withGuitarEdit(song.guitarChords, chord.start, chord.name, {
					...now,
					...change
				}))
		);
	}

	/** Forget every change to the picked chord: the band plays it its own way. */
	reset() {
		this.change({
			shape: undefined,
			booms: undefined,
			chucks: undefined,
			notes: undefined,
			accents: undefined,
			fill: undefined
		});
	}
}
