/**
 * A target in words, for the prompt: "D string, fret 5" over "Hard ·
 * take 2 of 3", and the note it should sound ("G, 196 Hz") so a wrong
 * fret is easy to spot.
 */
import { midiToHz } from '../analysis/detectPitch.js';

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
		: `${capitalise(target.direction ?? '')}-strum`;
	return {
		group: group?.name ?? '',
		how: group?.how ?? '',
		where,
		layer: `${capitalise(target.intensity)} · take ${target.take} of ${target.takes}`,
		note: target.midi === null ? null : noteName(target.midi)
	};
}

/**
 * The details the checks need to word their advice.
 * @param {import('../checklists/targets.js').Target} target
 * @param {import('../checklists/guitar.js').Checklist} checklist
 */
export function checkDetails(target, checklist) {
	return {
		pitched: target.midi !== null,
		stringName: checklist.strings.find((each) => each.id === target.stringId)?.name ?? null,
		fretted: (target.fret ?? 0) > 0
	};
}

/** @param {number} midi */
export function noteName(midi) {
	return `${NOTE_NAMES[midi % 12]}, ${Math.round(midiToHz(midi))} Hz`;
}

/** @param {string} text */
function capitalise(text) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
