/**
 * Harmony parts written into the ABC as voices of their own (V:tenor, …),
 * so they're drawn, played, saved and can be edited like the melody.
 *
 * A part is the melody's own text with each note's pitch swapped for the
 * harmony note, so its rhythm, ties, bar lines and repeats are the melody's.
 * Chord symbols and lyrics stay with the melody. The melody is marked V:1
 * (abcjs needs that to play the voices together) and the parts follow it at
 * the end of the tune; writing them again replaces them.
 */
import { HARMONY_PARTS } from './harmonyParts.js';
import { harmonyStyle } from './harmonyStyles.js';
import { abcPitch, noteInKey, tuneKey } from './abcPitch.js';
import { chordFromName } from '../../theory/musicInKey.js';
import { melodyFromTune } from '../melody.js';

const LEAD_VOICE = 'V:1';
const PART_LINE = new RegExp(`^V:(${HARMONY_PARTS.map((part) => part.id).join('|')})\\b.*$`, 'gm');
/* A pitch, or a chord of pitches; decorations (!trill!) are matched only to be skipped */
const PITCH = /(![^!]*!|\+[^+]*\+)|(\[[^\]:]*\]|[_=^]*[A-Ga-g][,']*)/g;

/**
 * @typedef {import('../../theory/musicInKey.js').Note} Note
 * @typedef {(time: number) => string | null} ChordAt the concert chord the band plays at a
 *   time (quarter notes from bar 1)
 */

/**
 * Which harmony parts the ABC has.
 * @param {string} abc
 * @returns {string[]} part ids
 */
export function harmonyPartsIn(abc) {
	return [...abc.matchAll(PART_LINE)].map((match) => match[1]);
}

/**
 * The ABC with exactly these harmony parts, written fresh from the melody.
 * @param {string} abc
 * @param {import('abcjs').TuneObject} tune parsed from this ABC, as written (not visually transposed)
 * @param {ChordAt} chordAt
 * @param {string[]} partIds
 * @param {Record<string, string>} [styles] a harmony style (harmonyStyles.js) by part id; the stack when not given
 * @returns {{ abc: string, problem: string }}
 */
export function withHarmonies(abc, tune, chordAt, partIds, styles = {}) {
	const melodyEnd = PART_LINE.exec(abc)?.index ?? abc.length;
	PART_LINE.lastIndex = 0;
	const { headerEnd, bodyStart } = findBody(abc);
	const header = abc.slice(0, headerEnd);
	const body = abc.slice(bodyStart, melodyEnd).trimEnd();
	if (/^V:|\[V:/m.test(body)) {
		return { abc, problem: 'Harmonies can only be added to a melody with a single voice.' };
	}

	const parts = HARMONY_PARTS.filter((part) => partIds.includes(part.id));
	if (parts.length === 0) return { abc: `${header}${body}\n`, problem: '' };

	const notes = leadNotes(tune, melodyEnd);
	const written = parts.map((part) => {
		const text = partText(abc, bodyStart, melodyEnd, notes, tuneKey(tune.getKeySignature()), {
			chordAt,
			count: part.chordTones,
			style: harmonyStyle(styles[part.id] ?? 'stack')
		});
		return `V:${part.id} name="${part.name}"\n${text}`;
	});
	return { abc: [`${header}${LEAD_VOICE}`, body, ...written].join('\n') + '\n', problem: '' };
}

/**
 * Where the header (up to and including the K: line) ends and the music
 * starts, after a V:1 line if there is one.
 * @param {string} abc
 */
function findBody(abc) {
	const keyLine = /^K:.*$/m.exec(abc);
	const headerEnd = keyLine ? keyLine.index + keyLine[0].length + 1 : 0;
	const leadLine = new RegExp(`^${LEAD_VOICE}[ \\t]*(\\n|$)`).exec(abc.slice(headerEnd));
	return { headerEnd, bodyStart: headerEnd + (leadLine ? leadLine[0].length : 0) };
}

/**
 * The melody's notes, rests and bar lines in written order, each note with
 * when it first plays and what it sounds.
 * @param {import('abcjs').TuneObject} tune
 * @param {number} melodyEnd
 */
function leadNotes(tune, melodyEnd) {
	const { pickup } = melodyFromTune(tune);
	/** @type {Map<number, { time: number, midi: number }>} */
	const sounding = new Map();
	for (const item of tune.setUpAudio({ chordsOff: true }).tracks[0] ?? []) {
		if (item.cmd !== 'note') continue;
		const time = item.start * 4 - pickup;
		const seen = sounding.get(item.startChar);
		if (!seen || time < seen.time - 1e-9) sounding.set(item.startChar, { time, midi: item.pitch });
		else if (Math.abs(time - seen.time) < 1e-9) seen.midi = Math.max(seen.midi, item.pitch);
	}

	return tune.lines
		.flatMap((line) => line.staff?.[0]?.voices?.[0] ?? [])
		.filter((element) => element.startChar < melodyEnd)
		.filter((element) => element.el_type === 'note' || element.el_type === 'bar')
		.map((element) => ({
			element,
			sounding: sounding.get(element.startChar) ?? ownPitch(element, pickup)
		}));
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
 * One part's music: the melody's text with every note's pitch swapped.
 * @param {string} abc
 * @param {number} from
 * @param {number} to
 * @param {ReturnType<typeof leadNotes>} notes
 * @param {import('../../theory/musicInKey.js').Key} key
 * @param {{ chordAt: ChordAt, count: number, style: (typeof import('./harmonyStyles.js').HARMONY_STYLES)[number] }} part
 */
function partText(abc, from, to, notes, key, { chordAt, count, style }) {
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
			note = style.pick({ lead, chord, count, previous });
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
 * The part's text without what belongs to the melody: chord symbols,
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
