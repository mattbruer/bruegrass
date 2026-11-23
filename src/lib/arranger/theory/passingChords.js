/**
 * Chords for an approach note: a short note stepping into a target note
 * (noteRoles.js) can have a chord of its own, leading into the target's
 * chord. The Berklee text's ways (pp. 11–14, docs/theory/chord-scales.md):
 *
 * - dominant: the V7 of the target's chord (and its tritone substitute);
 * - chromatic / parallel: the target's chord moved by the melody's step,
 *   so every voice moves as the melody does;
 * - diatonic: the key's chord a step from the target's, every voice
 *   moving one step of the key;
 * - passing diminished (p. 23): a diminished 7th a half step below.
 *
 * Each one counts only when the approach note is one of its chord tones
 * or tensions, in its scale as chordScaleFor.js picks it, leading into the target.
 */
import { chordTypeOf, toneSemitones } from './chordTypes.js';
import { chordScaleFor } from './chordScaleFor.js';

const KEY_SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
const TRIADS = { '4,7': '', '3,7': 'm', '3,6': 'dim', '4,8': 'aug' };
const A_FIFTH_ABOVE = 7;

/**
 * @typedef {import('./chordScaleFor.js').PlainKey} PlainKey
 * @typedef {import('./chordScaleFor.js').PlainChord} PlainChord
 * @typedef {'dominant' | 'tritone sub' | 'chromatic' | 'parallel' | 'diatonic' | 'passing diminished'} Way
 * @typedef {{ chord: PlainChord, ways: Way[], role: 'tone' | 'tension' }} PassingChord
 *   role: what the approach note is in it
 */

/**
 * @param {PlainKey} key
 * @param {{ approach: number, target: number }} notes the approach note and the note it leads to (MIDI)
 * @param {PlainChord} targetChord the chord under the target note
 * @returns {PassingChord[]} each chord once, with every way that reaches it, the
 *   plainest first: the dominant, the key's own chords, then the jazzier ways
 */
export function passingChords(key, notes, targetChord) {
	/** @type {Map<string, PassingChord>} */
	const found = new Map();
	for (const [way, chord] of candidates(key, notes, targetChord)) {
		if (!chord || sameChord(chord, targetChord)) continue;
		const role = chordScaleFor(key, chord, targetChord).roles.get(
			mod12(notes.approach - chord.root)
		);
		if (role !== 'tone' && role !== 'tension') continue;
		const id = `${chord.root}${chord.type.suffix}`;
		const known = found.get(id);
		if (known) known.ways.push(way);
		else found.set(id, { chord, ways: [way], role });
	}
	return [...found.values()];
}

/**
 * Every chord the book's ways would put on the approach note.
 * @param {PlainKey} key
 * @param {{ approach: number, target: number }} notes
 * @param {PlainChord} target
 * @returns {[Way, PlainChord | null][]}
 */
function candidates(key, notes, target) {
	const step = notes.approach - notes.target;
	return [
		['dominant', chord(target.root + A_FIFTH_ABOVE, '7')],
		['dominant', chord(target.root + A_FIFTH_ABOVE, '')],
		['diatonic', diatonicNeighbour(key, target, Math.sign(step))],
		[
			Math.abs(step) === 1 ? 'chromatic' : 'parallel',
			{ root: mod12(target.root + step), type: target.type }
		],
		['passing diminished', chord(target.root - 1, 'dim7')],
		['tritone sub', chord(target.root + 1, '7')]
	];
}

/**
 * The key's triad one step up or down from the target's root.
 * @param {PlainKey} key
 * @param {PlainChord} target
 * @param {number} direction 1 up, -1 down
 * @returns {PlainChord | null}
 */
function diatonicNeighbour(key, target, direction) {
	const scale = KEY_SCALES[key.minor ? 'minor' : 'major'].map((step) => mod12(key.tonic + step));
	const at = scale.indexOf(mod12(target.root));
	if (at === -1 || direction === 0) return null;
	const degree = (at + direction + 7) % 7;
	const [root, third, fifth] = [0, 2, 4].map((up) => scale[(degree + up) % 7]);
	const suffix = TRIADS[/** @type {'4,7'} */ (`${mod12(third - root)},${mod12(fifth - root)}`)];
	return suffix === undefined ? null : chord(root, suffix);
}

/**
 * @param {number} root
 * @param {string} suffix
 * @returns {PlainChord | null}
 */
function chord(root, suffix) {
	const type = chordTypeOf(suffix);
	return type ? { root: mod12(root), type } : null;
}

/**
 * @param {PlainChord} a
 * @param {PlainChord} b
 */
function sameChord(a, b) {
	return a.root === b.root && toneSemitones(a.type).join() === toneSemitones(b.type).join();
}

/** @param {number} n */
const mod12 = (n) => ((n % 12) + 12) % 12;
