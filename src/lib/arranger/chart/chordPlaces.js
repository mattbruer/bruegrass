import { barQuarters, DEFAULT_METER } from './timeline.js';

/**
 * The beats a chord may change on. In 3/4, any beat: up to three chords a
 * bar. In every other bar, the downbeat and the middle of the bar (beat 3
 * in 4/4): up to two chords, since bluegrass doesn't change chords faster.
 * @param {number} beats the bar's length in quarters
 * @returns {number[]}
 */
export function chordPlaces(beats) {
	if (beats === 3) return [0, 1, 2];
	if (beats < 2) return [0];
	return [0, Math.floor(beats / 2)];
}

/**
 * Whether a bar may hold this many chords: one, or one on every place
 * (|G,D| is two halves in 4/4, but has no clear lengths in 3/4).
 * @param {number} count chords written in the bar
 * @param {number} beats the bar's length in quarters
 */
export function allowedChordCount(count, beats) {
	return count <= 1 || count === chordPlaces(beats).length;
}

/**
 * What to tell you about a bar with the wrong number of chords.
 * @param {number} count
 * @param {number} beats the bar's length in quarters
 * @param {string} where e.g. "Verse, bar 3"
 */
export function chordCountMessage(count, beats, where) {
	const allowed =
		chordPlaces(beats).length === 3
			? 'one chord, or three (one a beat: G,G,D holds G for two)'
			: 'one chord, or two (half the bar each)';
	return `${where} has ${count} chords. A bar holds ${allowed}.`;
}

/**
 * The first bar in the chart with the wrong number of chords, worded ('' when there's none).
 * @param {import('./timeline.js').Section[]} sections
 */
export function chordCountProblem(sections) {
	for (const section of sections) {
		for (const [index, bar] of section.measures.entries()) {
			const count = bar.filter(Boolean).length;
			const beats = barQuarters(section.meters?.[index] ?? DEFAULT_METER);
			if (!allowedChordCount(count, beats))
				return chordCountMessage(count, beats, `${section.name}, bar ${index + 1}`);
		}
	}
	return '';
}
