/**
 * The band in Transcribe: the arranger's guitar, mandolin and bass playing
 * the chart along with the recording (bandAlong.js times them to it). One
 * Band lane, with its own volume, mute and solo, sets how loud the whole
 * band is; each instrument's own level is the mixer's. A bass written by
 * ear has its own lane, so its mute and solo count too.
 */
import { preparePerformance } from '../instruments/performance.js';
import { createBand } from '../instruments/band.js';
import { getChannel } from '../mixer/mixerGraph.svelte.js';
import { chosenBassStyle } from '../bass/songBassStyle.svelte.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { chordBlocks } from '../tracks/lanes.js';
import { createBandAlong, streamsOnRecording } from './bandAlong.js';

/** The mixer channels the band plays into. */
export const BAND_CHANNELS = ['guitar', 'mandolin', 'bass'];

/** How quickly the band's level follows a change (seconds), so mute never clicks. */
const LEVEL_SECONDS = 0.01;

export class TranscribeBand {
	/** The Band lane's volume (dB), mute and solo (not saved, like the recording's). */
	lane = $state({ volume: 0, mute: false, solo: false });

	/** Everything the band plays, one pass of the chart at the recording's usual tempo (null: nothing to play). */
	performance = $derived.by(() => {
		const { transcription } = this;
		const { arrangement, bass } = transcription.arranger;
		if (!transcription.linked || !transcription.grid || !arrangement.isPlayable) return null;
		return preparePerformance(arrangement.sections, {
			bpm: transcription.tempo || 120,
			capo: arrangement.capoFret,
			transpose: arrangement.transpose,
			loop: false,
			bass: bass.written,
			bassStyle: chosenBassStyle()
		});
	});

	/** The chords the band plays, for its lane (quarters from bar 1). */
	blocks = $derived(
		this.performance ? chordBlocks(this.transcription.arranger.arrangement.sections) : []
	);

	/** @type {Map<string, import('tone').Gain>} the band level, one per channel the band plays into */
	// Audio nodes, not UI state
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	#levels = new Map();
	/** @type {Record<string, number>} each channel's band level now */
	#levelOf = {};
	/** @type {typeof import('tone') | null} */
	#tone = null;
	/** What the band playing now was made from: a change of either makes a fresh one. */
	/** @type {{ performance: unknown, grid: unknown } | null} */
	#madeFrom = null;

	#along = createBandAlong({
		makeBand: () => this.#makeBand(),
		loop: () => this.transcription.player.loop,
		now: () => this.#tone?.getContext().currentTime ?? 0
	});

	/** @param {import('./TranscriptionState.svelte.js').TranscriptionState} transcription */
	constructor(transcription) {
		this.transcription = transcription;
	}

	/**
	 * Where the recording is heard now: the band plays along.
	 * @param {import('$lib/slowDowner/StretchPlayer.svelte.js').Clock} clock
	 */
	follow(clock) {
		const { performance } = this;
		const { grid } = this.transcription;
		const stale = this.#madeFrom?.performance !== performance || this.#madeFrom?.grid !== grid;
		if (this.#madeFrom && stale) this.stop();
		if (performance) this.#along.follow(clock);
	}

	/** Silence the band (the recording paused). */
	stop() {
		this.#along.stop();
		this.#madeFrom = null;
	}

	/**
	 * How loud the band is: the Band lane's level, and for the bass, whether
	 * its own lane (a bass written by ear) is heard.
	 * @param {{ band: number, parts: Record<string, number> }} levels from laneLevels
	 * @param {boolean} bassHasLane
	 */
	setLevels({ band, parts }, bassHasLane) {
		this.#levelOf = {
			guitar: band,
			mandolin: band,
			bass: bassHasLane && !(parts[BASS_VOICE] > 0) ? 0 : band
		};
		for (const [id, gain] of this.#levels)
			gain.gain.rampTo(this.#levelOf[id] ?? band, LEVEL_SECONDS);
	}

	/** Let go of the band and its level nodes (the arranger is going). */
	dispose() {
		this.stop();
		for (const gain of this.#levels.values()) gain.dispose();
		this.#levels.clear();
	}

	async #makeBand() {
		const { performance } = this;
		const { grid } = this.transcription;
		if (!performance || !grid) return null;
		const Tone = (this.#tone ??= await import('tone'));
		const band = await createBand(Tone, performance, (id) => this.#levelFor(Tone, id));
		this.#madeFrom = { performance, grid };
		return { band, streams: streamsOnRecording(band.streams, performance.quarter, grid) };
	}

	/**
	 * The band level in front of a mixer channel, made the first time the band plays into it.
	 * @param {typeof import('tone')} Tone
	 * @param {string} id the mixer channel
	 */
	async #levelFor(Tone, id) {
		const made = this.#levels.get(id);
		if (made) return made;
		const gain = new Tone.Gain(this.#levelOf[id] ?? 1);
		this.#levels.set(id, gain);
		gain.connect(await getChannel(id));
		return gain;
	}
}
