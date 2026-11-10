/**
 * What the tune's voices (the melody and each harmony part) can play on:
 * the guitar samples, or a Tone.js synth standing in until there are
 * samples, as the upright does for the bass. Each voice's channel picks one
 * on its mixer strip. A new instrument is one entry in TUNE_INSTRUMENTS.
 */

export const GUITAR = 'guitar';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   family: string,
 *   synth?: {
 *     voice: 'Synth' | 'MonoSynth' | 'FMSynth' | 'AMSynth',
 *     options: Record<string, any>,
 *     vibrato?: { frequency: number, depth: number },
 *     octave?: number,
 *     volumeDb: number
 *   }
 * }} TuneInstrument
 *   family: the heading it's listed under; synth: none for the guitar
 *   samples; octave: semitones above where the guitar sounds the tune (the
 *   guitar sounds an octave below written, so 12 is as written)
 */

/** Envelope shapes the recipes below share. */
const BOWED = { attack: 0.06, decay: 0.2, sustain: 0.85, release: 0.2 };
const BLOWN = { attack: 0.03, decay: 0.1, sustain: 0.9, release: 0.08 };
const STRUCK = { attack: 0.001, decay: 1.2, sustain: 0, release: 0.8 };
const HELD = { attack: 0.005, decay: 0.1, sustain: 1, release: 0.06 };

/**
 * @param {number} baseFrequency
 * @param {number} octaves
 * @param {number} [attack]
 */
const filterSweep = (baseFrequency, octaves, attack = 0.08) => ({
	filter: { type: 'lowpass', Q: 1.5, rolloff: -24 },
	filterEnvelope: { attack, decay: 0.3, sustain: 0.6, release: 0.2, baseFrequency, octaves }
});

/*
 * Levels (volumeDb) were set by measuring a three-note phrase: held sounds
 * match the guitar samples' loudness, struck ones sit a little under it.
 */
