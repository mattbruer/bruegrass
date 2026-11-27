/**
 * The harmony parts a bluegrass group sings around the lead (the melody,
 * or any lane you wrote), at most four (and a bass singer on roots). Each
 * counts chord tones away from the lead: the tenor sings the next chord
 * tone up, the baritone the next one down. With three chord tones, two up
 * is the baritone an octave higher (high baritone) and two down is the
 * tenor an octave lower (low tenor). A new part is one entry. A generated
 * line sings one of these (generatedParts.js).
 *
 * id: kept in a generated line's V: line (`sings=tenor`), so it must stay
 * the same once songs use it; also its instrument's default
 * (instruments/tuneInstruments.js). name: in the buttons, by where the line
 * sits (the user's call: "the line above / below", not the singers' tenor
 * and baritone). singsRoots: the part sings the chord's root under the lead
 * instead of counting chord tones.
 */
export const HARMONY_PARTS = Object.freeze([
	{ id: 'tenor', name: 'Above', chordTones: 1 },
	{ id: 'high-baritone', name: 'Above 2', chordTones: 2 },
	{ id: 'baritone', name: 'Below', chordTones: -1 },
	{ id: 'low-tenor', name: 'Below 2', chordTones: -2 },
	// The bass singer: the chord's root under the lead, whatever the lead does
	{ id: 'roots', name: 'Roots below', chordTones: 0, singsRoots: true }
]);

/**
 * The usual ways to harmonise a line, one tap each (the parts they use):
 * bluegrass sings the lead in the middle, a line above it with two parts, a
 * line above and one below with three; or the lead on top with the lines
 * below filling out the chord.
 */
export const HARMONY_LAYOUTS = Object.freeze([
	{ id: 'two', name: '2 parts', parts: ['tenor'] },
	{ id: 'three', name: '3 parts', parts: ['tenor', 'baritone'] },
	{ id: 'top', name: 'Lead on top', parts: ['baritone', 'low-tenor'] }
]);

/** @typedef {(typeof HARMONY_PARTS)[number]} HarmonyPart */

/**
 * A generated line's own name: its lead's and where it sits ("Fiddle above").
 * @param {string} leadName
 * @param {string} sings a harmony part's id
 */
export function generatedName(leadName, sings) {
	const part = HARMONY_PARTS.find((each) => each.id === sings);
	return part ? `${leadName} ${part.name.toLowerCase()}` : leadName;
}
