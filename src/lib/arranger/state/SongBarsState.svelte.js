/**
 * Bars taken out of the whole song, or empty bars put in, as Logic cuts
 * and inserts time between its locators (here, the cycle): the chart (with
 * its words), the tune and the bass line (kept by section), the guitar's
 * and mandolin's changes, the tempo lane and the audio lanes' clips all
 * move together, as one step Undo takes back. Everything else on the song's
 * time follows by itself (the band's own parts, section markers).
 *
 * Refused, with why, where something can't follow exactly: bars a section
 * plays again `as` another, the pickup, a tune or bass line that can't be
 * kept by section (a transcription's, one written by ear for the whole
 * song) or isn't written bar for bar with the chart.
 */
import { rulerBars } from '../tracks/ruler.js';
import { pickedBars } from '../songBars/pickedBars.js';
import { chartWithEmptyBars, chartWithoutBars } from '../songBars/chartBars.js';
import { partsWithBars, partsWithoutBars } from '../songBars/partsBars.js';
import { cutAlong, insertAlong, keyedAlong, pointsAlong } from '../songBars/alongTime.js';
import { clipsWithTime, clipsWithoutTime } from '../songBars/clipsAlong.js';
import { splitBars } from '../melody/sections/barsFollowChart.js';
import { writeWrittenChart } from '../chart/writtenChart.js';
import { clipsOfTrack } from '../takes/clips.js';
import { stretchOf } from '../takes/takeTempo.js';
import { RECORD_TRACKS } from '../takes/recordTracks.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { concertChordAt } from '../chart/concertChords.js';
import { abcjsReady } from './abcjsLoaded.svelte.js';

/**
 * @typedef {import('../melody/sections/tuneBySection.js').TuneBySection} TuneBySection
 * @typedef {{ bySection: TuneBySection | null, notation: string }} KeptLine
 * @typedef {(take: import('$lib/storage/songTakes.js').TakeDocument) => { from: number, to: number }} TakeSpan
 */

