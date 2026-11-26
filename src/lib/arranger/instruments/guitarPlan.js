/**
 * What the guitar plays on each chord of the song, decided before anything
 * is timed: the shape the hand holds, the note each boom plays and the
 * strings each chuck strums, and any beat you've made a single picked note
 * instead (a run between chords: only ever yours), or a fill: notes you
 * write for the chord's last bars, played in place of the strum. Yours where you've
 * changed them (guitarEdits.js), else the band's: the chord book's shape, booms
 * alternating root and 5th (a new chord, or a new pass, starts on its
 * root), chucks on the strum strings. guitar.js times it all.
 */
import { chordShape } from './chordBook.js';
import { chordLabel, songKey } from '../chart/key.js';
import { movedNote } from './guitarPatterns.js';
import { STRUM_STRINGS, bassNoteIn } from './guitar.js';
import { editedGuitar } from './guitarEdits.js';
import { slurOf } from './slurs.js';
import { placesInSlots, rhythm } from '../chart/timeline.js';
import { hitAt, hitSpans } from '../chart/hits.js';
import { fillRoom, fillSpan } from './guitarFill.js';

/**
 * @typedef {import('./guitarEdits.js').Shape} Shape
 * @typedef {{ string: number, fret: number }} Boom frets without the capo
 * @typedef {Boom & { yours: boolean }} PlannedBoom a chord's boom: yours (you picked its note) or the band's
 * @typedef {{ at: number, role: 'boom' | 'chuck', place: number, beatInBar: number, note: Boom | null, accent: boolean, strum: { strings: number[], end: 'chuck' | 'ring' | 'choke' } | null, slur: import('./slurs.js').Slur | null }} ChordBeat
 *   at: quarters after the chord starts; role: what the band plays there; place: which boom
 *   (or chuck) of the chord it is; beatInBar: from 0; note: the one note you play there instead
 *   (part of a run), null: the band's boom or chuck; accent: you made this beat louder; strum: a strum of yours here instead (guitarEdits.js StrumEdit, on the shape's strings); slur: the slur you gave it (slurs.js)
 * @typedef {{
 *   start: number, editAt: number, length: number, bar: number, name: string, shapeName: string,
 *   shape: Shape, booms: PlannedBoom[], chucks: number[][], beats: ChordBeat[],
 *   yours: { shape: boolean, booms: boolean, chucks: boolean, notes: boolean, accents: boolean, slurs: boolean, strums: boolean, fill: boolean },
 *   edited: boolean, fill: import('./guitarFill.js').FillSpan | null, meter: import('../chart/timeline.js').Meter, room: number
 * }} GuitarChord
 *   start, length: where it is in the song (quarters from bar 1); editAt: where its changes are kept
 *   (its own start, or in a part played again with `as`, the start of the same chord in the part it repeats); bar: its bar, from 1;
 *   name: as written (what your changes are tied to); shapeName: the chord the hand holds, with the Key and capo; chucks: the strings each chuck strums, low first;
 *   yours: which parts you've changed; fill: your fill on this chord's last bars, or null; room: how many bars of fill can start at its bar
 */

/**
 * @param {import('../chart/timeline.js').Section[]} sections
 * @param {{ edits?: import('./guitarEdits.js').GuitarEdits, offset?: number, style?: string, shift?: number }} [options]
 *   edits: what you've changed; offset: where these sections start in the song (quarters); style: the song's (styles/styles.js);
 *   shift: semitones from the chart's chords to the shapes the hand holds (the Key setting less the capo): the shapes,
 *   booms and picked notes follow it, your changes staying tied to the chord as written
 * @returns {GuitarChord[]}
 */
export function guitarChords(sections, { edits = {}, offset = 0, style, shift = 0 } = {}) {
	const { beats, slots, quarters } = rhythm(sections);
	const key = songKey(sections);
	const places = placesInSlots(beats);
	const which = bandBooms(beats, slots, hitSpans(sections));
	return slots.map((slot, k) => {
		const start = slot.start + offset;
		const editAt = slot.home ?? start;
		const change = editedGuitar(edits, editAt, slot.name);
		const shapeName = chordLabel(slot.name, { key: slot.key ?? key, shift, mode: 'concert' });
		// Your shape and notes were made at some shift; at another the shape is the book's, the notes moved
		const moved = shift - (change.madeAt ?? 0);
		const shape = (moved === 0 ? change.shape : undefined) ?? chordShape(shapeName, style);
		const own = beats
			.flatMap((beat, b) => (beat.slot === k ? [{ beat, place: places[b] }] : []))
			.map(({ beat, place }, i) => ({
				at: beat.time - slot.start,
				role: beat.role,
				place,
				beatInBar: beat.beatInBar,
				note: change.notes?.[i] ? movedNote(change.notes[i], moved) : null,
				accent: change.accents?.[i] ?? false
			}));
		const booms = own
			.filter((beat) => beat.role === 'boom')
			.map((beat) => {
				const picked = change.booms?.[beat.place];
				if (picked) return { ...movedNote(picked, moved), yours: true };
				const rootOrFifth = which.get(start - offset + beat.at) ?? 'root';
				return { ...bandBoom(shape, shapeName, rootOrFifth), yours: false };
			});
		const played = own.map((beat, i) => ({
			...beat,
			strum: strumOn(change.strums?.[i], shape),
			slur: slurOf(change.slurs?.[i], shape, beat.role === 'boom' ? booms[beat.place] : null)
		}));
		const chucks = own
			.filter((beat) => beat.role === 'chuck')
			.map((beat) =>
				(change.chucks?.[beat.place] ?? STRUM_STRINGS).filter((string) => shape[string] !== null)
			);
		const room = fillRoom(slot.barStart, slot.meter, quarters);
		const yours = {
			shape: !!change.shape,
			booms: booms.some((boom) => boom.yours),
			chucks: !!change.chucks,
			notes: played.some((beat) => beat.note !== null),
			accents: played.some((beat) => beat.accent),
			slurs: !!change.slurs?.some(Boolean),
			strums: !!change.strums?.some(Boolean),
			fill: !!change.fill
		};
		return {
			start,
			editAt,
			length: slot.length,
			bar: slot.bar + 1,
			name: slot.name,
			shapeName,
			shape,
			booms,
			chucks,
			beats: played,
			yours,
			edited: Object.values(yours).some(Boolean),
			fill: fillSpan(change.fill, {
				barStart: slot.barStart + offset,
				meter: slot.meter,
				room,
				shift
			}),
			meter: slot.meter,
			room
		};
	});
}

/**
 * A strum of yours on a beat, on the strings the shape plays.
 * @param {import('./guitarEdits.js').StrumEdit | null | undefined} edit
 * @param {Shape} shape
 */
function strumOn(edit, shape) {
	return edit
		? { end: edit.end, strings: edit.strings.filter((string) => shape[string] !== null) }
		: null;
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
