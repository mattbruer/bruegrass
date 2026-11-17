/**
 * Everything the arranger page knows, in one object, built from small
 * pieces. The page creates one and shares it with its components through
 * context (see context.js), so any component can reach what it needs
 * without passing props down through layers.
 *
 *   arranger.arrangement   the chord chart, tempo, capo, key
 *   arranger.loop          which bars play
 *   arranger.melody        the ABC melody
 *   arranger.bass          the bass line, once it's been edited
 *   arranger.player        play/stop, and problems to show
 *   arranger.layout        mixer drawer and phone keypad (what covers the screen)
 *   arranger.song          which song is open; New, Open, Rename; it saves itself
 *   arranger.recording     recording along with the band, and the song's takes
 *   arranger.receive       a song someone sent (a share link or song file), waiting to be opened
 *   arranger.transcription the Transcribe page's work on a recording (kept while you visit the other pages)
 *   arranger.conversionReport  what the last conversion between chart and melody (chords, words) wants you to know
 *   arranger.capoAsked     a capo change waiting for "raise the song or keep its key?"
 */
import { ArrangementState } from './ArrangementState.svelte.js';
import { LoopState } from './LoopState.svelte.js';
import { MelodyState } from './MelodyState.svelte.js';
import { BassState } from './BassState.svelte.js';
import { PlayerState } from './PlayerState.svelte.js';
import { PageLayoutState } from './PageLayoutState.svelte.js';
import { SongState } from './SongState.svelte.js';
import { RecordingState } from './RecordingState.svelte.js';
import { ReceiveState } from './ReceiveState.svelte.js';
import { TranscriptionState } from '../transcription/TranscriptionState.svelte.js';
import { abcjsIfLoaded, abcjsReady } from './abcjsLoaded.svelte.js';
import { abcWithChords, arrangementFromAbc } from '../melody/abcChords.js';
import { transposeAbc } from '../melody/transposeAbc.js';
import { respellBass } from '../bass/respellBass.js';
import { abcWithWords } from '../melody/words/abcWithWords.js';
import { readLyrics } from '../chart/sectionLyrics.js';
import { harmonyPartsIn, withHarmonies } from '../melody/harmony/writeHarmonies.js';
import { withPartsKept } from '../melody/harmony/keepParts.js';
import { HARMONY_PARTS } from '../melody/harmony/harmonyParts.js';
import { concertChordAt } from '../chart/concertChords.js';
import { mixer } from '../mixer/mixer.svelte.js';
import { transposeChart } from '../chart/transposeChart.js';
import { validCapo } from '../chart/capo.js';
import { withKeyField } from '../chart/keyField.js';
import { respellDrawnMelody } from '../melody/roll/drawnMelody.js';
import { melodyKey } from '../melody/roll/melodyKey.js';
import { blankScoreForSong } from '../melody/roll/scoreFromChart.js';
import { newAbc } from '../melody/roll/scoreToAbc.js';
import { barsInPlayOrder } from '../chart/chartBars.js';
import { sectionInstances } from '../melody/sections/tuneBySection.js';
import { sectionRests } from '../melody/sections/sectionRests.js';
import { hasRepeats, splitTune, unitOfHeader } from '../melody/sections/splitTune.js';
import { splitPlayedOut } from '../melody/sections/playedOut.js';
import { readTuneText, MELODY_VOICE } from '../melody/sections/tuneBySection.js';
import { renamedParts } from '../melody/sections/renamedParts.js';
import { partsFollowingBars, sectionBarKeys } from '../melody/sections/barsFollowChart.js';
import { generatedBassAbc, isAsPlayed } from '../bass/bassAbc.js';
import { bassSongOf } from '../bass/songBassStyle.svelte.js';
import { withWordsFromChart } from '../melody/sections/wordsFromChart.js';
import { tuneReader } from '../melody/abcjs.js';
import { writeBar } from '../melody/roll/writeBar.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';

