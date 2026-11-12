/**
 * Roman numeral analysis the way a jazz school teaches it: each chord gets
 * a function from where it goes, not just from its root.
 *
 * - A dominant that falls a fifth belongs to its target: A7 → D in G is
 *   V7/V. A dominant 7th that doesn't is still named for the key chord it
 *   points at when its root is a key note (A7 → C in G is V7/V going elsewhere).
 * - A dominant 7th sliding down a half step is a tritone substitute: Ab7 → G
 *   in G is subV7, Eb7 → D is subV7/V.
 * - A minor or half-diminished chord a fifth above a dominant is that
 *   dominant's related II: Bm7 → E7 → Am7 in G is IIm7/II, V7/II, IIm7.
 *   A diatonic one keeps its own numeral, with the II reading offered.
 * - Anything else is its plain numeral: in the key, borrowed from a
 *   parallel mode (modal interchange: bVI and bVII from minor, bIImaj7
 *   from Phrygian), a passing diminished chord, or outside the key.
 *
 * Every reading says why, and lists the other readings a musician might
 * give, so a wrong guess is one tap to fix.
 */
import { degree, keyName, noteName, parseChord } from '../chart/key.js';
import { borrowedFrom, canBeDominant, canBeTarget, chordFamily, inKey } from './chordFamily.js';
import { MODES } from './modes.js';
import { dominantLabel, numeral, plainLabel, relatedTwoLabel, subLabel } from './functionLabels.js';
import {
	A_FIFTH_BELOW,
	A_HALF_STEP_BELOW,
	fallsAFifth,
	moveNote,
	risesAHalfStep,
	sameRoot,
	slidesDownAHalfStep
} from './rootMotion.js';

/**
 * @typedef {import('../chart/key.js').Key} Key
 * @typedef {import('../chart/key.js').Note} Note
 * @typedef {{ steps: number, offset: number, prefix: string }} Degree
 *   steps: scale degree from the tonic (0 = I); offset: semitones off the major scale (-1 = flat)
 * @typedef {'dominant' | 'sub' | 'relatedTwo' | 'own'} ReadingKind
 *   dominant: V7/x; sub: a tritone substitute; relatedTwo: IIm7/x; own: its own numeral
 * @typedef {{ kind: ReadingKind, label: string, why: string, options: string[] }} Reading
 *   label: the analysis; options: every reading worth offering, label first
 * @typedef {Reading & { kind: 'dominant' | 'sub', target: Degree }} DominantReading
 * @typedef {{
 *   name: string, root: Note, rest: string,
 *   family: import('./chordFamily.js').Family, degree: Degree, diatonic: boolean,
 *   borrowed: import('./modes.js').ModeId | null
 * }} Chord
 *   rest: the quality as written ("m7"); borrowed: the mode it comes from, when not diatonic
 */

/**
 * @param {string[]} names chord names in play order (anything that isn't a chord, like N.C., is skipped)
 * @param {Key} key
 * @returns {(Reading | null)[]} one per name; null where there's no chord
 */
export function analyzeProgression(names, key) {
	const chords = names.map((name) => readChord(name, key));
	const nexts = chords.map((_, i) => nextChange(chords, i));
	const dominants = chords.map((chord, i) =>
		chord ? dominantReading(chord, nexts[i]?.chord ?? null, key) : null
	);

	return chords.map((chord, i) => {
		if (!chord) return null;
		const asDominant = dominants[i];
		if (asDominant) return withoutDetails(asDominant);
		const next = nexts[i]?.chord ?? null;
		const nextAsDominant = nexts[i] ? dominants[nexts[i].index] : null;
		return relatedTwoReading(chord, next, nextAsDominant, key) ?? plainReading(chord, next, key);
	});
}

/**
 * The chord as analysis needs it, or null for anything that isn't a chord.
 * @param {string} name
 * @param {Key} key
 * @returns {Chord | null}
 */
export function readChord(name, key) {
	const chord = parseChord(name);
	if (!chord) return null;
	const family = chordFamily(chord.rest);
	const place = degree(chord.root, key.tonic);
	const diatonic = inKey(place, family, key.minor);
	return {
		name,
		root: chord.root,
		rest: chord.rest,
		family,
		degree: place,
		diatonic,
		borrowed: diatonic ? null : borrowedFrom(place, family, key.minor)
	};
}

/**
 * The next different chord after this one, going round to the top at the
 * end (a song repeats, so its last chord leads back to its first).
 * @param {(Chord | null)[]} chords
 * @param {number} i
 */
