/**
 * Play a scale up, one note after another on the audio clock, on the
 * Melody channel's instrument (the chord tutor's "Hear it").
 */
import { auditionNote } from './auditionNote.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';

/** Seconds from one note to the next. */
const STEP_SECONDS = 0.28;
/** A moment to load the samples before the first note. */
const LEAD_IN_SECONDS = 0.3;

/**
 * @param {number[]} pitches written (concert) MIDI notes, in order
 * @param {number} shift semitones (the Key setting), as the band plays it
 */
export async function auditionScale(pitches, shift) {
	const Tone = await import('tone');
	await Tone.start();
	const start = Tone.now() + LEAD_IN_SECONDS;
	await Promise.all(
		pitches.map((pitch, i) => auditionNote(pitch, shift, MELODY_CHANNEL, start + i * STEP_SECONDS))
	);
}
