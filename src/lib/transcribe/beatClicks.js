/**
 * Clicks mixed into the slowed-down song, on times in the song (not on the
 * clock), so they stay on the beat at any speed. Runs on the audio thread
 * inside stretchPlayerProcessor.js.
 */

const CLICK_SECONDS = 0.035;
const CLICK_HZ = 1100;
const ACCENT_HZ = 1760;
const CLICK_LEVEL = 0.3;
const ACCENT_LEVEL = 0.45;
/** A block that jumps further than this through the song was a jump, not playing: no clicks. */
const MAX_BLOCK_SECONDS = 0.1;

/** @param {number} sampleRate */
export function createBeatClicks(sampleRate) {
	/** @type {number[]} */
	let times = [];
	/** @type {boolean[]} */
	let accents = [];
	/** @type {{ from: number, age: number, hz: number, level: number }[]} */
	let sounding = [];
	const length = Math.round(CLICK_SECONDS * sampleRate);

	/** First click at or after `seconds`. */
	function firstFrom(seconds) {
		let low = 0;
		let high = times.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (times[middle] < seconds) low = middle + 1;
			else high = middle;
		}
		return low;
	}

	return {
		/**
		 * @param {number[]} newTimes seconds into the song, in order
		 * @param {boolean[]} newAccents
		 */
		set(newTimes, newAccents) {
			times = newTimes;
			accents = newAccents;
		},

		/**
		 * Add the clicks that fall in this block of output.
		 * @param {Float32Array} left
		 * @param {Float32Array} right
		 * @param {number} from where in the song the block started (seconds)
		 * @param {number} to where it ended
		 */
		mixInto(left, right, from, to) {
			const span = to - from;
			if (span > 0 && span < MAX_BLOCK_SECONDS) {
				for (let i = firstFrom(from); i < times.length && times[i] < to; i++) {
					const at = Math.floor(((times[i] - from) / span) * left.length);
					sounding.push({
						from: at,
						age: 0,
						hz: accents[i] ? ACCENT_HZ : CLICK_HZ,
						level: accents[i] ? ACCENT_LEVEL : CLICK_LEVEL
					});
				}
			}
			for (const click of sounding) {
				for (let i = click.from; i < left.length && click.age < length; i++, click.age++) {
					const fade = 1 - click.age / length;
					const sample =
						click.level * fade * fade * Math.sin((2 * Math.PI * click.hz * click.age) / sampleRate);
					left[i] += sample;
					right[i] += sample;
				}
				click.from = 0;
			}
			sounding = sounding.filter((click) => click.age < length);
		}
	};
}
