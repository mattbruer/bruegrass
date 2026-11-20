/**
 * The parts written in Transcribe (the tune, harmony, a bass, generic lanes),
 * heard with the recording on the instruments their notes play on when
 * tapped (playback/partVoice.js), timed to the recording like the band
 * (bandAlong.js). Each lane's mute and solo (a level in front of its
 * channel) decide whether it's heard; its volume is its channel's fader.
 */
import { getChannel } from '../mixer/mixerGraph.svelte.js';
import { mixer } from '../mixer/mixer.svelte.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { isLaneId } from '../melody/roll/extraLane.js';
import { createPartVoice } from '../playback/partVoice.js';
import { createBandAlong } from './bandAlong.js';

/** How quickly a part's level follows a change (seconds), so mute never clicks. */
const LEVEL_SECONDS = 0.01;

/**
 * The mixer channel a lane plays through: a generic lane plays as the melody does.
 * @param {string} laneId
 */
export function partChannel(laneId) {
	return isLaneId(laneId) ? MELODY_CHANNEL : laneId;
}

export class TranscribeParts {
	/** @type {Map<string, import('tone').Gain>} one level per lane, made the first time it plays */
	// Audio nodes, not UI state
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#levels = new Map();
	/** @type {Record<string, number>} each lane heard (1) or not (0) */
	#levelOf = {};
	/** @type {typeof import('tone') | null} */
	#tone = null;
	/** What the parts playing now were made from: a change makes fresh ones. */
	#madeFrom = '';
	/** @type {unknown} */
	#madeFromNotes = null;

	#along = createBandAlong({
		makeBand: () => this.#makeParts(),
		loop: () => this.transcription.player.loop,
		now: () => this.#tone?.getContext().currentTime ?? 0
	});

	/** @param {import('./TranscriptionState.svelte.js').TranscriptionState} transcription */
	constructor(transcription) {
		this.transcription = transcription;
	}

	/** What decides how the parts sound, other than their notes: the Key and each channel's instrument. */
	get #sound() {
		const instruments = mixer.channels.map((channel) => channel.instrument ?? '').join();
		return `${this.transcription.arranger.arrangement.transpose}|${instruments}`;
	}

	/**
	 * Where the recording is heard now: the parts play along.
	 * @param {import('$lib/slowDowner/StretchPlayer.svelte.js').Clock} clock
	 */
	follow(clock) {
		const { heardNotes } = this.transcription;
		const stale = this.#madeFromNotes !== heardNotes || this.#madeFrom !== this.#sound;
		if (this.#madeFromNotes && stale) this.stop();
		if (heardNotes.length > 0) this.#along.follow(clock);
	}

	/** Silence the parts (the recording paused). */
	stop() {
		this.#along.stop();
		this.#madeFromNotes = null;
	}

	/** @param {Record<string, number>} parts each lane's level from laneLevels (0: not heard) */
	setLevels(parts) {
		this.#levelOf = Object.fromEntries(
			Object.entries(parts).map(([id, level]) => [id, level > 0 ? 1 : 0])
		);
		for (const [id, gain] of this.#levels) gain.gain.rampTo(this.#levelOf[id] ?? 1, LEVEL_SECONDS);
	}

	/** Let go of the parts and their level nodes (the arranger is going). */
	dispose() {
		this.stop();
		for (const gain of this.#levels.values()) gain.dispose();
		this.#levels.clear();
	}

	async #makeParts() {
		const notes = this.transcription.heardNotes;
		if (notes.length === 0) return null;
		const Tone = (this.#tone ??= await import('tone'));
		const shift = this.transcription.arranger.arrangement.transpose;
		const lanes = notes.map((note) => note.part).filter((part, i, all) => all.indexOf(part) === i);

		const streams = await Promise.all(
			lanes.map(async (lane) => {
				const own = notes.filter((note) => note.part === lane);
				const voice = createPartVoice(
					Tone,
					partChannel(lane),
					await this.#levelFor(Tone, lane),
					shift
				);
				await voice.prepare(own.map((note) => note.pitch));
				return {
					voice,
					play: (/** @type {any} */ note, /** @type {number} */ _index, /** @type {number} */ at) =>
						voice.play(note.pitch, at, note.stop - at),
					notes: own.map((note, index) => ({
						note,
						index,
						start: note.start,
						stop: note.end,
						duration: null
					}))
				};
			})
		);
		this.#madeFromNotes = notes;
		this.#madeFrom = this.#sound;
		return {
			band: { streams: [], stop: () => streams.forEach(({ voice }) => voice.stop()) },
			streams
		};
	}

	/**
	 * The level in front of a lane's channel.
	 * @param {typeof import('tone')} Tone
	 * @param {string} lane
	 */
	async #levelFor(Tone, lane) {
		const made = this.#levels.get(lane);
		if (made) return made;
		const gain = new Tone.Gain(this.#levelOf[lane] ?? 1);
		this.#levels.set(lane, gain);
		gain.connect(await getChannel(partChannel(lane)));
		return gain;
	}
}
