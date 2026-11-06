/**
 * The output stage, after the master fader: like a mastering chain, the
 * last thing before the speakers. Built from native Web Audio nodes and our
 * own AudioWorklets.
 *
 *   master ─▶ output gain ─▶ true-peak limiter ─▶ compare trim ─▶ speakers
 *                                      │
 *                                      └─▶ K-weighting (2 × IIRFilterNode) ─▶ loudness meter
 *
 *   - Output gain (GainNode): brings the mix up to a loudness target.
 *   - Limiter (worklet): a ceiling nothing can pass, whatever the faders do.
 *   - Compare trim (GainNode): only used while comparing (see setComparison).
 *   - Loudness meter (worklet): LUFS readings of what you hear.
 */
import { createWorkletNode } from '../worklets/worklets.js';
import { kWeightingLowCut, kWeightingShelf } from './kWeighting.js';
import {
	CEILING_DBTP,
	LIMITER_LOOKAHEAD_SECONDS,
	LIMITER_RELEASE_SECONDS
} from './outputSettings.js';

/** Gain changes glide over about this long, so moving the gain never clicks. */
const GLIDE_SECONDS = 0.05;

/**
 * The latest readings, updated by the worklets as audio plays (plain
 * numbers, read each frame by the meters, so not reactive state).
 * @typedef {{
 *   momentary: number,
 *   shortTerm: number,
 *   integrated: number,
 *   integratedSeconds: number,
 *   gainReductionDb: number
 * }} OutputReadings
 *   LUFS (-Infinity when silent); integratedSeconds: how much playing the
 *   integrated reading covers; gainReductionDb: how much the limiter is
 *   turning down right now (0 or less)
 */

/**
 * @param {typeof import('tone')} Tone
 * @param {{ gainDb: number }} settings
 */
export async function createOutputStage(Tone, { gainDb }) {
	const audio = Tone.getContext().rawContext;
	const stereo = /** @type {const} */ ({ channelCount: 2, channelCountMode: 'explicit' });

	const gain = audio.createGain();
	gain.gain.value = dbToGain(gainDb);

	const limiter = await createWorkletNode(Tone, 'true-peak-limiter', {
		numberOfInputs: 1,
		numberOfOutputs: 1,
		outputChannelCount: [2],
		...stereo,
		processorOptions: {
			ceilingDb: CEILING_DBTP,
			lookaheadSeconds: LIMITER_LOOKAHEAD_SECONDS,
			releaseSeconds: LIMITER_RELEASE_SECONDS
		}
	});
	const compareTrim = audio.createGain();

	// The meter's path: K-weighting, then the meter, which outputs silence.
	// It's wired on to the speakers only so the browser keeps running it.
	const shelf = kWeightingShelf(audio.sampleRate);
	const lowCut = kWeightingLowCut(audio.sampleRate);
	const kShelf = audio.createIIRFilter(shelf.feedforward, shelf.feedback);
	const kLowCut = audio.createIIRFilter(lowCut.feedforward, lowCut.feedback);
	const meter = await createWorkletNode(Tone, 'loudness-meter', {
		numberOfInputs: 1,
		numberOfOutputs: 1,
		outputChannelCount: [2],
		...stereo
	});

	Tone.connect(gain, limiter);
	Tone.connect(limiter, compareTrim);
	Tone.connect(limiter, kShelf);
	Tone.connect(kShelf, kLowCut);
	Tone.connect(kLowCut, meter);
	Tone.connect(meter, audio.destination);

	/** @type {OutputReadings} */
	const readings = {
		momentary: -Infinity,
		shortTerm: -Infinity,
		integrated: -Infinity,
		integratedSeconds: 0,
		gainReductionDb: 0
	};
	let integratedSince = audio.currentTime;
	meter.port.onmessage = ({ data }) => {
		readings.momentary = data.momentary;
		readings.shortTerm = data.shortTerm;
		readings.integrated = data.integrated;
		readings.integratedSeconds = audio.currentTime - integratedSince;
	};
	limiter.port.onmessage = ({ data }) => {
		readings.gainReductionDb = data.gainReductionDb;
	};

	/** Start the integrated (whole-song) loudness again: a new play, or a new gain. */
	function resetLoudness() {
		meter.port.postMessage({ type: 'reset' });
		readings.integrated = -Infinity;
		readings.integratedSeconds = 0;
		integratedSince = audio.currentTime;
	}

	let currentGainDb = gainDb;
	let comparing = false;

	return {
		/** Where the master connects. */
		input: gain,
		/** What goes to the speakers. */
		output: compareTrim,
		readings,
		resetLoudness,

		/** @param {number} db */
		setGain(db) {
			if (db === currentGainDb) return;
			currentGainDb = db;
			gain.gain.setTargetAtTime(dbToGain(db), audio.currentTime, GLIDE_SECONDS / 3);
			if (comparing)
				compareTrim.gain.setTargetAtTime(dbToGain(-db), audio.currentTime, GLIDE_SECONDS / 3);
			resetLoudness(); // the old readings were at the old gain
		},

		/**
		 * A fair A/B test of the output stage. While comparing, everything is
		 * turned back down by the output gain, so both sides play at the same
		 * loudness (louder always *sounds* better, which makes an unmatched
		 * comparison useless) and nothing can clip with the limiter out:
		 *   - hearing the output stage: gain → limiter → trimmed back
		 *   - hearing the original: exactly the master, as if the stage weren't there
		 * Not comparing: the output stage as normal.
		 * @param {{ comparing: boolean, hearOriginal: boolean }} comparison
		 */
		setComparison(comparison) {
			comparing = comparison.comparing;
			const trimDb = comparing ? -currentGainDb : 0;
			compareTrim.gain.setTargetAtTime(dbToGain(trimDb), audio.currentTime, GLIDE_SECONDS / 3);
			limiter.port.postMessage({ type: 'bypass', value: comparing && comparison.hearOriginal });
		}
	};
}

/** @param {number} db */
function dbToGain(db) {
	return 10 ** (db / 20);
}
