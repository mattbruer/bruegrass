/**
 * The Channel EQ as audio nodes: Web Audio BiquadFilterNodes in a row, one
 * per band (two for a 24 dB/octave cut, since each filter gives 12).
 *
 *   input ─▶ low cut ─▶ low shelf ─▶ bells ×4 ─▶ high shelf ─▶ high cut ─▶ output
 *
 * Built from plain Web Audio rather than Tone's Filter, which won't accept
 * the negative Q (in dB) that a smooth Butterworth cut needs.
 *
 * Only bands that are on are wired into the row, so an EQ that's off (or a
 * band that's off) costs nothing and colours nothing. Turning bands on and
 * off rewires the row; moving a band just changes its filter.
 */
import { EQ_BANDS, isCut } from './eqBands.js';
import { BUTTERWORTH_Q } from './eqResponse.js';

/** Changes glide (settling in about this long), so sweeping a band doesn't zipper or click. */
const GLIDE_SECONDS = 0.03;
/**
 * Web Audio reads a low- or high-pass filter's Q in decibels, not as a
 * plain number. This is the Butterworth width (0.707) in those units.
 */
const BUTTERWORTH_Q_DB = 20 * Math.log10(BUTTERWORTH_Q);
/** The most filter stages a band can use (a 24 dB/octave cut). */
const MAX_STAGES = 2;

/**
 * @param {typeof import('tone')} Tone
 * @param {import('./eqBands.js').EqSettings} settings
 */
export function createEq(Tone, settings) {
	const audio = Tone.getContext().rawContext;
	const input = new Tone.Gain();
	const output = new Tone.Gain();

	/** Each band's filter stages, in band order. */
	const stagesByBand = new Map(
		EQ_BANDS.map((definition) => {
			const stageCount = isCut(definition.shape) ? MAX_STAGES : 1;
			const stages = Array.from({ length: stageCount }, () => {
				const filter = audio.createBiquadFilter();
				filter.type = definition.shape;
				if (isCut(definition.shape)) filter.Q.value = BUTTERWORTH_Q_DB;
				return filter;
			});
			return [definition.id, stages];
		})
	);

	/** What the row was last wired for: which bands are on, and the cuts' slopes. */
	let wiredFor = /** @type {string | null} */ (null); // null: never wired yet

	/** @param {import('./eqBands.js').EqSettings} next */
	function rewire(next) {
		const bandsInUse = next.enabled ? next.bands.filter((band) => band.on) : [];
		const wiring = bandsInUse.map((band) => `${band.id}:${band.slope}`).join(',');
		if (wiring === wiredFor) return;
		wiredFor = wiring;
		const row = bandsInUse.flatMap(stagesInUse);

		input.disconnect();
		for (const stages of stagesByBand.values()) for (const filter of stages) filter.disconnect();

		let previous = /** @type {import('tone').ToneAudioNode | BiquadFilterNode} */ (input);
		for (const filter of row) {
			Tone.connect(previous, filter);
			previous = filter;
		}
		Tone.connect(previous, output);
	}

	/**
	 * The filters a band uses: both stages for a 24 dB/octave cut, else one.
	 * @param {import('./eqBands.js').BandSettings} band
	 */
	function stagesInUse(band) {
		const stages = stagesByBand.get(band.id) ?? [];
		return stages.slice(0, band.slope === 24 ? MAX_STAGES : 1);
	}

	/**
	 * Follow new settings.
	 * @param {import('./eqBands.js').EqSettings} next
	 */
	function update(next) {
		const now = audio.currentTime;
		for (const band of next.bands) {
			for (const filter of stagesByBand.get(band.id) ?? []) {
				glide(filter.frequency, band.frequency, now);
				if (filter.type === 'peaking') glide(filter.Q, band.q, now);
				if (!isCut(filter.type)) glide(filter.gain, band.gain, now);
			}
		}
		rewire(next);
	}

	update(settings);
	return { input, output, update };
}

/**
 * @param {AudioParam} param
 * @param {number} value
 * @param {number} now
 */
function glide(param, value, now) {
	param.setTargetAtTime(value, now, GLIDE_SECONDS / 3);
}
