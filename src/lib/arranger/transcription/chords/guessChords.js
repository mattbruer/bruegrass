/**
 * A first guess at each bar's chords from the recording, for you to fix
 * by ear, heard the way bluegrass is played: each beat group (beats 1–2
 * and 3–4 in 4/4, the whole bar in 3/4; the band's own groups) is a boom
 * and its chops. On the boom the bass plays the chord's root or its fifth;
 * on the chops the guitar and mandolin strum the whole chord. So the chops
 * (above the bass) say which chord it is and whether it's minor, and the
 * boom's bass note backs up its root. Inside a bar, the chord carrying on
 * is expected on its root or its fifth, but a new chord arrives on its
 * root, so the walk to the fifth doesn't read as a change. Bluegrass
 * isn't chordy: a chord mostly lasts a bar or more and rarely changes
 * halfway, so a change mid-bar must win by a lot, and a new bar keeps the
 * chord before unless another one wins. The one common quick change,
 * | I V | I | (up a fifth for half a bar, then straight back), is let in
 * more easily, and its V is major. When you've said the key, the chords
 * bluegrass plays in it are favoured (theory/bluegrassChords.js).
 */
import { beatGroups } from '../../chart/timeline.js';
import { BASS_HEARING, STRUM_HEARING, createNoteMeter } from './notesSounding.js';
import { mixDown } from '../beats/analyseReference.js';
import { secondsAtBeat } from '../tempoMap.js';
import { unlikelyInKey } from '../../theory/bluegrassChords.js';

/**
 * The chords a guess can be, as plain data: add a quality here (a 7th, say)
 * to guess it. Minor is held back: bluegrass is mostly major, and a sung
 * or fiddled blue third would otherwise read as a minor chord.
 */
const QUALITIES = [
	{ suffix: '', notes: [0, 4, 7] },
	{ suffix: 'm', notes: [0, 3, 7], penalty: 0.1 }
];
const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const A_FIFTH = 7;

/** How much the bass on a chord's root counts, against the chops' notes being its notes. */
const BASS_WEIGHT = 0.5;
/** On a bar's first boom, the bass on the chord's fifth counts this much of being on its root. */
const FIFTH_CREDIT = 0.6;
/** How much better a new chord must score to change chords inside a bar: bluegrass rarely does. */
const MID_BAR_CHANGE_MARGIN = 0.25;
/** How much better a new chord must score to take over from the bar before's: chords usually last a bar or more. */
const NEW_BAR_CHANGE_MARGIN = 0.05;
/** The quick change (| I V | I |) needs only this much: it's the one mid-bar change bluegrass makes often. */
const QUICK_CHANGE_MARGIN = 0.08;
/** Chops quieter than this (RMS) are a gap, not a chord. */
const SILENCE = 0.003;

/**
 * @typedef {{ boom: import('./notesSounding.js').NotesSounding, chops: import('./notesSounding.js').NotesSounding }} GroupHeard
 */

/**
 * @param {{
 *   channels: Float32Array[], sampleRate: number, cents: number,
 *   beats: number[], bars: import('../barPlan.js').Bar[], duration: number,
 *   key?: string | null
 * }} recording beats: each beat's time (seconds); cents: how far the band is from A = 440;
 *   key: the song's key, if you've said it
 * @returns {Record<number, import('../barChords.js').Slots>} bar number → a slot per beat
 */
export function guessChords({ channels, sampleRate, cents, beats, bars, duration, key = null }) {
	const chords = chordsFor(key);
	const mono = mixDown(channels);
	const boomBetween = createNoteMeter(mono, sampleRate, cents, BASS_HEARING);
	const chopBetween = createNoteMeter(mono, sampleRate, cents, STRUM_HEARING);
	const heardBars = bars.map((bar) => {
		const timeOf = (/** @type {number} */ beat) =>
			Math.max(0, Math.min(duration, secondsAtBeat(beats, bar.firstBeat + beat)));
		const groups = groupsOf(bar.beats);
		return {
			bar,
			booms: groups.map((group) => group.boom),
			heard: groups.map(({ boom, chops }) => ({
				boom: boomBetween(timeOf(boom), timeOf(boom + 1)),
				chops: chopBetween(timeOf(chops[0]), timeOf(chops[chops.length - 1] + 1))
			}))
		};
	});

	/** @type {Record<number, import('../barChords.js').Slots>} */
	const guessed = {};
	heardBars.forEach(({ bar, booms, heard }, i) => {
		const before = guessed[bar.number - 1];
		const next = heardBars[i + 1];
		const slots = slotsFromHearing(heard, booms, bar.beats, {
			chords,
			carried: chordNamed(chords, before?.findLast(Boolean)),
			nextStart: next?.bar.number === bar.number + 1 ? next.heard[0] : null
		});
		if (slots) guessed[bar.number] = slots;
	});
	return guessed;
}

/**
 * A bar's beat groups: each one's boom, and the beats it chops on (the boom
 * itself for a lone beat).
 * @param {number} beats
 */
