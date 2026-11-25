/**
 * What the guitar plays on each chord of the song, decided before anything
 * is timed: the shape the hand holds, the note each boom plays and the
 * strings each chuck strums, and any beat you've made a single picked note
 * instead (a run between chords: only ever yours), or a fill: the chord
 * left to a part you write, the guitar resting. Yours where you've
 * changed them (guitarEdits.js), else the band's: the chord book's shape, booms
 * alternating root and 5th (a new chord, or a new pass, starts on its
 * root), chucks on the strum strings. guitar.js times it all.
 */
import { chordShape } from './chordBook.js';
import { STRUM_STRINGS, bassNoteIn } from './guitar.js';
import { editedGuitar } from './guitarEdits.js';
import { placesInSlots, rhythm } from '../chart/timeline.js';
import { hitAt, hitSpans } from '../chart/hits.js';

/**
 * @typedef {import('./guitarEdits.js').Shape} Shape
 * @typedef {{ string: number, fret: number }} Boom frets without the capo
 * @typedef {{ at: number, role: 'boom' | 'chuck', place: number, beatInBar: number, note: Boom | null, accent: boolean }} ChordBeat
 *   at: quarters after the chord starts; role: what the band plays there; place: which boom
 *   (or chuck) of the chord it is; beatInBar: from 0; note: the one note you play there instead
 *   (part of a run), null: the band's boom or chuck; accent: you made this beat louder
 * @typedef {{
 *   start: number, length: number, bar: number, name: string,
 *   shape: Shape, booms: Boom[], chucks: number[][], beats: ChordBeat[],
 *   yours: { shape: boolean, booms: boolean, chucks: boolean, notes: boolean, accents: boolean, fill: boolean },
 *   edited: boolean, fill: string | null
 * }} GuitarChord
 *   start, length: where it is in the song (quarters from bar 1); bar: its bar, from 1;
 *   name: as written; chucks: the strings each chuck strums, low first;
 *   yours: which parts you've changed; fill: the part playing a fill here (the guitar rests), or null
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ edits?: import('./guitarEdits.js').GuitarEdits, offset?: number, style?: string }} [options]
 *   edits: what you've changed; offset: where these sections start in the song (quarters); style: the song's (styles/styles.js)
 * @returns {GuitarChord[]}
 */
export function guitarChords(sections, { edits = {}, offset = 0, style } = {}) {
	const { beats, slots } = rhythm(sections);
	const places = placesInSlots(beats);
	const which = bandBooms(beats, slots, hitSpans(sections));
	return slots.map((slot, k) => {
		const start = slot.start + offset;
		const change = editedGuitar(edits, start, slot.name);
		const shape = change.shape ?? chordShape(slot.name, style);
		const own = beats
			.flatMap((beat, b) => (beat.slot === k ? [{ beat, place: places[b] }] : []))
			.map(({ beat, place }, i) => ({
				at: beat.time - slot.start,
				role: beat.role,
				place,
				beatInBar: beat.beatInBar,
				note: change.notes?.[i] ?? null,
				accent: change.accents?.[i] ?? false
			}));
		const booms = own
			.filter((beat) => beat.role === 'boom')
			.map(
				(beat) =>
					boomOn(change.booms?.[beat.place], shape) ??
					bandBoom(shape, slot.name, which.get(start - offset + beat.at) ?? 'root')
			);
		const chucks = own
			.filter((beat) => beat.role === 'chuck')
			.map((beat) =>
				(change.chucks?.[beat.place] ?? STRUM_STRINGS).filter((string) => shape[string] !== null)
			);
		const yours = {
			shape: !!change.shape,
			booms: !!change.booms,
			chucks: !!change.chucks,
			notes: own.some((beat) => beat.note !== null),
			accents: own.some((beat) => beat.accent),
			fill: !!change.fill
		};
		return {
			start,
			length: slot.length,
			bar: slot.bar + 1,
			name: slot.name,
			shape,
			booms,
			chucks,
			beats: own,
			yours,
			edited: Object.values(yours).some(Boolean),
			fill: change.fill ?? null
		};
	});
}

/**
 * Root or 5th for each boom the band plays, by when it falls (quarters):
 * the same chord alternates, a new one starts on its root. No boom under a
 * hit (it strikes the chord instead), and it doesn't count.
 * @param {import('../chart/timeline.js').Beat[]} beats
 * @param {import('../chart/timeline.js').SlotPosition[]} slots
 * @param {ReturnType<typeof hitSpans>} hits
 * @returns {Map<number, 'root' | 'fifth'>}
 */
function bandBooms(beats, slots, hits) {
	const which = new Map();
	let last = null;
	let repeat = 0;
	for (const beat of beats) {
		if (beat.role !== 'boom' || hitAt(beat.time, hits)) continue;
		const chord = slots[beat.slot].name;
		repeat = last === chord ? repeat + 1 : 0;
		last = chord;
		which.set(beat.time, repeat % 2 === 0 ? 'root' : 'fifth');
	}
	return which;
}

/**
 * A boom on a string you picked, if the shape frets it.
 * @param {number | undefined} string
 * @param {Shape} shape
 * @returns {Boom | null}
 */
function boomOn(string, shape) {
	if (string === undefined) return null;
	const fret = shape[string];
	return fret === null || fret === undefined ? null : { string, fret };
}

/**
 * The band's boom in this shape: the root or 5th (a slash chord's bass for
 * its root), else the root, else the lowest string the shape plays.
 * @param {Shape} shape
 * @param {string} name
 * @param {'root' | 'fifth'} which
 * @returns {Boom}
 */
function bandBoom(shape, name, which) {
	for (const each of [which, 'root']) {
		try {
			return bassNoteIn(shape, name, /** @type {'root' | 'fifth'} */ (each));
		} catch {
			// this shape doesn't hold it: try the next
		}
	}
	const string = shape.findIndex((fret) => fret !== null);
	return { string, fret: /** @type {number} */ (shape[string]) };
}
