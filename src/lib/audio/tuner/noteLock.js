/**
 * Which note the tuner shows. A reading alone flickers (a pick's attack,
 * a harmonic ringing over the note, the moment between two notes), so a new
 * note has to hold for a moment, its readings agreeing, before it's shown,
 * and a little longer when it's an octave or fifth of the note already
 * shown (the usual harmonic mistake). The shown note keeps a little past
 * halfway to the next, so a string tuned right between two doesn't flip.
 */

/** A new note must hold this long (seconds) before it's shown. */
const HOLD = 0.05;
/** …this long when it's an octave, fifth or fourth of the shown note. */
const HOLD_RELATED = 0.12;
/** Readings of a new note must agree this closely, one to the next (cents). */
const AGREE_CENTS = 8;
/** The shown note stays until a reading is this far from it (semitones). */
const STAY_WITHIN = 0.6;
/** After this long without a note, nothing is shown (seconds). */
const FORGET_AFTER = 3;

export function createNoteLock() {
	/** @type {number | null} */
	let shown = null;
	/** @type {{ note: number, since: number, last: number } | null} */
	let candidate = null;
	let lastHeard = -Infinity;

	return {
		/**
		 * @param {number | null} midi the reading (fractional), null: no note heard
		 * @param {number} time seconds
		 * @returns {number | null} the note to show
		 */
		update(midi, time) {
			if (midi === null) {
				candidate = null;
				if (time - lastHeard > FORGET_AFTER) shown = null;
				return shown;
			}
			lastHeard = time;
			if (shown !== null && Math.abs(midi - shown) <= STAY_WITHIN) {
				candidate = null;
				return shown;
			}

			const note = Math.round(midi);
			const agrees =
				candidate?.note === note && Math.abs(midi - candidate.last) * 100 <= AGREE_CENTS;
			candidate =
				agrees && candidate ? { ...candidate, last: midi } : { note, since: time, last: midi };

			const hold = shown !== null && isRelated(note, shown) ? HOLD_RELATED : HOLD;
			if (time - candidate.since >= hold) {
				shown = note;
				candidate = null;
			}
			return shown;
		}
	};
}

/** @param {number} a @param {number} b */
function isRelated(a, b) {
	const interval = Math.abs(a - b) % 12;
	return interval === 0 || interval === 7 || interval === 5;
}
