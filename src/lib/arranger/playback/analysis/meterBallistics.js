/**
 * How a level meter moves, like a console's:
 *   - the bar jumps up at once but falls back smoothly, so it's readable,
 *   - a peak-hold mark stays at the recent highest point for a moment,
 *   - a clip light comes on at full scale and stays on until it's cleared.
 */

/** How fast the bar falls, in dB per second. */
const FALL_DB_PER_SECOND = 24;
/** How long the peak-hold mark stays before falling. */
const PEAK_HOLD_SECONDS = 1.5;
/** At or above this, the signal is clipping. */
const CLIP_DB = 0;

/**
 * One channel's meter (call it once per animation frame).
 * @param {number} floorDb the bottom of the meter (anything quieter shows as empty)
 */
export function createMeterBallistics(floorDb) {
	let shownDb = floorDb;
	let holdDb = floorDb;
	let holdSetAt = 0;
	let clipped = false;

	return {
		/**
		 * Take a new reading and return what the meter should show.
		 * @param {number} levelDb this frame's peak level
		 * @param {number} now seconds (any steady clock)
		 * @param {number} elapsed seconds since the last reading
		 */
		update(levelDb, now, elapsed) {
			const level = Math.max(floorDb, levelDb);

			const fallen = shownDb - FALL_DB_PER_SECOND * elapsed;
			shownDb = Math.max(level, fallen, floorDb);

			if (level >= holdDb) {
				// A new high: the mark jumps up and starts its hold
				holdDb = level;
				holdSetAt = now;
			} else if (now - holdSetAt > PEAK_HOLD_SECONDS) {
				// Held long enough: the mark falls like the bar
				holdDb = Math.max(level, holdDb - FALL_DB_PER_SECOND * elapsed, floorDb);
			}

			if (levelDb >= CLIP_DB) clipped = true;
			return { shownDb, holdDb, clipped };
		},

		/** Turn the clip light off (tapping it). */
		clearClip() {
			clipped = false;
		}
	};
}
