/**
 * The pilot: one G chord, recorded to find out how the sampler should
 * sound before recording the full guitar set (HANDOFF-sampler-pilot.md).
 * Each attempt records this list; later attempts add one detail at a time.
 *
 * Built from the voicing, not from fixed strings and frets: a second
 * voicing (C, then D7) is another file like this with its own shape.
 * Groups are named by articulation, what the pick physically does, so
 * any style can reuse the clips:
 * - graze: the pick brushes the string inside a strum. Firm and light are
 *   both recorded, because a light graze is a different contact, not a
 *   quieter one.
 * - pluck: the pick grabs the string (bass notes and melody notes).
 * - dead strum: every string muted, just the pick's sweep.
 * - real strum: the whole chord, never used as samples; the A/B target.
 */
import { STANDARD_TUNING } from './guitar.js';
import { voicingNotes } from './voicing.js';

/** G with no third (low E 3, A muted, D and G open, B 3, high e 3). */
const G_VOICING = [3, null, 0, 0, 3, 3];

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
			layers: [
				{ intensity: 'firm', takes: 2 },
				{ intensity: 'light', takes: 2 }
			]
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
			name: 'Real G strums (to compare against)',
			how: 'Strum the G shape as you would in a song, top strings as usual. These are only for comparing, never played as samples.',
			pitched: false,
			directions: ['down', 'up'],
			layers: [
				{ intensity: 'firm', takes: 3 },
				{ intensity: 'light', takes: 3 }
			]
		}
	]
};