function nextChange(chords, i) {
	const chord = chords[i];
	if (!chord) return null;
	for (let step = 1; step < chords.length; step++) {
		const index = (i + step) % chords.length;
		const next = chords[index];
		if (next && next.name !== chord.name) return { index, chord: next };
	}
	return null;
}

/* ---- Dominants: V7/x and subV7/x ---- */

/**
 * @param {Chord} chord
 * @param {Chord | null} next
 * @param {Key} key
 * @returns {DominantReading | null}
 */
function dominantReading(chord, next, key) {
	if (!canBeDominant(chord.family) || keepsItsOwnNumeral(chord)) return null;
	if (next && fallsAFifth(chord, next)) return secondaryDominant(chord, next, key);
	if (next && isSeventh(chord) && slidesDownAHalfStep(chord, next)) {
		return tritoneSub(chord, next, key);
	}
	return unresolvedDominant(chord, next, key);
}

/**
 * A major triad that keeps its own numeral even when it falls a fifth: the
 * key's own (I, IV, V), and borrowed ones on a flat or sharp root (bIII,
 * bVI, bVII: Eb → Ab in C is bIII bVI, not V/bVI). A triad on another key
 * note (A → D in G) is still V/V, and a 7th always makes a dominant.
 * @param {Chord} chord
 */
function keepsItsOwnNumeral(chord) {
	if (isSeventh(chord)) return false;
	return chord.diatonic || (chord.borrowed !== null && chord.degree.offset !== 0);
}

/** @param {Chord} chord a dominant 7th (7, 9, 13, 7b9…), not a plain triad */
function isSeventh(chord) {
	return chord.family === 'dominant';
}

/**
 * A7 → D in G: V7/V.
 * @param {Chord} chord
 * @param {Chord} next
 * @param {Key} key
 * @returns {DominantReading}
 */
function secondaryDominant(chord, next, key) {
	const target = degree(next.root, key.tonic);
	const label = dominantLabel(chord.rest, target);
	const sub = isSeventh(chord) && keyChordBelow(chord, A_HALF_STEP_BELOW, key);
	return {
		kind: 'dominant',
		label,
		target,
		why: isTonic(target)
			? `${chord.name} resolves down a fifth to ${next.name}, the home chord: it is the dominant.`
			: `${chord.name} resolves down a fifth to ${next.name}: the dominant of ${numeral(target)}.`,
		options: unique([label, ownNumeral(chord), sub && subLabel(chord.rest, sub)])
	};
}

/**
 * Eb7 → D in G: subV7/V.
 * @param {Chord} chord
 * @param {Chord} next
 * @param {Key} key
 * @returns {DominantReading}
 */
function tritoneSub(chord, next, key) {
	const target = degree(next.root, key.tonic);
	const label = subLabel(chord.rest, target);
	const asDominant = keyChordBelow(chord, A_FIFTH_BELOW, key);
	const of = isTonic(target) ? 'the dominant' : `the dominant of ${numeral(target)}`;
	return {
		kind: 'sub',
		label,
		target,
		why: `${chord.name} slides down a half step to ${next.name}: a tritone substitute for ${of}.`,
		options: unique([label, ownNumeral(chord), asDominant && dominantLabel(chord.rest, asDominant)])
	};
}

/**
 * A7 → C in G: still V7/V, a dominant going somewhere else. Only for a 7th
 * chord outside the key, on a key note, pointing at a key chord.
 * @param {Chord} chord
 * @param {Chord | null} next
 * @param {Key} key
 * @returns {DominantReading | null}
 */
function unresolvedDominant(chord, next, key) {
	if (chord.diatonic || !isSeventh(chord) || chord.degree.offset !== 0) return null;
	const target = keyChordBelow(chord, A_FIFTH_BELOW, key);
	if (!target) return null;
	const label = dominantLabel(chord.rest, target);
	const sub = keyChordBelow(chord, A_HALF_STEP_BELOW, key);
	const goes = next ? `, going to ${next.name} instead` : '';
	return {
		kind: 'dominant',
		label,
		target,
		why: `${chord.name} is the dominant of ${numeral(target)}${goes}.`,
		options: unique([label, ownNumeral(chord), sub && subLabel(chord.rest, sub)])
	};
}

/**
 * The key's chord an interval below this one, if the key has one there a
 * dominant can lead to.
 * @param {Chord} chord
 * @param {import('./rootMotion.js').Interval} interval
 * @param {Key} key
 * @returns {Degree | null}
 */
