/**
 * The pilot: one G chord, recorded to find out how the sampler should
 * sound before recording the full guitar set (HANDOFF-sampler-pilot.md).
 * Each attempt records this list; later attempts add one detail at a time.
 *
 * Built from the voicing, not from fixed strings and frets: a second
 * voicing (C, then D7) is another file like this with its own shape.
 * Groups are named by articulation, what the pick physically does, so
 * any style can reuse the clips:
 * - graze: the pick brushes the string inside a strum. Several passes at
 *   your normal strum; the best four are picked by ear later, and their
 *   measured loudness sorts them into a touch louder and a touch lighter.
 * - pluck: the pick grabs the string (bass notes and melody notes).
 * - dead strum: every string muted, just the pick's sweep.
 * - real strum: the boom-chuck played for real to a click, at the tempo
 *   the sampler's loop plays, so you can switch between them in time.
 *   Never used as samples; it's the A/B target.
 */
import { STANDARD_TUNING } from './guitar.js';
import { voicingNotes } from './voicing.js';

/** G with no third (low E 3, A muted, D and G open, B 3, high e 3). */
const G_VOICING = [3, null, 0, 0, 3, 3];

/** The tempo the real strums are played at, and the loop will be compared at. */
const REFERENCE_TEMPO = 100;

/** Grazes recorded per string, to choose the best from by ear. */
const GRAZE_PASSES = 6;

/** @type {import('./guitar.js').Checklist} */
export const GUITAR_PILOT = {
	id: 'guitar-pilot-g',
	name: 'Guitar pilot',
	strings: STANDARD_TUNING,
	groups: [
		{
			id: 'graze',
			name: 'Grazed notes',
			how: 'Fret the G shape and mute every string but this one, then strum down across the strings as in a real strum. Let it ring.',
			pitched: true,
			notes: voicingNotes(G_VOICING, STANDARD_TUNING, ['D', 'G', 'B', 'ee']),
			layers: [{ intensity: 'normal', takes: GRAZE_PASSES }]
		},
		{
			id: 'pluck',
			name: 'Plucked notes',
			how: 'The boom: the pick grabs one string firmly, as on beats 1 and 3. Let it ring.',
			pitched: true,
			notes: voicingNotes(G_VOICING, STANDARD_TUNING, ['E', 'D']),
			layers: [{ intensity: 'firm', takes: 3 }]
		},
		{
			id: 'dead-strum',
			name: 'Dead strums',
			how: 'Mute every string with your fretting hand and strum across all six: just the “chk”.',
			pitched: false,
			directions: ['down', 'up'],
			layers: [
				{ intensity: 'firm', takes: 3 },
				{ intensity: 'medium', takes: 3 },
				{ intensity: 'light', takes: 3 }
			]
		},
		{
			id: 'real-strum',
			name: 'Real boom-chuck (to compare against)',
			how: 'Play the G boom-chuck as you would in a song, in time with the click (wear headphones so the mic doesn’t hear it). Start on the first beat after the count-in, and stop recording when the click stops. Only for comparing, never played as samples.',
			pitched: false,
			directions: ['boom-chuck'],
			click: { tempo: REFERENCE_TEMPO, beatsPerBar: 4, countInBars: 1, bars: 8 },
			layers: [{ intensity: 'normal', takes: 3 }]
		}
	]
};
