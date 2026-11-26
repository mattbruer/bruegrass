/**
 * The chart a new song starts with: its time signature and key named before
 * the first bar, so both are written down from the start (Key and capo move
 * away from the key, never change it), the key's own chord in bar 1, and
 * bars of N.C. to write chords over.
 */
import { NO_CHORD } from './noChord.js';

const FIRST_SECTION = 'Verse';
const BARS = 16;

/**
 * @param {{ key: string, time: string }} start key e.g. "G", "Em" (its name is also its own chord); time e.g. "3/4"
 */
export function newChart({ key, time }) {
	const bars = [key, ...Array(BARS - 1).fill(NO_CHORD)];
	return `\n"${FIRST_SECTION}" [M:${time}] [K:${key}] |${bars.join('|')}|\n`;
}
