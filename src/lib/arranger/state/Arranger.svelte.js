/**
 * Everything the arranger page knows, in one object, built from small
 * pieces. The page creates one and shares it with its components through
 * context (see context.js), so any component can reach what it needs
 * without passing props down through layers.
 *
 *   arranger.arrangement   the chord chart, tempo, capo, key
 *   arranger.loop          which bars play
 *   arranger.melody        the ABC melody
 *   arranger.player        play/stop, and problems to show
 *   arranger.layout        mixer drawer and phone keypad (what covers the screen)
 *   arranger.song          which song is open; New, Open, Save
 *   arranger.conversionReport  what the last conversion between chart and melody (chords, words) wants you to know
 *   arranger.capoAsked     a capo change waiting for "raise the song or keep its key?"
 */
import { ArrangementState } from './ArrangementState.svelte.js';
import { LoopState } from './LoopState.svelte.js';
import { MelodyState } from './MelodyState.svelte.js';
import { PlayerState } from './PlayerState.svelte.js';
import { PageLayoutState } from './PageLayoutState.svelte.js';
import { SongState } from './SongState.svelte.js';
import { abcWithChords, arrangementFromAbc } from '../melody/abcChords.js';
import { transposeAbc } from '../melody/transposeAbc.js';
import { abcWithWords } from '../melody/words/abcWithWords.js';
import { readLyrics } from '../chart/sectionLyrics.js';
import { harmonizeAbc } from '../melody/harmony/harmonizeAbc.js';
import { harmonyPartsIn } from '../melody/harmony/writeHarmonies.js';
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { concertChordAt } from '../chart/concertChords.js';
import { mixer } from '../playback/mixer.svelte.js';
import { transposeChart } from '../chart/transposeChart.js';
import { validCapo } from '../chart/capo.js';

export class Arranger {
	arrangement = new ArrangementState();
	loop = new LoopState(this.arrangement);
	melody = new MelodyState();
	player = new PlayerState(this.arrangement, this.loop, this.melody);
	layout = new PageLayoutState();
	/** Which song is open, and saving it (created last: it reads all of the above). */
	song = new SongState(this);

	/** @type {{ title: string, notes: string[] } | null} */
	conversionReport = $state(null);

	/** The harmony parts the melody has (their ids, as in HARMONY_PARTS). */
	harmonyParts = $derived(harmonyPartsIn(this.melody.notation));

	/** Why the harmony parts couldn't be written, if they couldn't. */
	harmonyProblem = $state('');

	/** The capo fret asked for, while the page asks what the melody should do (else null). */
	capoAsked = $state(/** @type {number | null} */ (null));

	/** A name for the work: the tune's title, else the first section's name. */
	title = $derived(this.melody.title || this.arrangement.sections[0]?.name || '');

	/**
	 * Replace the arrangement with one written from the melody's chord
	 * symbols (sections from its repeats, a capo that suits the guitar).
	 * Asks first if there's an arrangement to lose.
	 */
	writeArrangementFromMelodyChords() {
		const sequence = this.melody.drawn.sequence;
		const written = sequence ? arrangementFromAbc(sequence) : null;
		if (!written) return;

		const hasArrangement = this.arrangement.text.trim() !== '';
		if (hasArrangement && !confirm('Replace the arrangement with the chords from the melody?'))
			return;

		this.player.stop();
		this.arrangement.text = `\n${written.text}\n`;
		this.arrangement.capo = written.capo;
		this.arrangement.transpose = 0;
		this.loop.loopEverything();

		const withCapo = written.capo ? `, with capo ${written.capo}` : '';
		this.conversionReport = {
			title: `Arrangement written from the melody's chords${withCapo}.`,
			notes: written.notes
		};
	}

	/** Write the arrangement's chords (at concert pitch) into a melody that has none. */
	writeChordsIntoMelody() {
		const sequence = this.melody.drawn.sequence;
		if (!sequence || !this.arrangement.isPlayable) return;

		const result = abcWithChords(this.melody.notation, sequence, this.arrangement.sections, {
			capo: this.arrangement.capoFret
		});
		this.melody.notation = result.abc;
		this.conversionReport = {
			title: "The arrangement's chords are written into the melody.",
			notes: result.notes
		};
	}

	/**
	 * Write the chart's words under the melody's notes (ABC `w:` lines),
	 * replacing any words it had.
	 */
	writeWordsIntoMelody() {
		const { tune, sequence } = this.melody.drawn;
		if (!tune || !sequence || !this.arrangement.isPlayable) return;

		const result = abcWithWords(
			this.melody.notation,
			tune,
			sequence,
			this.arrangement.sections,
			readLyrics(this.arrangement.text)
		);
		this.melody.notation = result.abc;
		this.conversionReport = {
			title: "The chart's words are written under the melody.",
			notes: result.notes
		};
	}

	/**
	 * Write these harmony parts into the melody, fresh from its notes and the
	 * arrangement's chords (any others are taken out).
	 * @param {string[]} partIds
	 */
	async writeHarmonies(partIds) {
		if (!this.arrangement.isPlayable) return;
		const chordAt = concertChordAt(this.arrangement.sections, this.arrangement.capoFret);
		const result = await harmonizeAbc(this.melody.notation, chordAt, partIds);
		this.melody.notation = result.abc;
		this.harmonyProblem = result.problem;
		// A removed part's strip is hidden, so it mustn't stay soloed and silence the rest
		const kept = harmonyPartsIn(result.abc);
		for (const channel of mixer.channels) {
			const removed = HARMONY_PARTS.some(
				(part) => part.id === channel.id && !kept.includes(part.id)
			);
			if (removed) channel.solo = false;
		}
	}

	/**
	 * Move the capo. With no melody it just moves (the song sounds higher or
	 * lower). With one, the melody would no longer match the band, so the page
	 * asks first: raise the song with the capo, or keep its key.
	 * @param {number} fret
	 */
	setCapo(fret) {
		const capo = validCapo(fret);
		if (capo === this.arrangement.capoFret) return;
		if (this.melody.hasNotation) this.capoAsked = capo;
		else this.arrangement.capo = capo;
	}

	/** Same shapes, everything sounds higher or lower: the melody moves with the band. */
	async raiseSongWithCapo() {
		const capo = this.capoAsked;
		if (capo === null) return;
		const semitones = capo - this.arrangement.capoFret;
		this.melody.notation = await transposeAbc(this.melody.notation, semitones);
		this.arrangement.capo = capo;
		this.capoAsked = null;
	}

	/** The song sounds the same: the chart's chords change to the shapes that reach it. */
	keepKeyWithCapo() {
		const capo = this.capoAsked;
		if (capo === null) return;
		const semitones = capo - this.arrangement.capoFret;
		this.arrangement.text = transposeChart(this.arrangement.text, -semitones);
		this.arrangement.capo = capo;
		this.capoAsked = null;
	}

	/** Leave the capo where it was. */
	cancelCapo() {
		this.capoAsked = null;
	}
}
