/**
 * The song's parts as lanes, wherever they're shown (Tracks, Transcribe):
 * adding a part to write (+ Inst, + Lane), naming any lane, taking an
 * added part away or making it the bass line, and the order the lanes
 * are in. Names and order are saved with the song (`song.partNames`,
 * `song.laneOrder`).
 */
import { abcjsReady } from './abcjsLoaded.svelte.js';
import {
	isExtraPart,
	nextExtraPart,
	withExtraPart,
	withoutExtraPart
} from '../melody/extraParts.js';
import { partName, withPartName } from '../melody/partNames.js';
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
	 * Take an added part out of the tune, its notes and name with it.
	 * @param {string} id
	 */
	remove(id) {
		const { melody, song } = this.#arranger;
		melody.notation = withoutExtraPart(melody.notation, id);
		song.partNames = withPartName(song.partNames, id, '');
		const channel = mixer.channels.find((each) => each.id === id);
		if (channel) channel.solo = false; // a hidden lane mustn't keep the rest silent
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
	 * part always keeps one of yours).
	 * @param {string} id
	 * @param {string} name
	 */
	rename(id, name) {
		const { song } = this.#arranger;
		if (!name.trim() && isExtraPart(id)) return;
		song.partNames = withPartName(song.partNames, id, name);
	}

	/**
	 * @param {string} id
	 * @param {string} [otherwise] the name of a lane that isn't a part (the guitar's)
	 */
	name(id, otherwise) {
		return partName(id, this.#arranger.song.partNames, otherwise);
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
