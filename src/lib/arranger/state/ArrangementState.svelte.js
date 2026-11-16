/**
 * The arrangement being worked on: the chord chart text and the player
 * settings that go with it (tempo, capo, key), plus everything worked out
 * from them.
 */
import { readArrangement } from '../chart/readArrangement.js';
import { chordLabel, songKey, validChordDisplay } from '../chart/key.js';
import { keyChoicesFor } from '../chart/keyChoices.js';
import { TEMPO_DEFAULT, validTempo } from '../chart/tempo.js';
import { validCapo } from '../chart/capo.js';
import { chartAnalysis, functionOnItsOwn, placeId } from '../chart/chartAnalysis.js';
import { setMark } from '../chart/analysisMarks.js';
import { unknownChordProblem } from '../chart/knownChords.js';
import { myChords } from '../voicings/myChords.svelte.js';
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
	/** Why the chart can't be read ('' when it can). */
	readError = $derived(this.#read.error);
	/** Why the chart can't be played: it can't be read, or a chord isn't one the band knows. */
	error = $derived.by(() => {
		void myChords.all; // a shape added under My chords makes its chord known
		return this.readError || unknownChordProblem(this.sections);
	});
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

	/** How chords are shown (a saved setting, checked: a display can be retired). */
	chordDisplay = $derived(validChordDisplay(settings.chordDisplay));

	/**
	 * How to show a chord, following the Chord display setting (shapes,
	 * concert, roman, nashville). Reading it in a template keeps it current.
	 * Roman is the function analysis, which needs to know which chord of
	 * the chart it is.
	 * @param {string} chord as written
	 * @param {import('../chart/chartAnalysis.js').ChordPlace} [place]
	 */
	chordName = (chord, place) => {
		if (this.chordDisplay !== 'roman') {
			return chordLabel(chord, { key: this.key, shift: this.pitchShift, mode: this.chordDisplay });
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