function keyChordBelow(chord, interval, key) {
	const place = degree(moveNote(chord.root, interval), key.tonic);
	return canBeTarget(place, key.minor) ? place : null;
}

/* ---- The II of a II–V ---- */

/**
 * Bm7 → E7 in G: IIm7/II. A minor chord a fifth above the dominant it leads to.
 * @param {Chord} chord
 * @param {Chord | null} next
 * @param {DominantReading | null} nextAsDominant
 * @param {Key} key
 * @returns {Reading | null}
 */
function relatedTwoReading(chord, next, nextAsDominant, key) {
	const isMinorKind = chord.family === 'minor' || chord.family === 'halfDim';
	if (!isMinorKind || !next || nextAsDominant?.kind !== 'dominant') return null;
	if (!fallsAFifth(chord, next)) return null;

	const label = relatedTwoLabel(chord.rest, nextAsDominant.target);
	const into = isTonic(nextAsDominant.target) ? 'home' : numeral(nextAsDominant.target);
	if (chord.diatonic) {
		return {
			kind: 'relatedTwo',
			label: ownNumeral(chord),
			why: `${chord.name} is in the key, and with ${next.name} makes a II–V into ${into}.`,
			options: unique([ownNumeral(chord), label])
		};
	}
	const borrowed =
		chord.borrowed && into === 'home' ? `, borrowed from ${modeName(chord.borrowed, key)}` : '';
	return {
		kind: 'relatedTwo',
		label,
		why: `${chord.name} sets up ${next.name}: the II of a II–V into ${into}${borrowed}.`,
		options: unique([label, ownNumeral(chord)])
	};
}

/* ---- Everything else: its own numeral, and why ---- */

/**
 * @param {Chord} chord
 * @param {Chord | null} next
 * @param {Key} key
 * @returns {Reading}
 */
function plainReading(chord, next, key) {
	const label = ownNumeral(chord);
	// A borrowed triad that falls a fifth could still be heard as a dominant
	const couldBeDominant = next && canBeDominant(chord.family) && fallsAFifth(chord, next);
	const asDominant = couldBeDominant && dominantLabel(chord.rest, degree(next.root, key.tonic));
	return {
		kind: 'own',
		label,
		why: whyItsOwnNumeral(chord, next, key),
		options: unique([label, asDominant])
	};
}

/**
 * @param {Chord} chord
 * @param {Chord | null} next
 * @param {Key} key
 */
function whyItsOwnNumeral(chord, next, key) {
	const name = chord.name;
	if (chord.diatonic) return `${name} is in the key of ${keyName(key)}.`;
	if (isSeventh(chord) && inKey(chord.degree, 'triad', key.minor)) {
		return `${name} is the key's own ${numeral(chord.degree)} chord with a bluesy seventh.`;
	}
	if (chord.borrowed) return `${name} is borrowed from ${modeName(chord.borrowed, key)}.`;
	const diminished = chord.family === 'dim7' || chord.family === 'dim';
	if (diminished && next && risesAHalfStep(chord, next)) {
		return `${name} passes up a half step to ${next.name}.`;
	}
	if (diminished && next && slidesDownAHalfStep(chord, next)) {
		return `${name} passes down a half step to ${next.name}.`;
	}
	if (diminished && next && sameRoot(chord, next)) {
		return `${name} decorates ${next.name}, on the same root.`;
	}
	return `${name} is from outside the key of ${keyName(key)}.`;
}

/* ---- Small helpers ---- */

/** @param {Chord} chord "bVII7", "IIm7" */
function ownNumeral(chord) {
	return plainLabel(chord.degree, chord.rest);
}

/**
 * "C Phrygian", "C minor (Aeolian)"
 * @param {import('./modes.js').ModeId} mode
 * @param {Key} key
 */
function modeName(mode, key) {
	return `${noteName(key.tonic)} ${MODES[mode].name}`;
}

/** @param {{ steps: number, offset: number }} place */
function isTonic(place) {
	return place.steps === 0 && place.offset === 0;
}

/**
 * @param {DominantReading} reading
 * @returns {Reading}
 */
function withoutDetails({ kind, label, why, options }) {
	return { kind, label, why, options };
}

/** @param {(string | null | false | undefined)[]} labels */
function unique(labels) {
	return [...new Set(labels.filter((label) => typeof label === 'string'))];
}
