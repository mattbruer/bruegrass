/**
 * The harmony parts a bluegrass group sings around the lead (the melody),
 * at most four (and a bass singer on roots). Each counts chord tones away from the lead: the tenor sings
 * the next chord tone up, the baritone the next one down. With three chord
 * tones, two up is the baritone an octave higher (high baritone) and two
 * down is the tenor an octave lower (low tenor). A new part is one entry.
 *
 * id: the part's ABC voice (V:tenor), so it must stay the same once songs use it.
 * name: in the buttons and mixer, by where the line sits (the user's call:
 * "the line above / below", not the singers' tenor and baritone).
 * label: short, written on the sheet music (a long one widens the staff).
 * It's also how a voice finds its mixer channel (partChannels.js), so
 * changing it moves songs' existing parts onto the Melody channel.
 * singsRoots: the part sings the chord's root under the melody instead of counting chord tones.
 */
export const HARMONY_PARTS = Object.freeze([
	{ id: 'tenor', name: 'Above', label: 'Ten.', chordTones: 1 },
	{ id: 'high-baritone', name: 'Above 2', label: 'Hi Bar.', chordTones: 2 },
	{ id: 'baritone', name: 'Below', label: 'Bar.', chordTones: -1 },
	{ id: 'low-tenor', name: 'Below 2', label: 'Low Ten.', chordTones: -2 },
	// The bass singer: the chord's root under the melody, whatever the melody does
	{ id: 'roots', name: 'Roots below', label: 'Roots', chordTones: 0, singsRoots: true }
]);

/**
 * The usual ways to harmonise a melody, one tap each (the parts they use):
 * bluegrass sings the melody in the middle, a line above it with two
 * parts, a line above and one below with three; a jazz soli puts the
 * melody on top with the lines below filling out the chord.
 */
export const HARMONY_LAYOUTS = Object.freeze([
	{ id: 'two', name: '2 parts', parts: ['tenor'] },
	{ id: 'three', name: '3 parts', parts: ['tenor', 'baritone'] },
	{ id: 'top', name: 'Melody on top', parts: ['baritone', 'low-tenor'] }
]);

/** @typedef {(typeof HARMONY_PARTS)[number]} HarmonyPart */