/** @type {TuneInstrument[]} */
export const TUNE_INSTRUMENTS = [
	{ id: GUITAR, name: 'Guitar', family: 'Plucked and struck' },
	{
		id: 'harp',
		name: 'Harp',
		family: 'Plucked and struck',
		synth: {
			voice: 'Synth',
			options: { oscillator: { type: 'triangle' }, envelope: { ...STRUCK, decay: 1.6 } },
			octave: 12,
			volumeDb: -6
		}
	},
	{
		id: 'pizzicato',
		name: 'Pizzicato',
		family: 'Plucked and struck',
		synth: {
			voice: 'MonoSynth',
			options: {
				oscillator: { type: 'sawtooth' },
				envelope: { attack: 0.003, decay: 0.35, sustain: 0, release: 0.2 },
				...filterSweep(300, 3, 0.003)
			},
			octave: 12,
			volumeDb: -3
		}
	},
	{
		id: 'marimba',
		name: 'Marimba',
		family: 'Plucked and struck',
		synth: {
			voice: 'FMSynth',
			options: {
				harmonicity: 4,
				modulationIndex: 1.5,
				envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.4 },
				modulationEnvelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
			},
			octave: 12,
			volumeDb: 3
		}
	},
	{
		id: 'bells',
		name: 'Bells',
		family: 'Plucked and struck',
		synth: {
			voice: 'FMSynth',
			options: {
				harmonicity: 3.5,
				modulationIndex: 12,
				envelope: { ...STRUCK, decay: 2 },
				modulationEnvelope: { attack: 0.001, decay: 1, sustain: 0, release: 0.5 }
			},
			octave: 24,
			volumeDb: -2
		}
	},
	{
		id: 'fiddle',
		name: 'Fiddle',
		family: 'Strings',
		synth: {
			voice: 'MonoSynth',
			options: { oscillator: { type: 'sawtooth' }, envelope: BOWED, ...filterSweep(700, 2.5) },
			vibrato: { frequency: 5.5, depth: 0.08 },
			octave: 12,
			volumeDb: -10
		}
	},
	{
		id: 'cello',
		name: 'Cello',
		family: 'Strings',
		synth: {
			voice: 'MonoSynth',
			options: {
				oscillator: { type: 'sawtooth' },
				envelope: { ...BOWED, attack: 0.12 },
				...filterSweep(300, 2, 0.15)
			},
			vibrato: { frequency: 5, depth: 0.06 },
			volumeDb: -10
		}
	},
	{
		id: 'strings',
		name: 'String section',
		family: 'Strings',
		synth: {
			voice: 'Synth',
			options: {
				oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
				envelope: { attack: 0.3, decay: 0.3, sustain: 0.8, release: 0.6 }
			},
			octave: 12,
			volumeDb: -3
		}
	},
	{
		id: 'whistle',
		name: 'Whistle',
		family: 'Winds',
		synth: {
			voice: 'Synth',
			options: { oscillator: { type: 'triangle' }, envelope: BLOWN },
			vibrato: { frequency: 5, depth: 0.04 },
			octave: 24,
			volumeDb: -11
		}
	},
	{
		id: 'flute',
		name: 'Flute',
		family: 'Winds',
		synth: {
			voice: 'Synth',
			options: { oscillator: { type: 'sine' }, envelope: { ...BLOWN, attack: 0.06 } },
			vibrato: { frequency: 5, depth: 0.05 },
			octave: 12,
			volumeDb: -13
		}
	},
	{
		id: 'clarinet',
		name: 'Clarinet',
		family: 'Winds',
		synth: {
			voice: 'MonoSynth',
			options: { oscillator: { type: 'square' }, envelope: BLOWN, ...filterSweep(900, 1) },
			octave: 12,
			volumeDb: -15
		}
	},
	{
		id: 'harmonica',
		name: 'Harmonica',
		family: 'Winds',
		synth: {
			voice: 'MonoSynth',
			options: {
				oscillator: { type: 'pulse', width: 0.3 },
				envelope: { ...BLOWN, attack: 0.02 },
				...filterSweep(1200, 1.5, 0.03)
			},
			vibrato: { frequency: 6, depth: 0.06 },
			octave: 12,
			volumeDb: -17
		}
	},
	{
		id: 'accordion',
		name: 'Accordion',
		family: 'Winds',
		synth: {
			voice: 'Synth',
			options: { oscillator: { type: 'fatsquare', count: 2, spread: 12 }, envelope: BLOWN },
			octave: 12,
			volumeDb: -9
		}
	},
	{
		id: 'trumpet',
		name: 'Trumpet',
		family: 'Brass',
		synth: {
			voice: 'MonoSynth',
			options: {
				oscillator: { type: 'sawtooth' },
				envelope: { ...BLOWN, attack: 0.03 },
				...filterSweep(400, 4, 0.05)
			},
			octave: 12,
			volumeDb: -10
		}
	},
	{
		id: 'horn',
		name: 'Horn',
		family: 'Brass',
		synth: {
			voice: 'MonoSynth',
			options: {
				oscillator: { type: 'sawtooth' },
				envelope: { ...BLOWN, attack: 0.08 },
				...filterSweep(250, 2.5, 0.12)
			},
			volumeDb: -10
		}
	},
	{
		id: 'keys',
		name: 'Electric piano',
		family: 'Keys',
		synth: {
			voice: 'FMSynth',
			options: {
				harmonicity: 3,
				modulationIndex: 8,
				envelope: { attack: 0.002, decay: 1.4, sustain: 0.1, release: 0.6 },
				modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.05, release: 0.4 }
			},
			octave: 12,
			volumeDb: 2
		}
	},
	{
		id: 'organ',
		name: 'Organ',
		family: 'Keys',
		synth: {
			voice: 'Synth',
			options: {
				oscillator: { type: 'custom', partials: [1, 0.8, 0.6, 0, 0.4, 0, 0, 0.3] },
				envelope: HELD
			},
			octave: 12,
			volumeDb: -12
		}
	},
	{
		id: 'choir',
		name: 'Choir “ooh”',
		family: 'Voices and pads',
		synth: {
			voice: 'Synth',
			options: {
				oscillator: { type: 'fattriangle', count: 3, spread: 15 },
				envelope: { attack: 0.15, decay: 0.2, sustain: 0.9, release: 0.5 }
			},
			vibrato: { frequency: 5, depth: 0.03 },
			octave: 12,
			volumeDb: -7
		}
	},
	{
		id: 'pad',
		name: 'Warm pad',
		family: 'Voices and pads',
		synth: {
			voice: 'AMSynth',
			options: {
				harmonicity: 2,
				envelope: { attack: 0.5, decay: 0.3, sustain: 0.9, release: 1.2 },
				modulationEnvelope: { attack: 0.8, decay: 0.3, sustain: 1, release: 1 }
			},
			octave: 12,
			volumeDb: 7
		}
	},
	{
		id: 'square-lead',
		name: 'Square lead',
		family: 'Synths',
		synth: {
			voice: 'Synth',
			options: { oscillator: { type: 'square' }, envelope: { ...HELD, sustain: 0.7 } },
			octave: 12,
			volumeDb: -12
		}
	},
	{
		id: 'saw-lead',
		name: 'Saw lead',
		family: 'Synths',
		synth: {
			voice: 'MonoSynth',
			options: { oscillator: { type: 'sawtooth' }, envelope: HELD, ...filterSweep(1500, 2, 0.01) },
			vibrato: { frequency: 5.5, depth: 0.05 },
			octave: 12,
			volumeDb: -11
		}
	},
	{
		id: 'chip',
		name: 'Chiptune',
		family: 'Synths',
		synth: {
			voice: 'Synth',
			options: { oscillator: { type: 'pulse', width: 0.25 }, envelope: { ...HELD, sustain: 0.6 } },
			octave: 12,
			volumeDb: -13
		}
	}
];

