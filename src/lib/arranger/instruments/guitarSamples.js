/**
 * The band's guitar samples as a tune instrument: each note played from
 * the string and fret that has it, as low on the neck as it goes (the
 * highest string whose open note is at or below it).
 */
import { OPEN_MIDI, MAX_FRET, sampleUrl } from './guitar.js';

/** Every note the samples cover, low E open to the high e's top fret. */
export const BAND_GUITAR_NOTES = Array.from(
	{ length: OPEN_MIDI[OPEN_MIDI.length - 1] + MAX_FRET - OPEN_MIDI[0] + 1 },
	(_, i) => OPEN_MIDI[0] + i
);

/** @param {number} midi */
export function bandGuitarSampleUrl(midi) {
	const string = OPEN_MIDI.findLastIndex((open) => open <= midi);
	return sampleUrl(Math.max(0, string), midi - OPEN_MIDI[Math.max(0, string)]);
}
