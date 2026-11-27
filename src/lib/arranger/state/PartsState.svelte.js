/**
 * The song's parts as lanes, wherever they're shown (Tracks, Transcribe):
 * adding a part to write (+ Inst, + Lane), harmony lines generated from a
 * lane, copying a generated line to a part of your own to change, naming
 * any lane, taking an added part away or making it the bass line, and the
 * order the lanes are in. Names and order are saved with the song
 * (`song.partNames`, `song.laneOrder`).
 */
import { abcjsReady } from './abcjsLoaded.svelte.js';
import {
	isGenerated,
	withLeadHarmonies,
	withoutPartsFrom,
	withPartsWritten
} from '../melody/harmony/generatedParts.js';
import { withBarsKept } from '../melody/harmony/keptBars.js';
import { MELODY_CHANNEL } from '../melody/harmony/partChannels.js';
import { concertChordAt } from '../chart/concertChords.js';
import { defaultTuneInstrument } from '../instruments/tuneInstruments.js';
import { withKeptBarsFrom, withPartBars } from '../melody/roll/freshHarmonyBars.js';
import { tuneReader } from '../melody/abcjs.js';
import {
	isExtraPart,
	nextExtraPart,
	withExtraPart,
	withoutExtraPart,
	withVoiceCopied
} from '../melody/extraParts.js';
import {
	PART_NAME_LENGTH,
	namesWithGenerated,
	partName,
	withPartName
} from '../melody/partNames.js';
import { rewriteAbc } from '../melody/roll/scoreToAbc.js';
import { TICKS_PER_QUARTER } from '../melody/roll/ticks.js';
import { BASS_VOICE } from '../bass/readBass.js';
import { blankBassAbc } from '../bass/bassAbc.js';
import { bassSongOf } from '../bass/bassSong.js';
import { mixer } from '../mixer/mixer.svelte.js';

