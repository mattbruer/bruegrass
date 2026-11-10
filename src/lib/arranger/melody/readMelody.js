/**
 * Read a drawn ABC tune into the melody's notes, or explain what's wrong.
 */
import { melodyFromTune } from './melody.js';

/**
 * @param {import('abcjs').TuneObject | null} tune from drawSheetMusic
 * @returns {{ line: import('./melody.js').Melody | null, pickup: number, error: string }}
 *   line is null when there's no tune, or it has no notes to play; pickup is
 *   still known for a tune of only rests, so the sheet music can follow it
 */
export function readMelody(tune) {
	if (!tune) return { line: null, pickup: 0, error: '' };

	try {
		const line = melodyFromTune(tune);
		const hasNotes = line.notes.length > 0;
		return { line: hasNotes ? line : null, pickup: line.pickup, error: '' };
	} catch (problem) {
		return {
			line: null,
			pickup: 0,
			error: problem instanceof Error ? problem.message : String(problem)
		};
	}
}
