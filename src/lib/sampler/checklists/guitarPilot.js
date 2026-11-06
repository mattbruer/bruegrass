/**
 * The pilot: one G chord, recorded to find out how the sampler should
 * sound before recording the full guitar set (HANDOFF-sampler-pilot.md).
 * Each attempt records this list; later attempts add one detail at a time.
 *
 * Built from the voicing, not from fixed strings and frets: a second
 * voicing (C, then D7) is another file like this with its own shape.
 * Groups are named by articulation, what the pick physically does, so
 * any style can reuse the clips:
 * - graze: the pick brushes the string inside a strum.
 * - pluck: the pick grabs the string (bass notes and melody notes).
 * - dead strum: every string muted, just the pick's sweep.
 * - real strum: the boom-chuck played for real, the A/B target; never
 *   used as samples.
 *
 * Everything is played in motion to a click, as in a song: tempo sets how
 * fast the hand crosses the strings, and posed single strokes don't sound
 * like playing. Play as many as you like per recording and keep the best.
 * Grazes are recorded at a slow and a fast tempo, because the faster the
 * hand, the less the pick bites the string: the pilot tests whether that
 * can be faked from one tempo, or needs recording.
 */
import { STANDARD_TUNING } from './guitar.js';
import { voicingNotes } from './voicing.js';

/** G with no third (low E 3, A muted, D and G open, B 3, high e 3). */
const G_VOICING = [3, null, 0, 0, 3, 3];

/** The tempo the real strums are played at, and the loop will be compared at. */
const REFERENCE_TEMPO = 100;

/** The two tempos grazes are recorded at, for the bite test. */
const SLOW_TEMPO = 80;
const FAST_TEMPO = 140;

/** Grazes kept per string and tempo: two a touch louder, two a touch lighter. */
const GRAZES_KEPT = 4;

/** A count-in bar, then eight to play in. */
const CLICK = { tempo: REFERENCE_TEMPO, beatsPerBar: 4, countInBars: 1, bars: 8 };

/** @type {import('./guitar.js').Checklist} */
export const GUITAR_PILOT = {
	id: 'guitar-pilot-g',
	name: 'Guitar pilot',
	strings: STANDARD_TUNING,
	groups: [
		{
			id: 'graze',
			name: 'Grazed notes',
			how: 'Fret the G shape and mute every string but this one. Strum the chuck on beats 2 and 4, as in a song, now and then letting one ring for a bar.',
			pitched: true,
			notes: voicingNotes(G_VOICING, STANDARD_TUNING, ['D', 'G', 'B', 'ee']),
			click: CLICK,
			layers: [
				{ intensity: 'normal', tempo: SLOW_TEMPO, takes: GRAZES_KEPT },
				{ intensity: 'normal', tempo: FAST_TEMPO, takes: GRAZES_KEPT }
			]
		},
		{
			id: 'pluck',
			name: 'Plucked notes',
			how: 'The boom: the pick grabs this one string firmly on beats 1 and 3, as in a song. Let some ring.',
			pitched: true,
			notes: voicingNotes(G_VOICING, STANDARD_TUNING, ['E', 'D']),
			click: CLICK,
			layers: [{ intensity: 'firm', takes: 3 }]
		},
		{
			id: 'dead-strum',
			name: 'Dead strums',
			how: 'Mute every string with your fretting hand and strum across all six in that direction on the beat: just the “chk”.',
			pitched: false,
			directions: ['down', 'up'],
			click: CLICK,
			layers: [
				{ intensity: 'firm', takes: 3 },
				{ intensity: 'medium', takes: 3 },
				{ intensity: 'light', takes: 3 }
			]
		},
		{
			id: 'real-strum',
			name: 'Real boom-chuck (to compare against)',
			how: 'Play the G boom-chuck as you would in a song, in time with the click. Start on the first beat after the count-in, and stop recording when the click stops. Only for comparing, never played as samples.',
			pitched: false,
			directions: ['boom-chuck'],
			pattern: true,
			click: CLICK,
			layers: [{ intensity: 'normal', takes: 3 }]
		}
	]
};
