/**
 * The open song's bass style (instruments/bassStyles.js): part of the song,
 * saved and shared with it (state/songFields.js), like the mix. The band's
 * own line is written in two places, bassPart (playback, export, MIDI,
 * tracks) and generatedBassAbc (the piano roll); they take the style as a
 * parameter, and the app's edges pass chosenBassStyle() from here.
 * Read inside an effect or $derived, a change of style rewrites the line.
 */
import { bassStyle, DEFAULT_BASS_STYLE } from '../instruments/bassStyles.js';

/** @typedef {import('./bassAbc.js').BassSong} BassSong */

export const songBassStyle = $state({ id: DEFAULT_BASS_STYLE });

export function chosenBassStyle() {
	return bassStyle(songBassStyle.id);
}

/**
 * What the bass is written from, for the open song.
 * @param {{
 *   arrangement: { sections: any[], key: any, capoFret: number },
 *   melodyKey: BassSong['melodyKey'],
 *   melody: { line: BassSong['tune'] }
 * }} arranger
 * @param {BassSong['tune']} [tune] the tune to fit the walks around (default: the open one)
 * @returns {BassSong}
 */
export function bassSongOf({ arrangement, melodyKey, melody }, tune = melody.line) {
	return {
		sections: arrangement.sections,
		songKey: arrangement.key,
		capo: arrangement.capoFret,
		melodyKey,
		tune,
		style: chosenBassStyle()
	};
}
