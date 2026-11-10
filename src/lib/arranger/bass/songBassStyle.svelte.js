/**
 * The open song's bass style (instruments/bassStyles.js): part of the song,
 * saved and shared with it (state/songFields.js), like the mix. The band's
 * own line is written in two places, bassPart (playback, export, MIDI,
 * tracks) and generatedBassAbc (the piano roll), and both ask here.
 * Read inside an effect or $derived, a change of style rewrites the line.
 */
import { bassStyle, DEFAULT_BASS_STYLE } from '../instruments/bassStyles.js';

export const songBassStyle = $state({ id: DEFAULT_BASS_STYLE });

export function chosenBassStyle() {
	return bassStyle(songBassStyle.id);
}
