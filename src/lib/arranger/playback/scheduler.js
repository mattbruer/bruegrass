/**
 * Looping note streams for the lookahead scheduler.
 *
 * A stream walks through a sorted list of notes that repeats every `period`
 * seconds, handing out each note exactly once, in order, with its absolute
 * time (`cycle × period + note.time`, so there's no drift however long it
 * loops). The player asks for a small slice at a time, which keeps the work
 * of queuing notes spread evenly instead of arriving in one big burst.
 */

/**
 * @template {{ time: number }} T
 * @param {T[]} notes sorted by time, seconds from the start of a cycle
 * @param {number} period cycle length in seconds
 */
export function createStream(notes, period) {
	let cycle = 0;
	let index = 0;

	/** Absolute time of the note under the cursor. */
	const nextTime = () => cycle * period + notes[index].time;

	function advance() {
		index++;
		if (index >= notes.length) {
			index = 0;
			cycle++;
		}
	}

	return {
		/**
		 * Every note due before `until`, each with its index and absolute time.
		 * @param {number} until seconds from the start of playback
		 * @returns {{ note: T, index: number, at: number }[]}
		 */
		take(until) {
			/** @type {{ note: T, index: number, at: number }[]} */
			const due = [];
			if (notes.length === 0 || period <= 0) return due;
			while (nextTime() < until) {
				due.push({ note: notes[index], index, at: nextTime() });
				advance();
			}
			return due;
		},

		/**
		 * Skip notes whose time has already passed (after a stall), so nothing
		 * is ever played late.
		 * @param {number} time seconds from the start of playback
		 */
		skipBefore(time) {
			if (notes.length === 0 || period <= 0) return;
			// Jump whole cycles first, then step through the rest
			const behind = Math.floor((time - nextTime()) / period);
			if (behind > 0) cycle += behind;
			while (nextTime() < time) advance();
		}
	};
}
