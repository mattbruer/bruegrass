/**
 * The bass line's ABC read back: as a score for the piano roll, and as
 * notes for the band to play (the same shape bassline.js makes, so
 * playback and the MIDI file treat both alike).
 */
import { readScore } from '../melody/roll/readScore.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';

/* How a written bass line is played: notes are let go a little early, and the downbeat leans in */
const WRITTEN_GATE = 0.75;
const VELOCITY = { downbeat: 120, other: 112 };

/**
 * @typedef {{ score: import('../melody/roll/readScore.js').Score, problem: string }} ReadBass
 */

/**
 * @param {string} abc
 * @param {any} abcjs null while it's still loading
 * @returns {ReadBass | null} null: nothing to read
 */
export function readBassScore(abc, abcjs) {
	if (!abc.trim() || !abcjs) return null;
	const tune = abcjs.parseOnly(abc)[0];
	if (!tune) return null;
	const read = readScore(abc, tune, 0);
	return read.score.bars.length > 0 ? read : null;
}

/**
 * The edited bass line's notes, in quarters from bar 1, or null when the
 * bass isn't edited (or can't be read).
 * @param {ReadBass | null} read the song's bass field, read
 * @returns {import('../instruments/bassline.js').BassNote[] | null}
 */
export function writtenBassNotes(read) {
	return read && !read.problem ? bassNotesOf(read.score) : null;
}

/** @param {import('../melody/roll/readScore.js').Score} score */
function bassNotesOf(score) {
	const barStarts = new Set(score.bars.map((bar) => bar.start));
	return score.notes.map((note) => ({
		beat: note.start / TICKS_PER_QUARTER,
		length: note.length / TICKS_PER_QUARTER,
		gate: WRITTEN_GATE,
		pitch: note.midi,
		velocity: barStarts.has(note.start) ? VELOCITY.downbeat : VELOCITY.other
	}));
}

/** The bass line's voice on the piano roll (also its mixer channel's id). */
export const BASS_VOICE = 'bass';

/**
 * The bass line as a voice the piano roll can draw and edit.
 * @param {ReadBass | null} read the bass line in use (the edited one, else bassAbc.js's generated or blank one)
 * @returns {import('../melody/roll/drawnMelody.js').DrawnVoice | null}
 */
export function bassVoice(read) {
	return read ? { id: BASS_VOICE, name: 'Bass', ...read } : null;
}
