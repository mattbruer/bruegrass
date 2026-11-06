/**
 * The automatic checks on a take, in plain words: what the tool can
 * measure so you don't have to listen for it (the AI can't listen at all).
 *
 * Each problem is 'redo' (the take is unusable: clipped, no hit, a second
 * hit, the wrong note) or 'check' (worth a listen: out of tune, noisy,
 * louder or brighter than its other takes). Nothing stops you keeping a
 * take; the checks only say what they found.
 */
import { formatDb } from '../takeSummary.js';

/** At or above this peak (dBFS) a take counts as clipped: the interface's converter hit full scale. */
const CLIP_DB = -0.1;
/** Below this peak (dBFS) a take is too quiet: turn the gain up. */
const QUIET_DB = -30;
/** More than this many cents off asks for a retune. */
const OUT_OF_TUNE_CENTS = 10;
/** More than this far off isn't tuning: it's the wrong string or fret. */
const WRONG_NOTE_CENTS = 60;
/** Hiss louder than this (dB below the hit's peak) is worth a listen. */
const NOISE_DB = -45;
/** A sound before the hit stands this many dB above the hiss. */
const BEFORE_HIT_ABOVE_NOISE_DB = 6;
/** Still this loud (dB below the peak) when recording stopped: the note was cut off. */
const CUT_OFF_DB = -35;
/** A take this many dB louder or softer than the middle of its other takes stands out. */
const LOUDNESS_SPREAD_DB = 3;
/** A take this much brighter or duller (fraction) than the middle of its other takes stands out. */
const BRIGHTNESS_SPREAD = 0.25;

/** @typedef {{ severity: 'redo' | 'check', text: string }} TakeProblem */

/**
 * @param {import('./analyseTake.js').TakeAnalysis} analysis
 * @param {{
 *   pitched: boolean,
 *   stringName: string | null,
 *   fretted: boolean,
 *   pattern: boolean,
 *   afterAnotherHit?: boolean,
 *   endsAtNextHit?: boolean
 * }} target
 *   pattern: many hits on purpose (a strum pattern to a click), so no second-hit check.
 *   afterAnotherHit / endsAtNextHit: one hit of a longer recording, so the
 *   last note's ring before it isn't noise, and it may be cut by the next
 * @param {import('./analyseTake.js').TakeAnalysis[]} others kept takes of the same note and intensity
 * @returns {TakeProblem[]}
 */
export function takeProblems(analysis, target, others) {
	/** @type {TakeProblem[]} */
	const problems = [];
	const redo = (/** @type {string} */ text) => problems.push({ severity: 'redo', text });
	const check = (/** @type {string} */ text) => problems.push({ severity: 'check', text });

	if (analysis.onset === null) {
		redo('No hit found: the take is silent or only noise.');
		return problems;
	}

	analysis.peaksDb.forEach((db, index) => {
		if (db >= CLIP_DB) redo(`Clipped on input ${index + 1}: turn its gain down a little.`);
	});
	if (analysis.peakDb < QUIET_DB) {
		check(`Quiet (loudest ${formatDb(analysis.peakDb)}): turn the gain up.`);
	}

	if (analysis.secondHitSeconds !== null && !target.pattern) {
		redo(`A second hit ${analysis.secondHitSeconds.toFixed(2)} s after the first.`);
	}

	if (target.pitched) {
		if (analysis.cents === null) {
			check('Couldn’t measure the pitch.');
		} else if (Math.abs(analysis.cents) > WRONG_NOTE_CENTS) {
			redo('That isn’t the note asked for: check the string and fret.');
		} else if (Math.abs(analysis.cents) > OUT_OF_TUNE_CENTS) {
			const cents = Math.round(Math.abs(analysis.cents));
			const which = analysis.cents > 0 ? 'sharp' : 'flat';
			const fix = target.fretted ? ', or fret with a lighter touch' : '';
			check(`${cents} cents ${which}: retune the ${target.stringName} string${fix}.`);
		}
		if (analysis.endingDb > CUT_OFF_DB) {
			check(
				target.endsAtNextHit
					? 'Still ringing when the next hit came: leave longer between them.'
					: 'Still ringing when the recording stopped: let it fade first.'
			);
		}
	}

	if (target.afterAnotherHit) {
		// What's before this hit is the last one ringing, not the room
	} else if (analysis.startedLate || analysis.noiseDb === null) {
		check('The hit comes right at the start: press R a moment before you play.');
	} else {
		const noiseDb = analysis.noiseDb - analysis.peakDb;
		if (
			analysis.beforeHitDb > noiseDb + BEFORE_HIT_ABOVE_NOISE_DB &&
			analysis.beforeHitDb > NOISE_DB
		) {
			check('Something before the hit (a squeak, a breath, the pick touching the string).');
		} else if (noiseDb > NOISE_DB) {
			check(
				'Noisy: the hiss is loud next to the hit (a quiet room, or more gain and a harder hit).'
			);
		}
	}

	const othersLoudness = middle(others.map((other) => other.peakDb));
	if (othersLoudness !== null) {
		const difference = analysis.peakDb - othersLoudness;
		if (Math.abs(difference) > LOUDNESS_SPREAD_DB) {
			check(
				`${Math.abs(difference).toFixed(1)} dB ${difference > 0 ? 'louder' : 'softer'} than its other takes.`
			);
		}
	}

	const othersBrightness = middle(others.map((other) => other.brightness));
	if (othersBrightness !== null && analysis.brightness !== null) {
		const ratio = analysis.brightness / othersBrightness - 1;
		if (Math.abs(ratio) > BRIGHTNESS_SPREAD) {
			check(`${ratio > 0 ? 'Brighter' : 'Duller'} than its other takes (pick angle or spot?).`);
		}
	}

	return problems;
}

/**
 * The median, or null when there's nothing to compare with.
 * @param {(number | null)[]} values
 */
function middle(values) {
	const known = /** @type {number[]} */ (
		values.filter((value) => value !== null && Number.isFinite(value))
	);
	if (known.length === 0) return null;
	known.sort((a, b) => a - b);
	const half = Math.floor(known.length / 2);
	return known.length % 2 ? known[half] : (known[half - 1] + known[half]) / 2;
}
