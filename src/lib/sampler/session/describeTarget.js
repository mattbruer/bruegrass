/**
 * A target in words, for the prompt: "D string, fret 5" over "Hard ·
 * take 2 of 3", and the note it should sound ("G, 196 Hz") so a wrong
 * fret is easy to spot.
 */
import { midiToHz } from '../analysis/detectPitch.js';
import { describeClick } from '../checklists/groupClick.js';

/** Note names, sharps only (a guitarist reads F#, not G♭, off the fretboard). */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * @param {import('../checklists/targets.js').Target} target
 * @param {import('../checklists/guitar.js').Checklist} checklist
 */
export function describeTarget(target, checklist) {
	const group = checklist.groups.find((each) => each.id === target.groupId);
	const string = checklist.strings.find((each) => each.id === target.stringId);
	const where = string
		? `${string.name} string, ${target.fret === 0 ? 'open' : `fret ${target.fret}`}`
		: strokeName(target.direction ?? '');
	return {
		group: group?.name ?? '',
		how: group?.how ?? '',
		click: describeClick(group, target.tempo),
		where,
		layer: [
			capitalise(target.intensity),
			target.tempo && `${target.tempo} BPM`,
			`take ${target.take} of ${target.takes}`
		]
			.filter(Boolean)
			.join(' · '),
		note: target.midi === null ? null : noteName(target.midi)
	};
}

/**
 * The details the checks need to word their advice.
 * @param {import('../checklists/targets.js').Target} target
 * @param {import('../checklists/guitar.js').Checklist} checklist
 */
export function checkDetails(target, checklist) {
	const group = checklist.groups.find((each) => each.id === target.groupId);
	return {
		pitched: target.midi !== null,
		stringName: checklist.strings.find((each) => each.id === target.stringId)?.name ?? null,
		fretted: (target.fret ?? 0) > 0,
		pattern: Boolean(group?.pattern)
	};
}

/** @param {number} midi */
export function noteName(midi) {
	return `${NOTE_NAMES[midi % 12]}, ${Math.round(midiToHz(midi))} Hz`;
}

/**
 * The note with its octave ("G2"), short enough for a table cell.
 * Scientific numbering, so the guitar's low E is E2.
 * @param {number} midi
 */
export function shortNoteName(midi) {
	return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/**
 * "Down-strum", "Up-strum", or a pattern's own name ("Boom-chuck").
 * @param {string} direction
 */
function strokeName(direction) {
	const isStroke = direction === 'down' || direction === 'up';
	return isStroke ? `${capitalise(direction)}-strum` : capitalise(direction);
}

/** @param {string} text */
function capitalise(text) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
