/**
 * A part's notes written into the song: the bass into its own line (the
 * band's own written out with the change, the first time), any other part
 * into the tune, its words and generated lines brought along
 * (drawnMelody.js).
 */
import { BASS_VOICE } from '../bass/readBass.js';
import { bassAbcInUse } from '../bass/bassInUse.js';
import { rewriteAbc } from '../melody/roll/scoreToAbc.js';
import { writeDrawnMelody } from '../melody/roll/drawnMelody.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';

/**
 * @param {import('./Arranger.svelte.js').Arranger} arranger
 * @param {import('../melody/roll/drawnMelody.js').DrawnVoice} voice the part as it's read now
 * @param {import('../melody/roll/editNotes.js').DrawnNote[]} notes
 * @param {{ bassStartsEmpty?: boolean }} [options] an unwritten bass starts empty (Transcribe)
 */
export function writeVoiceNotes(arranger, voice, notes, { bassStartsEmpty = false } = {}) {
	if (voice.problem) return;
	if (voice.id === BASS_VOICE) {
		const abc = bassAbcInUse(arranger, { startsEmpty: bassStartsEmpty });
		arranger.bass.notation = rewriteAbc(abc, voice.score, notes);
		return;
	}
	const { melody } = arranger;
	melody.notation = writeDrawnMelody({
		abc: melody.notation,
		voice: voice.id,
		score: voice.score,
		notes,
		song: arranger.songForMelody(),
		abcjs: abcjsIfLoaded()
	});
}
