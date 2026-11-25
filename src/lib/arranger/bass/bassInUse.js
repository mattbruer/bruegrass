/**
 * The bass line in use, as ABC: the song's edited one, else the band's own
 * written from its chart (bassAbc.js). The piano roll edits this, and
 * Transcribe's Bass lane shows it.
 */
import { blankBassAbc, generatedBassAbc } from './bassAbc.js';
import { bassSongOf } from './bassSong.js';

/**
 * @param {{ arrangement: any, melodyKey: any, bass: { notation: string } }} arranger
 * @param {{ startsEmpty?: boolean }} [options] startsEmpty: an unedited line starts blank, to write by ear
 * @returns {string}
 */
export function bassAbcInUse(arranger, { startsEmpty = false } = {}) {
	const written = arranger.bass.notation;
	if (written.trim()) return written;
	const song = bassSongOf(arranger);
	return startsEmpty ? blankBassAbc(song) : generatedBassAbc(song);
}
