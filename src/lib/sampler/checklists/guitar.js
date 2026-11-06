/**
 * What to record for the guitar: the checklist the session walks through.
 * Plain data, so changing the plan (another fret, more takes, a new group)
 * is an edit here, and the mandolin or banjo is a new file like this one.
 *
 * The plan behind these numbers (HANDOFF-sampling-session.md):
 * - Frets 0, 2, 5, 8 and 11: each fretted recording covers the frets either
 *   side by repitching ±1 semitone, and open strings get their own.
 * - Record hard, derive soft; one real soft layer to check that against.
 * - A few real takes per note (round robin), varied further in code.
 * - Dead strums (all strings muted) for the chuck's pick sweep.
 * - Down-strokes only: up-strokes are derived (reverse order, lighter).
 */

/**
 * @typedef {{ id: string, name: string, midi: number }} InstrumentString
 *   midi: the open string's pitch (scientific numbering: 60 = middle C)
 * @typedef {{ intensity: string, takes: number }} Layer
 * @typedef {{
 *   id: string,
 *   name: string,
 *   how: string,
 *   pitched: boolean,
 *   strings?: string[],
 *   frets?: number[],
 *   directions?: string[],
 *   layers: Layer[]
 * }} TargetGroup
 *   pitched: single notes (checked against their pitch); otherwise a
 *   strum across strings (directions instead of strings and frets)
 * @typedef {{ id: string, name: string, strings: InstrumentString[], groups: TargetGroup[] }} Checklist
 */

/** The frets recorded on every string. */
const RECORDED_FRETS = [0, 2, 5, 8, 11];

/** @type {Checklist} */
export const GUITAR = {
	id: 'guitar',
	name: 'Guitar',
	// Standard tuning, low to high (ids match the sample files: E, A, D, G, B, ee)
	strings: [
		{ id: 'E', name: 'Low E', midi: 40 },
		{ id: 'A', name: 'A', midi: 45 },
		{ id: 'D', name: 'D', midi: 50 },
		{ id: 'G', name: 'G', midi: 55 },
		{ id: 'B', name: 'B', midi: 59 },
		{ id: 'ee', name: 'High e', midi: 64 }
	],
	groups: [
		{
			id: 'note',
			name: 'Strum notes',
			how: 'One string, a flatpick down-stroke as it sounds inside a strum. Let it ring until it fades.',
			pitched: true,
			strings: ['E', 'A', 'D', 'G', 'B', 'ee'],
			frets: RECORDED_FRETS,
			layers: [
				{ intensity: 'hard', takes: 3 },
				{ intensity: 'soft', takes: 1 }
			]
		},
		{
			id: 'boom',
			name: 'Bass notes',
			how: 'The boom: a firm, deliberate bass note with the flatpick, as on beats 1 and 3. Let it ring.',
			pitched: true,
			strings: ['E', 'A', 'D'],
			frets: RECORDED_FRETS,
			layers: [{ intensity: 'hard', takes: 3 }]
		},
		{
			id: 'dead',
			name: 'Dead strums',
			how: 'Mute every string with your fretting hand and strum across all six: just the “chk”.',
			pitched: false,
			directions: ['down', 'up'],
			layers: [
				{ intensity: 'hard', takes: 7 },
				{ intensity: 'medium', takes: 7 },
				{ intensity: 'soft', takes: 7 }
			]
		}
	]
};
