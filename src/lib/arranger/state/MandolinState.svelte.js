/**
 * The mandolin's chops through the song, worked out once per change (one
 * per chord: yours where you've changed it, else the band's), the one
 * picked to look at and change, and changing it. Your chops are saved with
 * the song (`song.chops`, instruments/chopEdits.js), through Undo.
 */
import { songChops } from '../instruments/mandolin.js';
import { withChopEdit } from '../instruments/chopEdits.js';
import { sectionsToPlay } from '../chart/noChord.js';
import { concertChord } from '../chart/concertChords.js';
import { mod12, songKey } from '../chart/key.js';
import { withoutBass, withoutVariant } from '../instruments/chordBook.js';

/**
 * @typedef {import('../instruments/mandolin.js').SongChop & { sounds: string }} ChopInSong
 *   sounds: the chord at concert pitch, as the mandolin plays it ("A" for a G with capo 2)
 */

export class MandolinState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** Where the picked chop's chord starts (quarters from bar 1). */
	pickedStart = $state(0);

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/** Every chord's chop, in order ([]: a chart the band can't play). @type {ChopInSong[]} */
	chops = $derived.by(() => {
		const { arrangement, song } = this.#arranger;
		if (!arrangement.isPlayable) return [];
		const shift = mod12(arrangement.pitchShift);
		const key = songKey(arrangement.sections);
		try {
			return songChops(sectionsToPlay(arrangement.sections), {
				capo: shift,
				edits: song.chops
			}).map((chop) => ({
				...chop,
				sounds: concertChord(withoutBass(withoutVariant(chop.name)), key, shift)
			}));
		} catch {
			return [];
		}
	});

	/** The picked chop: the one whose chord is sounding at `pickedStart`. */
	picked = $derived(
		this.chops.findLast((chop) => chop.start <= this.pickedStart + 1e-6) ?? this.chops[0] ?? null
	);

	/** @param {number} quarters pick the chop sounding here */
	pickAt(quarters) {
		this.pickedStart = quarters;
	}

	/**
	 * Change the picked chop (frets null: back to the band's own).
	 * @param {(number | null)[] | null} frets G D A E, null = muted
	 */
	change(frets) {
		const chop = this.picked;
		if (!chop) return;
		const { song, history } = this.#arranger;
		history.edit(() => (song.chops = withChopEdit(song.chops, chop.start, chop.chord, frets)));
	}
}
