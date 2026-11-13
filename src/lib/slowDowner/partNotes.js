/**
 * The parts written so far (the tune, harmony, bass), played as plain
 * tones mixed into the slowed-down song. Like the clicks (beatClicks.js),
 * notes sit on times in the song, not on the clock, so they stay with the
 * recording at any speed, through jumps and the cycle. Each part has a
 * level (0 for muted). Runs on the audio thread inside
 * stretchPlayerProcessor.js.
 *
 * @typedef {{ start: number, end: number, hz: number, part: string }} PartNote
 *   start, end: seconds into the song
 */

/** The tone: a few harmonics, so pitch is easy to hear against a recording. */
const HARMONICS = [1, 0.35, 0.15, 0.06];
const NOTE_LEVEL = 0.12;
const ATTACK_SECONDS = 0.006;
/** After the attack it settles to this share of full level over DECAY_SECONDS. */
const SUSTAIN = 0.55;
const DECAY_SECONDS = 0.25;
const RELEASE_SECONDS = 0.06;
/** A block that jumps further than this through the song was a jump, not playing. */
const MAX_BLOCK_SECONDS = 0.1;
/** How quickly a part's level follows a change (seconds), so mute never clicks. */
const LEVEL_SECONDS = 0.01;

/** @param {number} sampleRate */
export function createPartNotes(sampleRate) {
	/** @type {PartNote[]} */
	let notes = [];
	/** @type {Record<string, number>} */
	let levels = {};
	/** @type {Record<string, number>} each part's level as heard now (moving towards `levels`) */
	const heard = {};
	/** @type {{ note: PartNote, from: number, age: number, releasedAt: number | null }[]} */
	let sounding = [];
	let lastTo = -1;
	const attack = ATTACK_SECONDS * sampleRate;
	const decay = DECAY_SECONDS * sampleRate;
	const release = RELEASE_SECONDS * sampleRate;
	const levelStep = 1 / (LEVEL_SECONDS * sampleRate);

	/** First note starting at or after `seconds`. */
	function firstFrom(seconds) {
		let low = 0;
		let high = notes.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (notes[middle].start < seconds) low = middle + 1;
			else high = middle;
		}
		return low;
	}

	/** @param {number} age samples since the note began @param {number | null} releasedAt */
	function envelope(age, releasedAt) {
		const held =
			age < attack
				? age / attack
				: SUSTAIN + (1 - SUSTAIN) * Math.exp(-(age - attack) / (decay / 3));
		if (releasedAt === null) return held;
		return Math.max(0, held * (1 - (age - releasedAt) / release));
	}

	/** @param {number} phase */
	function tone(phase) {
		let sample = 0;
		for (let h = 0; h < HARMONICS.length; h++) sample += HARMONICS[h] * Math.sin(phase * (h + 1));
		return sample;
	}

	return {
		/** @param {PartNote[]} newNotes in order of start */
		set(newNotes) {
			notes = newNotes;
			sounding = [];
		},

		/** @param {Record<string, number>} newLevels each part's level, 0 to 1 (a part not listed: 1) */
		setLevels(newLevels) {
			levels = newLevels;
		},

		/**
		 * Add the notes that sound in this block of output.
		 * @param {Float32Array} left
		 * @param {Float32Array} right
		 * @param {number} from where in the song the block started (seconds)
		 * @param {number} to where it ended
		 */
		mixInto(left, right, from, to) {
			const span = to - from;
			const playedOn = Math.abs(from - lastTo) < 1e-4 && span > 0 && span < MAX_BLOCK_SECONDS;
			lastTo = to;
			if (!playedOn) {
				for (const voice of sounding) voice.releasedAt ??= voice.age;
			} else {
				for (let i = firstFrom(from); i < notes.length && notes[i].start < to; i++) {
					const at = Math.floor(((notes[i].start - from) / span) * left.length);
					sounding.push({ note: notes[i], from: at, age: 0, releasedAt: null });
				}
			}
			for (const voice of sounding) {
				const { note } = voice;
				const endsAt =
					playedOn && note.end < to
						? Math.max(voice.from, Math.floor(((note.end - from) / span) * left.length))
						: Infinity;
				const step = (2 * Math.PI * note.hz) / sampleRate;
				const target = levels[note.part] ?? 1;
				let level = heard[note.part] ?? target;
				for (let i = voice.from; i < left.length; i++, voice.age++) {
					if (i >= endsAt) voice.releasedAt ??= voice.age;
					level += Math.max(-levelStep, Math.min(levelStep, target - level));
					const sample =
						NOTE_LEVEL * level * envelope(voice.age, voice.releasedAt) * tone(voice.age * step);
					left[i] += sample;
					right[i] += sample;
				}
				heard[note.part] = level;
				voice.from = 0;
			}
			sounding = sounding.filter(
				(voice) => voice.releasedAt === null || voice.age - voice.releasedAt < release
			);
		}
	};
}