export class SongBarsState {
	#arranger;

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	#ruler() {
		const { arrangement, player } = this.#arranger;
		return rulerBars(arrangement.sections, player.songStart);
	}

	/**
	 * Why these bars can't be taken out or have bars put in before them ('' when they can).
	 * @param {number} first bar number
	 * @param {number} last
	 */
	problem(first, last) {
		const { arrangement } = this.#arranger;
		if (!arrangement.isPlayable) return 'Fix the chart first.';
		return pickedBars(this.#ruler(), arrangement.written, first, last).problem;
	}

	/**
	 * Take these bars out of the whole song, pulling the rest in.
	 * @param {number} first bar number
	 * @param {number} last
	 * @returns {Promise<string>} why it couldn't be done ('' when it was)
	 */
	async takeOut(first, last) {
		const ready = await this.#readyToEdit(first, last);
		if (typeof ready === 'string') return ready;
		const { picked } = ready;
		const { arrangement, melody, bass } = this.#arranger;
		const barCount = this.#barCounter();
		const tune = melody.bySection
			? partsWithoutBars(melody.bySection.parts, picked.sections, barCount, 'The tune')
			: null;
		const line = bass.bySection
			? partsWithoutBars(bass.bySection.parts, picked.sections, barCount, 'The bass line')
			: null;
		const problem = tune?.problem || line?.problem;
		if (problem) return problem;

		const { from, to } = picked;
		const along = cutAlong(from, to);
		const count = last - first + 1;
		this.#edit(
			() => {
				arrangement.text = writeWrittenChart(
					chartWithoutBars(arrangement.written, picked.sections)
				);
				withParts(melody, tune?.parts);
				withParts(bass, line?.parts);
				this.#moveAlong(along, clipsWithoutTime, this.#takeSpan(from, to));
			},
			{
				label: `Take out ${count === 1 ? 'a bar' : `${count} bars`}`,
				where: { wholeSong: true, lanes: this.#lanes(), spans: [{ from, to }] }
			}
		);
		return '';
	}

	/**
	 * Put as many empty bars as these in before them, pushing the rest of the song later.
	 * @param {number} first bar number
	 * @param {number} last
	 * @returns {Promise<string>} why it couldn't be done ('' when it was)
	 */
	async insertBefore(first, last) {
		const ready = await this.#readyToEdit(first, first);
		if (typeof ready === 'string') return ready;
		const { picked } = ready;
		const { arrangement, melody, bass } = this.#arranger;
		const count = last - first + 1;
		const { section, name, bars } = picked.sections[0];
		const place = { section, bar: bars[0] };
		const before = this.#barCounter()(name);

		const length = this.#lengthOf(first, last);
		const { from } = picked;
		const lines = /** @type {const} */ ([
			[melody, 'The tune'],
			[bass, 'The bass line']
		]);
		for (const [kept, what] of lines) {
			const problem =
				kept.bySection && partsWithBars(kept.bySection.parts, name, 0, [], before, what).problem;
			if (problem) return problem;
		}
		const chart = writeWrittenChart(chartWithEmptyBars(arrangement.written, place, count));
		this.#edit(
			() => {
				arrangement.text = chart;
				// The new bars' rests are what the section plays with nothing written, read from the chart now
				for (const [kept, what] of lines) {
					if (!kept.bySection) continue;
					const rests = splitBars(kept.emptyBars(name)).slice(place.bar, place.bar + count);
					const grown = partsWithBars(kept.bySection.parts, name, place.bar, rests, before, what);
					withParts(kept, grown.parts ?? undefined);
				}
				this.#moveAlong(
					insertAlong(from, length),
					clipsWithTime,
					this.#takeSpan(from, from + length)
				);
			},
			{
				label: `Insert ${count === 1 ? 'an empty bar' : `${count} empty bars`}`,
				where: { wholeSong: true, lanes: this.#lanes(), spans: [{ from, to: from + length }] }
			}
		);
		return '';
	}

	/**
	 * One step Undo takes back: the change, then what follows the chart
	 * (the tune's chord symbols, the generated lines) brought along at once,
	 * so the step ends as the song settles.
	 * @param {() => void} change
	 * @param {import('./EditHistory.svelte.js').About} about
	 */
	#edit(change, about) {
		const arranger = this.#arranger;
		const chordsBefore = concertChordAt(arranger.arrangement.sections);
		arranger.history.edit(() => {
			change();
			arranger.followChords();
			arranger.harmonyFollowsChords(chordsBefore);
		}, about);
	}

	/**
	 * Check, then keep the tune and bass line by section so they can follow bar for bar.
	 * @param {number} first
	 * @param {number} last
	 * @returns {Promise<string | { picked: import('../songBars/pickedBars.js').PickedBars }>} why not, or the bars
	 */
	async #readyToEdit(first, last) {
		await abcjsReady();
		const problem = this.problem(first, last);
		if (problem) return problem;
		const arranger = this.#arranger;
		const { melody, bass } = arranger;
		if (melody.hasNotation && !melody.bySection) {
			const why = await arranger.splitTuneIntoSections();
			if (why) return why;
			if (!melody.bySection)
				return 'This tune follows its recording bar for bar: change its bars on Transcribe.';
		}
		if (bass.isWritten && !bass.bySection) arranger.splitBassIntoSections();
		if (bass.isWritten && !bass.bySection)
			return 'The bass line was written by ear for the whole song, so it can’t follow: change it in the piano roll.';
		const { picked } = pickedBars(this.#ruler(), arranger.arrangement.written, first, last);
		return picked ? { picked } : 'Those bars can’t be found in the chart.';
	}

	/**
	 * Move what's saved by where it plays: the guitar's and mandolin's changes, the tempo lane, the clips.
	 * @param {import('../songBars/alongTime.js').Along} along
	 * @param {typeof clipsWithoutTime} clipsEdit
	 * @param {TakeSpan} span
	 */
	#moveAlong(along, clipsEdit, span) {
		const { song, arrangement, recording } = this.#arranger;
		song.guitarChords = keyedAlong(song.guitarChords, along);
		song.chops = keyedAlong(song.chops, along);
		arrangement.tempoCurve = pointsAlong(arrangement.tempoCurve, along);
		/** @type {import('../takes/clips.js').EditedLanes} */
		const clips = { ...song.audioClips };
		for (const track of RECORD_TRACKS) {
			const playing = clipsOfTrack(track.id, song.audioClips, recording.takes);
			if (playing.length > 0) clips[track.id] = clipsEdit(playing, span);
		}
		song.audioClips = clips;
	}

	/**
	 * Bars of the song (quarters) in each take's own time, at the tempo now.
	 * @param {number} from
	 * @param {number} to
	 * @returns {TakeSpan}
	 */
	#takeSpan(from, to) {
		const { arrangement } = this.#arranger;
		const { clock, bpm } = arrangement;
		return (take) => ({
			from: clock.secondsAt(from) / stretchOf(take, bpm),
			to: clock.secondsAt(to) / stretchOf(take, bpm)
		});
	}

	/**
	 * How long these bars are (quarters).
	 * @param {number} first
	 * @param {number} last
	 */
	#lengthOf(first, last) {
		const bars = this.#ruler().filter((bar) => bar.number >= first && bar.number <= last);
		return bars.reduce((sum, bar) => sum + bar.beats, 0);
	}

	/** How many bars each section has in the chart as written now. */
	#barCounter() {
		const { written } = this.#arranger.arrangement;
		return (/** @type {string} */ name) =>
			written.sections.find((section) => section.name === name)?.bars.length ?? 0;
	}

	/** Every virtual's lane: the whole song moved under them. */
	#lanes() {
		const voices = this.#arranger.melody.voices ?? [];
		return [...voices.map((voice) => voice.id), BASS_VOICE];
	}
}

/**
 * @param {KeptLine} kept the tune or the bass line
 * @param {TuneBySection['parts'] | null | undefined} parts
 */
function withParts(kept, parts) {
	if (kept.bySection && parts) kept.bySection = { ...kept.bySection, parts };
}
