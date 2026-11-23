/**
 * The harmony parts a bluegrass group sings around the lead (the melody),
 * at most four. Each counts chord tones away from the lead: the tenor sings
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
 */
export const HARMONY_PARTS = Object.freeze([
	{ id: 'tenor', name: 'Above', label: 'Ten.', chordTones: 1 },
	{ id: 'high-baritone', name: 'Above 2', label: 'Hi Bar.', chordTones: 2 },
	{ id: 'baritone', name: 'Below', label: 'Bar.', chordTones: -1 },
	{ id: 'low-tenor', name: 'Below 2', label: 'Low Ten.', chordTones: -2 }
]);

/** @typedef {(typeof HARMONY_PARTS)[number]} HarmonyPart */
