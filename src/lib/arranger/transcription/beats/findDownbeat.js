/**
 * Which beat is ONE. Chords mostly change on a bar's first beat, and the
 * bass (the boom) plays on the first beat more than the next, so each way
 * of grouping the beats into bars is scored by how much the chord changes
 * at its bar starts, plus how much bass lands there.
 */
import { frameAt } from './analyseRecording.js';

/** How much the bass on ONE counts, against the chord changing there. */
const BASS_WEIGHT = 0.5;

/**
 * @param {import('./analyseRecording.js').Analysis} analysis
 * @param {number[]} beats seconds
 * @param {number} beatsPerBar
 * @returns {number} the first beat that's a ONE (0 to beatsPerBar − 1)
 */
export function findDownbeat(analysis, beats, beatsPerBar) {
	if (beats.length < beatsPerBar * 2) return 0;
	const colours = beats.map((_, i) => chordColour(analysis, beats, i));
	const half = Math.max(1, Math.floor(beatsPerBar / 2));
	const changes = beats.map((_, i) => chordChange(colours, i, half));
	const bass = beats.map((seconds) => analysis.bass[frameAt(analysis, seconds)] ?? 0);

	const scores = Array.from({ length: beatsPerBar }, (_, start) => {
		let score = 0;
		for (let i = start; i < beats.length; i += beatsPerBar)
			score += changes[i] + BASS_WEIGHT * bass[i];
		return score / Math.ceil((beats.length - start) / beatsPerBar);
	});
	return scores.indexOf(Math.max(...scores));
}

/**
 * The pitch classes sounding from one beat to the next, scaled to length 1.
 * @param {import('./analyseRecording.js').Analysis} analysis
 * @param {number[]} beats
 * @param {number} i
 */
function chordColour(analysis, beats, i) {
	const colour = new Float64Array(12);
	const from = Math.max(0, frameAt(analysis, beats[i]));
	const end = beats[i + 1] ?? beats[i] + (beats[i] - (beats[i - 1] ?? beats[i] - 0.5));
	const to = Math.min(analysis.chroma.length / 12, frameAt(analysis, end));
	for (let frame = from; frame < to; frame++) {
		for (let pitch = 0; pitch < 12; pitch++) colour[pitch] += analysis.chroma[frame * 12 + pitch];
	}
	const size = Math.hypot(...colour) || 1;
	return colour.map((value) => value / size);
}

/**
 * How different the chord sounds in the beats after `i` from the beats before it (0 to 1).
 * @param {Float64Array[]} colours
 * @param {number} i
 * @param {number} span beats either side
 */
function chordChange(colours, i, span) {
	if (i < span || i + span > colours.length) return 0;
	const before = new Float64Array(12);
	const after = new Float64Array(12);
	for (let k = 0; k < span; k++) {
		colours[i - 1 - k].forEach((value, pitch) => (before[pitch] += value));
		colours[i + k].forEach((value, pitch) => (after[pitch] += value));
	}
	let dot = 0;
	for (let pitch = 0; pitch < 12; pitch++) dot += before[pitch] * after[pitch];
	return 1 - dot / ((Math.hypot(...before) || 1) * (Math.hypot(...after) || 1));
}
