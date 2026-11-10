/**
 * How the band's own bass line plays (bassline.js), as plain data. A new
 * style is one entry; a new knob is one field here plus where bassline.js
 * reads it. Settings → General picks one (settings.bassStyle).
 *
 * Knobs:
 *   leadInChance: how often a chord change gets a walk or approach into it
 *     (0 = never: plain root and fifth); a repeated section is also made to
 *     differ from its last pass only when there are lead-ins to vary
 *   fillUnderTune: walk in quarters under the tune's long notes (bassFills.js)
 */

/** @typedef {{ name: string, description: string, leadInChance: number, fillUnderTune: boolean }} BassStyle */

/** @type {Record<string, BassStyle>} */
export const BASS_STYLES = {
	rootFifth: {
		name: 'Root and fifth',
		description: 'Root on the downbeat, fifth on the next boom.',
		leadInChance: 0,
		fillUnderTune: false
	},
	active: {
		name: 'Active',
		description: 'Root and fifth, with walks into chord changes and under long tune notes.',
		leadInChance: 0.65,
		fillUnderTune: true
	}
};

export const DEFAULT_BASS_STYLE = 'rootFifth';

/** @param {string} id */
export function bassStyle(id) {
	return BASS_STYLES[id] ?? BASS_STYLES[DEFAULT_BASS_STYLE];
}
