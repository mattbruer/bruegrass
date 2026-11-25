/**
 * What the guitar plays on each chord of the song (instruments/guitarPlan.js:
 * the shape, each boom's note, each chuck's strings), worked out once per
 * change, the chord picked to look at and change, and changing it. Your
 * changes are saved with the song (`song.guitarChords`,
 * instruments/guitarEdits.js), through Undo.
 */
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
			return guitarChords(sectionsToPlay(arrangement.sections), { edits: song.guitarChords })
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
		this.change({ shape: undefined, booms: undefined, chucks: undefined });
	}
}
