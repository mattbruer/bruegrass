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
 * paste onto another, or saved under a name for every song. Copying bars
 * (instruments/guitarBars.js) takes a run of chords: tap the first, then
 * the last, so it works with a finger.
 */
import { emptyFill } from '../instruments/guitarFill.js';
import { isEmptyPattern, patternOf, patternOnto } from '../instruments/guitarPatterns.js';
import { copiedBars, hasChanges, pasteBars } from '../instruments/guitarBars.js';
import {
	deleteGuitarPattern,
	listGuitarPatterns,
	saveGuitarPattern
} from '$lib/storage/guitarPatterns.js';
import { guitarChords } from '../instruments/guitarPlan.js';
import { movedNote } from '../instruments/guitarPatterns.js';
import { withGuitarEdit, editedGuitar } from '../instruments/guitarEdits.js';
import { isNoChord, sectionsToPlay } from '../chart/noChord.js';
import { slotPositions } from '../chart/timeline.js';
import { concertChord } from '../chart/concertChords.js';
import { mod12, songKey } from '../chart/key.js';

/**
 * @typedef {import('../instruments/guitarPlan.js').GuitarChord & { label: string, sounds: string }} GuitarChordInSong
 *   label: the chord the hand holds, as the lane and header say it;
 *   sounds: the chord as it sounds with the capo and key ("A" for a G shape with capo 2)
 */

export class GuitarState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** Where the picked chord starts (quarters from bar 1). */
	pickedStart = $state(0);

	/** Chords' changes, copied to paste onto others, one chord or a run (kept for this visit). */
	copied = /** @type {import('../instruments/guitarPatterns.js').GuitarPattern[]} */ (
		$state.raw([])
	);
	/** While choosing the bars to copy: where the first and the last chord start (else null). */
	range = /** @type {{ from: number, to: number } | null} */ ($state.raw(null));
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
				style: arrangement.style,
				shift: arrangement.shapesShift
			})
				.filter((_, slot) => !isNoChord(written[slot].name))
				.map((chord) => ({
					...chord,
					label: chord.shapeName,
					sounds: concertChord(chord.name, key, shift)
				}));
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
		return editedGuitar(this.#arranger.song.guitarChords, chord.editAt, chord.name).fill;
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
		const pattern = patternOf(
			chord.name,
			editedGuitar(song.guitarChords, chord.editAt, chord.name)
		);
		return isEmptyPattern(pattern) ? null : pattern;
	});

	/** The chords from `from` to `to` (either way round), by where they start. */
	#chordsBetween(/** @type {number} */ from, /** @type {number} */ to) {
		const [first, last] = [Math.min(from, to), Math.max(from, to)];
		return this.chords.filter((chord) => chord.start >= first - 1e-6 && chord.start <= last + 1e-6);
	}

	/** The picked chord's changes, to paste (nothing to copy if it has none). */
	copy() {
		this.copied = this.pickedPattern ? [this.pickedPattern] : [];
	}

	/** Start choosing bars to copy, from the picked chord. */
	startRange() {
		this.range = { from: this.pickedStart, to: this.pickedStart };
	}

	/** @param {number} start the last chord of the run (tapped on the lane) */
	extendRange(start) {
		if (this.range) this.range = { from: this.range.from, to: start };
	}

	cancelRange() {
		this.range = null;
	}

	/** The chords the range covers. */
	rangeChords = $derived(this.range ? this.#chordsBetween(this.range.from, this.range.to) : []);

	/** What the chosen chords have changed, in order. */
	#rangePatterns = $derived(copiedBars(this.rangeChords, this.#arranger.song.guitarChords));

	/** Is there anything changed in the chosen chords to copy? */
	rangeHasChanges = $derived(hasChanges(this.#rangePatterns));

	/** Copy the chosen bars, and leave choosing. */
	copyRange() {
		if (this.rangeHasChanges) this.copied = this.#rangePatterns;
		this.range = null;
	}

	/** Paste what was copied from the picked chord on, a chord for each. */
	paste() {
		const { song, history } = this.#arranger;
		const from = this.chords.findIndex((chord) => chord.start === this.picked?.start);
		if (from < 0 || this.copied.length === 0) return;
		const patterns = this.copied;
		const targets = this.chords.slice(from);
		history.edit(() => (song.guitarChords = pasteBars(song.guitarChords, targets, patterns)));
	}

	/** Where the lane marks: the chords being chosen, else the ones a paste here would cover. */
	marked = $derived.by(() => {
		if (this.range) return this.rangeChords.map((chord) => chord.start);
		const from = this.chords.findIndex((chord) => chord.start === this.picked?.start);
		if (from < 0 || this.copied.length < 2) return [];
		return this.chords.slice(from, from + this.copied.length).map((chord) => chord.start);
	});

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
		const now = rebased(
			editedGuitar(song.guitarChords, chord.editAt, chord.name),
			this.#arranger.arrangement.shapesShift
		);
		history.edit(
			() =>
				(song.guitarChords = withGuitarEdit(song.guitarChords, chord.editAt, chord.name, {
					...now,
					...change
				}))
		);
	}

	/** Forget every change to the picked chord: the band plays it its own way. */
	reset() {
		this.change({
			shape: undefined,
			madeAt: undefined,
			booms: undefined,
			chucks: undefined,
			notes: undefined,
			accents: undefined,
			slurs: undefined,
			strums: undefined,
			fill: undefined
		});
	}
}

/**
 * Your saved changes as they are at this shift (Key less capo): a shape made
 * at another shift is the book's again, the picked notes and booms move with it, and
 * what's written now is marked as made at this one.
 * @param {import('../instruments/guitarEdits.js').GuitarChange} change
 * @param {number} shift
 * @returns {import('../instruments/guitarEdits.js').GuitarChange}
 */
function rebased(change, shift) {
	const moved = shift - (change.madeAt ?? 0);
	return {
		...change,
		madeAt: shift,
		shape: moved === 0 ? change.shape : undefined,
		notes: change.notes?.map((note) => note && movedNote(note, moved)),
		booms: change.booms?.map((boom) => boom && movedNote(boom, moved))
	};
}