function groupsOf(beats) {
	let at = 0;
	return beatGroups(beats).map((size) => {
		const boom = at;
		at += size;
		const chops = Array.from({ length: size - 1 }, (_, i) => boom + 1 + i);
		return { boom, chops: chops.length ? chops : [boom] };
	});
}

/**
 * A bar's slots from what's heard in each beat group (null: a gap at its start).
 * @param {GroupHeard[]} heard
 * @param {number[]} booms the beat each group starts on
 * @param {number} beats
 * @param {{ chords: Chord[], carried: Chord | null, nextStart: GroupHeard | null }} around
 *   chords: the ones it can be; carried: the chord the bar before ended on;
 *   nextStart: the next bar's first beat group
 */
function slotsFromHearing(heard, booms, beats, { chords, carried, nextStart }) {
	if (heard[0].chops.loudness < SILENCE) return null;
	/** @type {import('../barChords.js').Slots} */
	const slots = Array(beats).fill(null);
	let current = bestChord(chords, heard[0], FIFTH_CREDIT);
	if (carried && current.score - chordScore(carried, heard[0], 1) < NEW_BAR_CHANGE_MARGIN) {
		current = carried;
	}
	slots[booms[0]] = current.name;
	for (let i = 1; i < booms.length; i++) {
		if (heard[i].chops.loudness < SILENCE) continue;
		const staying = chordScore(current, heard[i], 1);
		const fifthUp = majorChordOn(chords, current.root + A_FIFTH);
		const arriving = bestChord(chords, heard[i], 0);
		if (
			returnsHome(chords, current, nextStart) &&
			chordScore(fifthUp, heard[i], 0) - staying >= QUICK_CHANGE_MARGIN
		) {
			current = fifthUp;
		} else if (
			arriving.name !== current.name &&
			arriving.score - staying >= MID_BAR_CHANGE_MARGIN
		) {
			current = arriving;
		} else {
			continue;
		}
		slots[booms[i]] = current.name;
	}
	return slots;
}

/**
 * Whether the next bar goes back to this chord (the end of | I V | I |).
 * @param {Chord[]} chords
 * @param {Chord} home
 * @param {GroupHeard | null} nextStart
 */
function returnsHome(chords, home, nextStart) {
	if (!nextStart) return false;
	const nextBest = bestChord(chords, nextStart, FIFTH_CREDIT);
	return nextBest.score - chordScore(home, nextStart, 1) < NEW_BAR_CHANGE_MARGIN;
}

/**
 * @param {Chord[]} chords
 * @param {GroupHeard} heard
 * @param {number} fifthCredit how much the bass on the fifth counts
 */
function bestChord(chords, heard, fifthCredit) {
	let best = { chord: chords[0], score: -Infinity };
	for (const chord of chords) {
		const score = chordScore(chord, heard, fifthCredit);
		if (score > best.score) best = { chord, score };
	}
	return { ...best.chord, score: best.score };
}

/**
 * How well a chord fits a beat group: the share of the chops that is its
 * notes, plus the share of the boom's bass on its root (and its fifth, as
 * much as `fifthCredit` says).
 * @param {Chord} chord
 * @param {GroupHeard} heard
 * @param {number} fifthCredit
 */
function chordScore(chord, { boom, chops }, fifthCredit) {
	const strummed = share(chops.notes, chord.notes);
	const bass =
		share(boom.notes, [chord.root]) + fifthCredit * share(boom.notes, [chord.root + A_FIFTH]);
	return strummed + BASS_WEIGHT * bass - chord.penalty;
}

/**
 * The part of what sounds that is these notes.
 * @param {Float64Array} sounding 12 values
 * @param {number[]} notes any octave (0 = C)
 */
function share(sounding, notes) {
	const total = sounding.reduce((sum, value) => sum + value, 0);
	if (!total) return 0;
	return notes.reduce((sum, note) => sum + sounding[note % 12], 0) / total;
}

/** @typedef {{ name: string, root: number, notes: number[], penalty: number }} Chord */

/**
 * The major chord on this root (the V of | I V | I | is major in bluegrass).
 * @param {Chord[]} chords
 * @param {number} root any octave (0 = C)
 */
function majorChordOn(chords, root) {
	return /** @type {Chord} */ (chordNamed(chords, ROOT_NAMES[root % 12]));
}

/**
 * @param {Chord[]} chords
 * @param {string | null | undefined} name
 */
function chordNamed(chords, name) {
	return chords.find((chord) => chord.name === name) ?? null;
}

/**
 * Every chord a guess can be, each held back by how unlikely it is in the key.
 * @param {string | null} key
 * @returns {Chord[]}
 */
function chordsFor(key) {
	const unlikely = key ? unlikelyInKey(key) : () => 0;
	return ROOT_NAMES.flatMap((rootName, root) =>
		QUALITIES.map((quality) => ({
			name: rootName + quality.suffix,
			root,
			notes: quality.notes.map((note) => root + note),
			penalty: (quality.penalty ?? 0) + unlikely(root, quality.suffix === 'm')
		}))
	);
}