export class Arranger {
	arrangement = new ArrangementState();
	loop = new LoopState(this.arrangement);
	melody = new MelodyState((tune) => this.#tuneLayout(unitOfHeader(tune.header)));
	bass = new BassState(() => this.#bassLayout());
	player = new PlayerState(this.arrangement, this.loop, this.melody, this.bass);
	/** How many songs have been put on the page: a new one's chart isn't an edit of the last. */
	songsLoaded = $state(0);
	layout = new PageLayoutState();
	/** Which song is open, and saving it (created last: it reads all of the above). */
	song = new SongState(this);
	/** Recording along with the band, and the song's takes. */
	recording = new RecordingState(this);
	/** A song someone sent, waiting to be opened. */
	receive = new ReceiveState(this);
	/** Transcribing a recording: kept while you visit the other pages, so coming back carries on. */
	transcription = new TranscriptionState(this);

	/** @type {{ title: string, notes: string[] } | null} */
	conversionReport = $state(null);

	/** The harmony parts the melody has (their ids, as in HARMONY_PARTS). */
	harmonyParts = $derived(harmonyPartsIn(this.melody.notation));

	/** Why the harmony parts couldn't be written, if they couldn't. */
	harmonyProblem = $state('');

	/** The capo fret asked for, while the page asks what the melody should do (else null). */
	capoAsked = $state(/** @type {number | null} */ (null));

	/** A name for the work: the tune's title, the song's name, else the first section's name. */
	title = $derived(
		this.melody.title ||
			this.song.name ||
			this.song.exampleName ||
			this.arrangement.sections[0]?.name ||
			''
	);

	/**
	 * Replace the arrangement with one written from the melody's chord
	 * symbols (sections from its repeats, a capo that suits the guitar).
	 * Asks first if there's an arrangement to lose.
	 */
	writeArrangementFromMelodyChords() {
		const sequence = this.melody.sequence;
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

	/**
	 * The chart's sections in play order, for a tune kept by section, and
	 * the rests (with the chart's chords) a section with no tune yet plays.
	 * @param {number} unit ticks in the tune's unit note length
	 */
	#tuneLayout(unit) {
		const { arrangement } = this;
		const bars = arrangement.readError ? [] : barsInPlayOrder(arrangement.sections);
		const song = {
			songKey: arrangement.key,
			capo: arrangement.capoFret,
			spelling: this.melodyKey.spelling,
			unit
		};
		const abcjs = abcjsIfLoaded();
		const instances = sectionInstances(arrangement.text);
		const meter = bars[0]?.meter?.split('/').map(Number) ?? [4, 4];
		return {
			instances,
			pickupRests: (/** @type {number} */ quarters) => {
				const length = quarters * TICKS_PER_QUARTER;
				const bar = {
					start: 0,
					length,
					meter: { num: meter[0], den: meter[1] },
					from: null,
					to: null
				};
				const rest = [{ start: 0, length, midis: [], tie: false, chord: null }];
				return `${writeBar(bar, rest, { key: song.spelling, unit, pickup: true })} |`;
			},
			reading: abcjs
				? {
						parse: tuneReader(abcjs),
						barCounts: instances.map(
							(_, index) => bars.filter((bar) => bar.section === index).length
						)
					}
				: null,
			restsFor: (/** @type {number} */ index) =>
				sectionRests(
					bars.filter((bar) => bar.section === index),
					song
				),
			withWords: (/** @type {string} */ abc) =>
				withWordsFromChart(
					abc,
					abcjsIfLoaded(),
					arrangement.readError ? [] : arrangement.sections,
					readLyrics(arrangement.text)
				)
		};
	}

	/**
	 * The band's own bass line, read by section: what a section of a bass
	 * line kept by section plays while nobody has edited it.
	 */
	#bassLayout() {
		const { arrangement } = this;
		const instances = sectionInstances(arrangement.text);
		const own = this.#bandsOwnBass();
		const bodies = (own?.sections ?? [])
			.filter((section) => section.voice === MELODY_VOICE)
			.map((section) => section.body);
		return { instances, restsFor: (/** @type {number} */ index) => bodies[index] ?? '' };
	}

	/** The band's own bass line, read as voices and sections (null: the chart can't be played). */
	#bandsOwnBass() {
		if (!this.arrangement.isPlayable) return null;
		return readTuneText(generatedBassAbc(bassSongOf(this)));
	}