export class PartsState {
	#arranger;

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/** Room for another part: the tune has a free extra part (melody/extraParts.js). */
	canAdd = $derived(nextExtraPart(this.#arranger.melody.notation) !== null);

	/** Every lane's name: yours, else its own; a generated line's from its lead's ("Vocal above"). */
	names = $derived(
		namesWithGenerated(this.#arranger.song.partNames, this.#arranger.melody.generated)
	);

	/** Why harmony lines couldn't be generated, if they couldn't (and from which lane). */
	harmonyProblem = $state({ lead: '', problem: '' });

	/**
	 * The harmony parts generated from a lane (harmony/harmonyParts.js ids).
	 * @param {string} lead
	 */
	harmonyOf(lead) {
		return this.#arranger.melody.generated
			.filter((part) => part.lead === lead)
			.map((part) => part.sings);
	}

	/**
	 * Have exactly these harmony lines generated from a lane: one it has
	 * stays as it is (`fresh`: written again, all but its locked bars), a new one gets a lane of its
	 * own, named for its lead ("Fiddle above", partNames.js) and played on the lead's
	 * instrument (the melody's lines on each part's own), one not asked for goes.
	 * @param {string} lead the melody or an added part
	 * @param {string[]} sings harmony part ids
	 * @param {{ fresh?: boolean }} [options]
	 */
	async harmonise(lead, sings, { fresh = false } = {}) {
		const { arrangement, melody } = this.#arranger;
		if (!arrangement.isPlayable) return;
		await abcjsReady();
		const tune = melody.tune;
		const chordAt = concertChordAt(arrangement.sections);
		const result = tune
			? withLeadHarmonies(melody.notation, tune, chordAt, lead, sings, { fresh })
			: { abc: '', added: [], removed: [], problem: 'There’s no music to harmonise yet.' };
		this.harmonyProblem = { lead, problem: result.problem };
		if (result.problem) return;
		const rewritten = melody.generated.filter((part) => part.lead === lead).map((part) => part.id);
		melody.notation = fresh
			? withKeptBarsFrom(result.abc, melody.notation, tuneReader(await abcjsReady()), rewritten)
			: result.abc;
		for (const part of result.added) {
			const instrument =
				lead === MELODY_CHANNEL ? defaultTuneInstrument(part.sings) : channelOf(lead)?.instrument;
			const channel = channelOf(part.id);
			if (channel && instrument) channel.instrument = instrument;
		}
		for (const id of result.removed) this.#letGo(id);
	}

	/**
	 * Another line of the tune to write (the vocal, a mandolin break), named
	 * by you, its bars empty, with its own channel and instrument. An
	 * unwritten tune is started from the chart first.
	 * @param {string} name
	 * @returns {Promise<string | null>} the new part's id (null: no room)
	 */
	async add(name) {
		await abcjsReady();
		const { melody } = this.#arranger;
		if (!melody.hasNotation) this.#arranger.startMelodyFromChart();
		const part = nextExtraPart(melody.notation);
		const lead = melody.voices?.[0];
		if (!part || !lead?.score.bars.length) return null;
		const resting = rewriteAbc(melody.notation, lead.score, [], { every: true });
		melody.notation = withExtraPart(melody.notation, resting, part);
		this.rename(part.id, name);
		return part.id;
	}

	/**
	 * Lock a bar of a generated line, so it stays as it is whatever its lead
	 * and the chords do; or unlock it, giving it back: it's written again
	 * from them now.
	 * @param {string} id the generated line
	 * @param {number} bar its bar (index into its score's bars)
	 * @param {boolean} locked
	 */
	async keepBar(id, bar, locked) {
		const { arrangement, melody } = this.#arranger;
		const parse = tuneReader(await abcjsReady());
		const part = melody.generated.find((each) => each.id === id);
		const voice = melody.voices?.find((each) => each.id === id);
		if (!part || !voice) return;
		const text = withBarsKept(melody.notation, voice.score.bars, [bar], locked);
		if (locked || !arrangement.isPlayable) {
			melody.notation = text;
			return;
		}
		const tune = parse(text);
		const chordAt = concertChordAt(arrangement.sections);
		const fresh = tune ? withPartsWritten(text, tune, chordAt, [part]) : text;
		melody.notation = withPartBars(text, fresh, parse, [id], [bar]);
	}

	/**
	 * A harmony part copied to a lane of its own, to change by hand: an added
	 * part with the same notes, sound and name (with "copy"), which no longer
	 * follows the melody or the chords.
	 * @param {string} id the part copied
	 * @returns {string | null} the copy's id (null: no room)
	 */
	copy(id) {
		const { melody } = this.#arranger;
		const part = nextExtraPart(melody.notation);
		if (!part) return null;
		melody.notation = withVoiceCopied(melody.notation, id, part);
		this.rename(part.id, `${this.name(id)} copy`.slice(0, PART_NAME_LENGTH));
		const source = channelOf(id);
		const copy = channelOf(part.id);
		if (source?.instrument && copy) copy.instrument = source.instrument;
		return part.id;
	}

	/**
	 * Take an added part out of the tune, its notes and name with it, and
	 * the lines generated from it.
	 * @param {string} id
	 */
	remove(id) {
		const { melody } = this.#arranger;
		const generated = melody.generated.filter((part) => part.lead === id).map((part) => part.id);
		melody.notation = withoutExtraPart(withoutPartsFrom(melody.notation, id), id);
		for (const each of [id, ...generated]) this.#letGo(each);
	}

	/**
	 * A part that's gone: its name, its solo (a hidden lane mustn't keep the
	 * rest silent) and its place in the order go with it.
	 * @param {string} id
	 */
	#letGo(id) {
		const { song } = this.#arranger;
		song.partNames = withPartName(song.partNames, id, '');
		const channel = channelOf(id);
		if (channel) channel.solo = false;
		this.forget(id);
	}

	/**
	 * An added part becomes the song's bass line, written by ear: its notes
	 * from bar 1 on (the bass keeps to the bar lines) and its name go to the
	 * bass, and the part goes.
	 * @param {string} id
	 */
	useAsBass(id) {
		const { melody, bass, song } = this.#arranger;
		const notes = (melody.line?.notes ?? [])
			.filter((note) => note.channel === id && note.time >= 0)
			.map((note) => ({
				midi: note.pitch,
				start: Math.round(note.time * TICKS_PER_QUARTER),
				length: Math.round(note.length * TICKS_PER_QUARTER)
			}));
		const name = song.partNames[id];
		bass.notation = blankBassAbc(bassSongOf(this.#arranger), notes);
		this.remove(id);
		if (name) song.partNames = withPartName(song.partNames, BASS_VOICE, name);
	}

	/**
	 * Give a lane a name of your own ('' gives it back its own; an added
	 * part always keeps one of yours; a generated line's comes from its lead).
	 * @param {string} id
	 * @param {string} name
	 */
	rename(id, name) {
		const { song } = this.#arranger;
		if (!name.trim() && isExtraPart(id)) return;
		if (isGenerated(this.#arranger.melody.generated, id)) return;
		song.partNames = withPartName(song.partNames, id, name);
	}

	/**
	 * @param {string} id
	 * @param {string} [otherwise] the name of a lane that isn't a part (the guitar's)
	 */
	name(id, otherwise) {
		return partName(id, this.names, otherwise);
	}

	/** @param {string[]} order every lane's id, top to bottom */
	setOrder(order) {
		this.#arranger.song.laneOrder = order;
	}

	/**
	 * A lane taken away leaves the order, so one added later joins its own group, not the old place.
	 * @param {string} id
	 */
	forget(id) {
		const { song } = this.#arranger;
		if (song.laneOrder.includes(id)) song.laneOrder = song.laneOrder.filter((each) => each !== id);
	}
}

/** @param {string} id */
function channelOf(id) {
	return mixer.channels.find((each) => each.id === id);
}
