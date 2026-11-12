/**
 * The arrangement being worked on: the chord chart text and the player
 * settings that go with it (tempo, capo, key), plus everything worked out
 * from them.
 */
import { readArrangement } from '../chart/readArrangement.js';
import { chordLabel, songKey } from '../chart/key.js';
import { keyChoicesFor } from '../chart/keyChoices.js';
import { TEMPO_DEFAULT, validTempo } from '../chart/tempo.js';
import { validCapo } from '../chart/capo.js';
import { chartAnalysis, functionOnItsOwn, placeId } from '../chart/chartAnalysis.js';
import { setMark } from '../chart/analysisMarks.js';
import { settings } from '$lib/settings/settings.svelte.js';
import { STARTER_SONG } from '../starterSong.js';

export class ArrangementState {
	/** The chord chart as typed (see chart/parseArrangement.js for the format). */
	text = $state(STARTER_SONG.arrangement);
	/** Beats per minute, as typed (tidied by tidyTempo when you leave the field). */
	tempo = $state(TEMPO_DEFAULT);
	/** Capo fret, 0 = none. */
	capo = $state(0);
	/** Semitones up or down from the written key, for a singer (the Key menu). */
	transpose = $state(0);

	/** The text read into sections, or why it can't be. */
	#read = $derived(readArrangement(this.text));
	sections = $derived(this.#read.sections);
	error = $derived(this.#read.error);
	isPlayable = $derived(this.error === '' && this.sections.length > 0);

	bpm = $derived(Number(this.tempo) || TEMPO_DEFAULT);
	capoFret = $derived(validCapo(this.capo));
	/** How far the sound is from the chords as written: capo plus key change. */
	pitchShift = $derived(this.capoFret + this.transpose);

	/** The song's key: the chart's [K:], else its first chord (null while there are no chords). */
	key = $derived(songKey(this.sections));
	keyChoices = $derived(keyChoicesFor(this.key, this.capoFret));
	/** Every chord's function, worked out from where it goes, with your own marks. */
	analysis = $derived(chartAnalysis(this.sections, this.key));

	/** Tidy the typed tempo into a whole number in range. */
	tidyTempo() {
		this.tempo = validTempo(this.tempo);
	}

	/**
	 * How to show a chord, following the Chord display setting (shapes,
	 * concert, roman, nashville, function). Reading it in a template keeps
	 * it current. Function needs to know which chord of the chart it is.
	 * @param {string} chord as written
	 * @param {import('../chart/chartAnalysis.js').ChordPlace} [place]
	 */
	chordName = (chord, place) => {
		if (settings.chordDisplay !== 'function') {
			return chordLabel(chord, {
				key: this.key,
				shift: this.pitchShift,
				mode: settings.chordDisplay
			});
		}
		const found = place && this.analysis.get(placeId(place));
		return found ? (found.mark ?? found.label) : functionOnItsOwn(chord, this.key);
	};

	/**
	 * Write your own analysis of a chord into the chart, or null to go back
	 * to the worked-out one.
	 * @param {import('../chart/chartAnalysis.js').ChordPlace} place
	 * @param {string | null} mark
	 */
	markChord(place, mark) {
		this.text = setMark(this.text, place, mark);
	}
}