	/**
	 * Keep the tune by section: cut the whole tune at the chart's sections,
	 * so each section owns its bars from now on.
	 * @returns {Promise<string>} why it couldn't be ('' when it was)
	 */
	async splitTuneIntoSections() {
		await abcjsReady();
		const { melody, arrangement } = this;
		// A transcription's tune follows the recording bar for bar: arranging it is a new song
		if (melody.bySection || this.song.recording) return '';
		if (!arrangement.isPlayable) return 'Fix the chart first.';
		if (!melody.tune) return 'There is no tune to split yet.';
		const instances = sectionInstances(arrangement.text);
		const barCounts = arrangement.sections.map((section) => section.measures.length);
		const { tune, problem } = hasRepeats(melody.notation)
			? this.#splitPlayedOut(instances)
			: splitTune(melody.notation, melody.tune, instances, barCounts);
		if (!tune) return `The tune can't be split: ${problem}`;
		melody.bySection = tune;
		this.#splitBass();
		return '';
	}

	/**
	 * The tune's repeats and endings played out, then cut into sections.
	 * @param {import('../melody/sections/tuneBySection.js').SectionInstance[]} instances
	 */
	#splitPlayedOut(instances) {
		const { melody, arrangement } = this;
		if (!melody.line) return { tune: null, problem: 'It has no notes to play.' };
		return splitPlayedOut(
			melody.notation,
			melody.tune,
			melody.line,
			instances,
			barsInPlayOrder(arrangement.sections),
			{ songKey: arrangement.key, capo: arrangement.capoFret, spelling: this.melodyKey.spelling }
		);
	}

	/** The bass line by section too, unless it was written by ear from nothing. */
	#splitBass() {
		const own = this.#bandsOwnBass();
		if (!own || this.bass.bySection || isAsPlayed(this.bass.notation)) return;
		this.bass.split(own.header);
	}

	/**
	 * A section renamed in the chart keeps its tune and bass line.
	 * @param {import('../melody/sections/tuneBySection.js').SectionInstance[]} before the chart's sections before the edit
	 */
	followRenames(before) {
		const after = sectionInstances(this.arrangement.text);
		for (const kept of [this.melody, this.bass]) {
			const line = kept.bySection;
			const parts = line && renamedParts(before, after, line.parts);
			const pickups = line && renamedParts(before, after, line.pickups);
			if (line && (parts || pickups))
				kept.bySection = { ...line, parts: parts ?? line.parts, pickups: pickups ?? line.pickups };
		}
	}

	/**
	 * Bars added to or removed from a section in the chart: its tune and bass
	 * line (kept by section) gain or lose the same bars.
	 * @param {Record<string, string[]>} before each section's bars before the edit (sectionBarKeys)
	 */
	followBars(before) {
		if (this.arrangement.readError) return;
		const after = sectionBarKeys(
			this.arrangement.sections,
			sectionInstances(this.arrangement.text)
		);
		for (const kept of [this.melody, this.bass]) {
			const line = kept.bySection;
			const parts =
				line && partsFollowingBars(line.parts, before, after, (name) => kept.emptyBars(name));
			if (line && parts) kept.bySection = { ...line, parts };
		}
	}

	/** What the melody's words and harmony parts are written from. */
	songForMelody() {
		return {
			sections: this.arrangement.isPlayable ? this.arrangement.sections : [],
			lyrics: readLyrics(this.arrangement.text),
			capo: this.arrangement.capoFret
		};
	}

	/** The melody's key (concert: the song's key moved by the capo). */
	melodyKey = $derived(melodyKey(this.arrangement.key, this.arrangement.capoFret));

	/**
	 * Name the song's key (the chart's [K:]), or go back to the first chord's
	 * guess with null. The melody, its harmony parts and an edited bass line
	 * keep their pitches, spelled in the new key,
	 * so the strip, the chord names and the sheet music all agree.
	 * @param {string | null} name the key of the guitar's shapes, e.g. "G", "Em"
	 */
	async nameSongKey(name) {
		await abcjsReady();
		this.arrangement.text = withKeyField(this.arrangement.text, name);
		this.#respellMelody();
		this.#respellBass();
	}

	#respellMelody() {
		const { notation, voices } = this.melody;
		if (!voices || voices.some((voice) => voice.problem)) return;
		this.melody.notation = respellDrawnMelody(notation, voices, this.melodyKey);
	}

	#respellBass() {
		const { notation, read } = this.bass;
		this.bass.notation = respellBass(notation, read, this.melodyKey);
	}

	/**
	 * Start a tune from the chart: header, then every bar resting, with its chords.
	 * @param {number} [pickupQuarters] a short first bar this long (0: none)
	 */
	startMelodyFromChart(pickupQuarters = 0) {
		if (this.melody.hasNotation || !this.arrangement.isPlayable) return;
		const { score, lineStarts } = blankScoreForSong(this, pickupQuarters);
		this.melody.notation = newAbc(score, [], {
			title: this.title,
			keyText: this.melodyKey.keyText,
			lineStarts
		});
		this.splitTuneIntoSections();
	}

	/** Write the arrangement's chords (at concert pitch) into a melody that has none. */
	writeChordsIntoMelody() {
		const sequence = this.melody.sequence;
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
		const { tune, sequence } = this.melody;
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
	 * Have exactly these harmony parts. A part the melody already has stays
	 * as it is (hand edits and all); a new one is written from the melody
	 * and the arrangement's chords. `fresh` writes every part again.
	 * @param {string[]} partIds
	 * @param {{ fresh?: boolean }} [options]
	 */
	async writeHarmonies(partIds, { fresh = false } = {}) {
		if (!this.arrangement.isPlayable) return;
		await abcjsReady();
		const { notation: before, tune } = this.melody;
		const chordAt = concertChordAt(this.arrangement.sections, this.arrangement.capoFret);
		const result = tune
			? withHarmonies(before, tune, chordAt, partIds)
			: { abc: before, problem: 'The melody has no music to harmonise.' };
		const unchanged = fresh ? [] : harmonyPartsIn(before).filter((id) => partIds.includes(id));
		this.melody.notation = withPartsKept(result.abc, before, unchanged);
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
	 * Move the capo. The page asks first: raise the song with the capo (same
	 * shapes), or keep its key (new shapes). A chart with no chords yet has
	 * no key to keep, so the capo just moves.
	 * @param {number} fret
	 */
	setCapo(fret) {
		const capo = validCapo(fret);
		if (capo === this.arrangement.capoFret) return;
		if (this.arrangement.key) this.capoAsked = capo;
		else this.#moveCapoWithBass(capo);
	}

	/**
	 * Move the capo, everything sounding higher or lower: an edited bass line
	 * moves with it, in the same step, so it still fits the chart.
	 * @param {number} capo
	 */
	async #moveCapoWithBass(capo) {
		const semitones = capo - this.arrangement.capoFret;
		if (this.bass.isWritten) this.bass.notation = await transposeAbc(this.bass.notation, semitones);
		this.arrangement.capo = capo;
	}

	/** Same shapes, everything sounds higher or lower: the melody moves with the band. */
	async raiseSongWithCapo() {
		const capo = this.capoAsked;
		if (capo === null) return;
		const semitones = capo - this.arrangement.capoFret;
		if (this.melody.hasNotation) {
			this.melody.notation = await transposeAbc(this.melody.notation, semitones);
		}
		await this.#moveCapoWithBass(capo);
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
