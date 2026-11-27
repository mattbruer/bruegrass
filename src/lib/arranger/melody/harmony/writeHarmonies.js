/**
 * A harmony line's music, written from its lead (the melody, or a part you
 * added) and the band's chords: the lead's own text with each note's pitch
 * swapped for the harmony note, so its rhythm, ties, bar lines, repeats and
 * key changes are the lead's, and its bars line up with the lead's one for
 * one. Chord symbols, grace notes and lyrics stay with the lead.
 * Where the line goes in the tune is generatedParts.js's job.
 */
import { harmonyStyle, ROOTS } from './harmonyStyles.js';
import { abcPitch, noteInKey, tuneKey } from './abcPitch.js';
import { chordFromName } from '../../theory/musicInKey.js';
import { melodyFromTune } from '../melody.js';
import { harmonyRoles } from './harmonyRoles.js';
import { HARMONY_PARTS } from './harmonyParts.js';
import { voiceChannels } from './partChannels.js';
import { voiceMusic } from './voiceText.js';

/* A pitch, or a chord of pitches; decorations (!trill!) are matched only to be skipped */
const PITCH = /(![^!]*!|\+[^+]*\+)|(\[[^\]:]*\]|[_=^]*[A-Ga-g][,']*)/g;

/**
 * @typedef {import('../../theory/musicInKey.js').Note} Note
 * @typedef {(time: number) => string | null} ChordAt the concert chord the band plays at a
 *   time (quarter notes from bar 1)
 * @typedef {{ lead: string, sings: string, style: string }} HarmonyOf
 *   lead: the voice it's written from (a channel id); sings: a harmony part
 *   (harmonyParts.js); style: a harmony style (harmonyStyles.js)
 */

/**
 * @param {string} abc
 * @param {import('abcjs').TuneObject} tune parsed from this ABC, as written (not visually transposed)
 * @param {ChordAt} chordAt
 * @param {HarmonyOf} harmony
 * @returns {string | null} its music (no V: line); null when the lead can't be found
 */
export function harmonyMusic(abc, tune, chordAt, { lead, sings, style }) {
	const part = HARMONY_PARTS.find((each) => each.id === sings);
	const voice = voiceChannels(tune).indexOf(lead);
	const music = voiceMusic(abc, lead);
	if (!part || voice < 0 || !music) return null;
	const notes = leadNotes(tune, voice, music);
	const key = tuneKey(tune.getKeySignature());
	const roles = harmonyRoles(rolesInput(notes), chordAt, tune.getMeterFraction(), key);
	return partText(abc, music, notes, key, {
		roles,
		chordAt,
		count: part.chordTones,
		style: 'singsRoots' in part ? ROOTS : harmonyStyle(style)
	});
}

/**
 * The lead's notes, rests, bar lines and key changes in written order,
 * each note with when it first plays and what it sounds.
 * @param {import('abcjs').TuneObject} tune
 * @param {number} voice the lead's staff
 * @param {{ from: number, to: number }} music where the lead's music is in the ABC
 */
function leadNotes(tune, voice, { from, to }) {
	const { pickup } = melodyFromTune(tune);
	const sounding = firstSoundings(tune);
	return tune.lines
		.flatMap((line) => line.staff?.[voice]?.voices?.[0] ?? [])
		.filter((element) => element.startChar >= from && element.startChar < to)
		.filter((element) => ['note', 'bar', 'key'].includes(element.el_type))
		.map((element) => ({
			element,
			sounding: sounding.get(element.startChar) ?? ownPitch(element, pickup)
		}));
}

/**
 * When each of the tune's written notes first plays (quarter notes from
 * bar 1) and its pitch, by where it's written (startChar), in every voice.
 * A harmony note is worked out at that time, so a repeated bar takes its
 * first pass's chord.
 * @param {import('abcjs').TuneObject} tune
 * @returns {Map<number, { time: number, midi: number }>}
 */
export function firstSoundings(tune) {
	const { pickup } = melodyFromTune(tune);
	/** @type {Map<number, { time: number, midi: number }>} */
	const sounding = new Map();
	for (const track of tune.setUpAudio({ chordsOff: true }).tracks) {
		for (const item of track) {
			if (item.cmd !== 'note') continue;
			const time = item.start * 4 - pickup;
			const seen = sounding.get(item.startChar);
			if (!seen || time < seen.time - 1e-9)
				sounding.set(item.startChar, { time, midi: item.pitch });
			else if (Math.abs(time - seen.time) < 1e-9) seen.midi = Math.max(seen.midi, item.pitch);
		}
	}
	return sounding;
}

/**
 * The lead's notes as the note roles read them: when each first plays,
 * how long (a tied note joined to the one before) and its pitch.
 * @param {ReturnType<typeof leadNotes>} notes
 * @returns {import('./harmonyRoles.js').LeadNote[]}
 */
function rolesInput(notes) {
	/** @type {import('./harmonyRoles.js').LeadNote[]} */
	const read = [];
	for (const { element, sounding } of notes) {
		if (element.el_type !== 'note' || !(element.pitches?.length > 0)) continue;
		const length = (element.duration ?? 0) * 4;
		const tied = element.pitches.some((/** @type {any} */ p) => p.endTie);
		const last = read.at(-1);
		if (tied && last) last.length += length;
		else if (sounding)
			read.push({
				startChar: element.startChar,
				time: sounding.time,
				length,
				pitch: sounding.midi
			});
	}
	return read.sort((a, b) => a.time - b.time);
}

/**
 * When and what a note sounds, from abcjs's note itself (set by
 * setUpAudio): for notes the audio plays as something else, like a trill.
 * @param {any} element
 * @param {number} pickup
 */
function ownPitch(element, pickup) {
	const pitches = element.midiPitches ?? [];
	if (pitches.length === 0) return null;
	return {
		time: pitches[0].start * 4 - pickup,
		midi: Math.max(...pitches.map((/** @type {{ pitch: number }} */ p) => p.pitch))
	};
}

/**
 * The line's music: the lead's text with every note's pitch swapped,
 * spelled in the key in force (the lead's `[K:]` changes are copied with it).
 * @param {string} abc
 * @param {{ from: number, to: number }} music where the lead's music is
 * @param {ReturnType<typeof leadNotes>} notes
 * @param {import('../../theory/musicInKey.js').Key} key
 * @param {{
 *   roles: Map<number, import('./harmonyRoles.js').HarmonyRole>, chordAt: ChordAt, count: number,
 *   style: (typeof import('./harmonyStyles.js').HARMONY_STYLES)[number]
 * }} part
 */
function partText(abc, { from, to }, notes, key, { roles, chordAt, count, style }) {
	const tonicChord = /** @type {const} */ ({ root: { step: 0, alt: 0 }, quality: '', bass: null });
	/** @type {Map<number, number>} */
	let bar = new Map();
	/** @type {Note | null} */
	let held = null;
	/** @type {Note | null} */
	let previous = null;
	/** @type {{ start: number, end: number, text: string }[]} */
	const swaps = [];

	for (const { element, sounding } of notes) {
		if (element.el_type === 'key') {
			key = tuneKey(element);
			continue;
		}
		if (element.el_type === 'bar') {
			bar = new Map();
			continue;
		}
		const pitches = element.pitches ?? [];
		if (pitches.length === 0) continue; // a rest
		const tied = pitches.some((/** @type {any} */ p) => p.endTie);

		let note = tied ? held : null;
		if (!note && sounding) {
			const top = Math.max(...pitches.map((/** @type {any} */ p) => p.pitch));
			const lead = noteInKey(key, top, sounding.midi);
			const name = chordAt(sounding.time);
			const chord = (name && chordFromName(key, name)) || tonicChord;
			const { role, roleChord, strong } = roles.get(element.startChar) ?? {
				role: 'target',
				roleChord: null,
				strong: false
			};
			note = style.pick({ lead, chord, count, previous, role, roleChord, strong });
		}
		if (!note) continue;
		held = note;
		previous = note;
		swaps.push({
			start: element.startChar,
			end: element.endChar,
			text: withPitch(abc.slice(element.startChar, element.endChar), abcPitch(key, note, bar))
		});
	}

	let text = '';
	let at = from;
	for (const swap of swaps) {
		text += abc.slice(at, swap.start) + swap.text;
		at = swap.end;
	}
	text += abc.slice(at, to);
	return withoutWords(text);
}

/**
 * A note's text with its pitch replaced and its chord symbol and grace notes left out.
 * @param {string} text e.g. `"G"!roll!B2-`
 * @param {string} pitch e.g. `d`
 */
function withPitch(text, pitch) {
	let replaced = false;
	return text
		.replace(/"[^"]*"/g, '')
		.replace(/\{[^}]*\}/g, '')
		.replace(PITCH, (match, decoration) => {
			if (decoration || replaced) return match;
			replaced = true;
			return pitch;
		});
}

/**
 * The line's text without what belongs to the lead: chord symbols,
 * annotations and lyrics. Blank lines would end the tune.
 * @param {string} text
 */
function withoutWords(text) {
	return text
		.replace(/"[^"]*"/g, '')
		.split('\n')
		.filter((line) => !/^[wW]:/.test(line) && line.trim() !== '')
		.join('\n');
}
