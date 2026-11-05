/**
 * Read a drawn ABC tune into the melody's notes, or explain what's wrong.
 */
import { melodyFromTune } from './melody.js';

/**
 * @param {import('abcjs').TuneObject | null} tune from drawSheetMusic
 * @returns {{ line: import('./melody.js').Melody | null, error: string }}
 *   line is null when there's no tune, or it has no notes to play
 */
export function readMelody(tune) {
	if (!tune) return { line: null, error: '' };

	try {
		const line = melodyFromTune(tune);
		const hasNotes = line.notes.length > 0;
		return { line: hasNotes ? line : null, error: '' };
	} catch (problem) {
		return { line: null, error: problem instanceof Error ? problem.message : String(problem) };
	}
}