/**
 * The instruments by family, in list order.
 * @returns {{ family: string, instruments: TuneInstrument[] }[]}
 */
export function instrumentFamilies() {
	const families = [...new Set(TUNE_INSTRUMENTS.map((each) => each.family))];
	return families.map((family) => ({
		family,
		instruments: TUNE_INSTRUMENTS.filter((each) => each.family === family)
	}));
}

/**
 * The instrument with this id, or the guitar for an unknown one.
 * @param {string | undefined} id
 */
export function tuneInstrument(id) {
	return TUNE_INSTRUMENTS.find((each) => each.id === id) ?? TUNE_INSTRUMENTS[0];
}

/**
 * A synth instrument, ready to play into a channel. Notes may overlap.
 * @param {typeof import('tone')} Tone
 * @param {NonNullable<TuneInstrument['synth']>} synth
 * @param {import('tone').InputNode} destination
 */
export function createTuneSynth(Tone, synth, destination) {
	const vibrato = synth.vibrato ? new Tone.Vibrato(synth.vibrato).connect(destination) : null;
	const poly = new Tone.PolySynth(/** @type {any} */ (Tone[synth.voice]), synth.options);
	poly.volume.value = synth.volumeDb;
	poly.connect(vibrato ?? destination);

	return {
		/**
		 * @param {number} pitch MIDI, where the guitar would sound it
		 * @param {number} duration seconds
		 * @param {number} time audio-clock time
		 * @param {number} levelDb the note's level as the guitar would play it
		 */
		play(pitch, duration, time, levelDb) {
			poly.triggerAttackRelease(
				Tone.Frequency(pitch + (synth.octave ?? 0), 'midi').toFrequency(),
				duration,
				time,
				Math.min(1, Tone.dbToGain(levelDb))
			);
		},
		/** Fade out quickly and let go of the synth (cancels anything scheduled). */
		stop() {
			poly.volume.rampTo(-Infinity, 0.03);
			setTimeout(() => {
				poly.dispose();
				vibrato?.dispose();
			}, 200);
		}
	};
}

/**
 * The instrument a mixer channel plays the tune on.
 * @param {{ id: string, instrument?: string }[]} channels the live mixer's or a saved mix's
 * @param {string} channelId
 */
export function channelInstrument(channels, channelId) {
	return tuneInstrument(channels.find((channel) => channel.id === channelId)?.instrument);
}
