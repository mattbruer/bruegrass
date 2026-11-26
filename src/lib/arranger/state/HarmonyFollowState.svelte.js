/**
 * After a chord edit that would change the harmony parts, ask whether to
 * rewrite them (components/melody/HarmonyFollowDialog.svelte). Rewrite
 * writes each whole part fresh (melody/harmonyFollowsChords.js), as one
 * Undo step; a part changed by hand is named, so you know it's replaced.
 * The question waits for a pause, so typing a chord in the chart asks once.
 */
import { partsOffTheChords, withPartsRewritten } from '../melody/harmonyFollowsChords.js';
import { concertChordAt } from '../chart/concertChords.js';

/** How long the chords must stay put before the question shows. */
const PAUSE_MS = 700;

/**
 * @typedef {import('../melody/harmony/writeHarmonies.js').ChordAt} ChordAt
 * @typedef {import('../melody/harmonyFollowsChords.js').PartNow} PartNow
 */

export class HarmonyFollowState {
	/** The parts the new chords would change, while asking. @type {PartNow[] | null} */
	question = $state.raw(null);
	#arranger;
	/** The chords the parts were last written for (this visit), and before the edit asked about. */
	/** @type {ChordAt | null} */
	#lastWritten = null;
	/** @type {ChordAt | null} */
	#beforeEdit = null;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	#timer;

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/**
	 * The chart's chords changed.
	 * @param {ChordAt} chordBefore the band's concert chord at a time, before the edit
	 */
	chordsChanged(chordBefore) {
		this.#beforeEdit ??= chordBefore;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => (this.question = this.#partsOff()), PAUSE_MS);
	}

	rewrite() {
		const { melody, history } = this.#arranger;
		const tune = melody.tune;
		const parts = this.question;
		if (tune && parts) {
			history.edit(() => {
				melody.notation = withPartsRewritten(melody.notation, tune, parts, this.#chordNow());
			});
		}
		this.written();
	}

	keep() {
		this.question = null;
		this.#beforeEdit = null;
	}

	/** The parts were just written for the chords now. */
	written() {
		this.keep();
		this.#lastWritten = this.#chordNow();
	}

	/** Another song is open. */
	forget() {
		clearTimeout(this.#timer);
		this.keep();
		this.#lastWritten = null;
	}

	/** @returns {PartNow[] | null} */
	#partsOff() {
		const { melody, arrangement } = this.#arranger;
		const tune = melody.tune;
		if (!tune || !arrangement.isPlayable || !this.#beforeEdit) return null;
		const writtenFor = [this.#lastWritten, this.#beforeEdit].filter((chordAt) => chordAt !== null);
		const parts = partsOffTheChords(melody.notation, tune, writtenFor, this.#chordNow());
		if (parts.length === 0) this.#beforeEdit = null;
		return parts.length > 0 ? parts : null;
	}

	#chordNow() {
		const { arrangement } = this.#arranger;
		return concertChordAt(arrangement.sections);
	}
}
