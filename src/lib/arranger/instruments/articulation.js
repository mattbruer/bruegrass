/**
 * How the pick meets a string. A single note is plucked: the pick grabs
 * the string. A strum grazes: the pick brushes across, so every strummed
 * note is quieter, darker and softer at the start than a plucked one.
 *
 * With one set of plucked samples a graze is faked from them: quieter,
 * darker (a low-pass filter), the pick's click skipped (the sample starts
 * a little in) and a short fade-in. When graze samples are recorded, a
 * graze picks those instead, and this stays the one place that says so.
 *
 * @typedef {{ levelDb: number, brightness: number, skip: number, attack: number }} Articulation
 *   levelDb: against a pluck; brightness: low-pass cutoff in Hz; skip:
 *   seconds of the sample's start left out; attack: seconds of fade-in
 * @typedef {'pluck' | 'graze'} ArticulationId
 */

/** @type {Record<ArticulationId, Articulation>} */
export const ARTICULATIONS = {
	pluck: { levelDb: 0, brightness: 16000, skip: 0, attack: 0 },
	graze: { levelDb: -4, brightness: 5000, skip: 0.006, attack: 0.004 }
};
