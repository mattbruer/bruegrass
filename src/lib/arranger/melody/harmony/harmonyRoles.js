/**
 * What each melody note is doing against the band's chords
 * (theory/noteRoles.js), for the harmony parts: a style can voice an
 * approach note with a passing chord of its own (theory/passingChords.js),
 * an anticipation with the chord it reaches early, and hold its note
 * through a suspension. The band's chords stay as the chart writes them.
 */
import { noteRoles } from '../../theory/noteRoles.js';
import { passingChords } from '../../theory/passingChords.js';
import { chordPitchClasses, readChordName, toneSemitones } from '../../theory/chordTypes.js';
import { beatGroups, barQuarters } from '../../chart/timeline.js';

/** How each number of semitones above the tonic is spelled as a step of the key. */
const STEPS_ABOVE_TONIC = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/**
 * @typedef {import('../../theory/musicInKey.js').Chord} Chord
 * @typedef {import('../../theory/noteRoles.js').Role} Role
 * @typedef {{ role: Role, roleChord: Chord | null, strong: boolean }} HarmonyRole
 *   roleChord: the chord the note belongs to by its role (a passing chord for
 *   an approach note, the next chord for an anticipation); null: the band's;
 *   strong: on a strong beat (where the bass plays)
 * @typedef {{ startChar: number, time: number, length: number, pitch: number }} LeadNote
 */

/**
 * @param {LeadNote[]} notes the melody, in time order, as written
 * @param {(time: number) => string | null} chordAt the band's concert chord
 * @param {{ num: number, den: number }} meter
 * @param {import('../../theory/musicInKey.js').Key} key
 * @returns {Map<number, HarmonyRole>} by the note's place in the ABC
 */
export function harmonyRoles(notes, chordAt, meter, key) {
	const plainKey = { tonic: key.pc, minor: false };
	const roled = noteRoles(notes, band(notes, chordAt, meter));
	/** @type {Map<number, HarmonyRole>} */
	const roles = new Map();
	roled.forEach((note, i) => {
		const next = roled[i + 1];
		let roleChord = null;
		if (note.role === 'anticipation') roleChord = chordIn(key, readChord(chordAt(note.chordTime)));
		if (note.role === 'approach' && next) {
			const target = readChord(chordAt(next.time));
			const passing =
				target && passingChords(plainKey, { approach: note.pitch, target: next.pitch }, target)[0];
			roleChord = passing ? chordIn(key, passing.chord) : null;
		}
		roles.set(notes[i].startChar, { role: note.role, roleChord, strong: note.onBoom });
	});
	return roles;
}

/**
 * The band as noteRoles reads it, from the chords at each beat.
 * @param {LeadNote[]} notes
 * @param {(time: number) => string | null} chordAt
 * @param {{ num: number, den: number }} meter
 * @returns {import('../../theory/noteRoles.js').Band}
 */
function band(notes, chordAt, meter) {
	const bar = barQuarters({ beats: meter.num, unit: meter.den });
	const booms = [];
	let at = 0;
	for (const group of beatGroups(bar)) {
		booms.push(at);
		at += group;
	}
	const first = Math.floor(notes[0]?.time ?? 0);
	const last = Math.ceil(notes.at(-1) ? notes.at(-1).time + notes.at(-1).length : 0);
	const changes = [];
	for (let time = first; time <= last; time++) {
		if (chordAt(time) !== chordAt(time - 1)) changes.push(time);
	}
	return {
		isBoom: (time) => booms.includes(((time % bar) + bar) % bar),
		changes,
		tonesAt: (time) => {
			const chord = readChord(chordAt(time));
			return chord ? chordPitchClasses(chord) : [];
		}
	};
}

/** @param {string | null} name a concert chord, maybe with a slash bass */
function readChord(name) {
	return name ? readChordName(name.split('/')[0]) : null;
}

/**
 * A chord as the harmony parts read it: its root as a step of the key and
 * one of the four qualities they count (theory/musicInKey.js).
 * @param {import('../../theory/musicInKey.js').Key} key
 * @param {{ root: number, type: import('../../theory/chordTypes.js').ChordType } | null} chord
 * @returns {Chord | null}
 */
function chordIn(key, chord) {
	if (!chord) return null;
	const above = (chord.root - key.pc + 12) % 12;
	const step = STEPS_ABOVE_TONIC[above];
	const tones = toneSemitones(chord.type);
	const quality =
		tones.includes(6) && tones.includes(3)
			? 'dim'
			: tones.includes(3)
				? 'm'
				: tones.includes(10)
					? '7'
					: '';
	return { root: { step, alt: above - MAJOR_SCALE[step] }, quality, bass: null };
}
