/**
 * Editing virtuals (the parts written with the piano roll: the bass, the
 * melody, added parts and generated lines) a stretch of bars at a time, on
 * their Tracks lanes. Tap a bar to pick it, tap another on the same lane to
 * pick the bars between, tap inside to let go. The tools act on the picked
 * bars, and every one goes through the history, named and placed, so Undo
 * says what it takes back.
 *
 * Bars are picked as the part is written (repeats not played out), so a
 * bar the band plays twice is one bar here; `spans` says every place it
 * sounds. Copy keeps the notes and lets go, so the next tap picks where they go
 * (on any virtual lane), and Paste lays them there.
 */
import { BASS_VOICE, bassVoice, readBassScore } from '../bass/readBass.js';
import { bassAbcInUse } from '../bass/bassInUse.js';
import { playheadTicks } from '../melody/roll/playheadTicks.js';
import { clipOf, cleared, inserted, pasted, removed, repeated } from '../virtuals/barEdits.js';
import { playedSpans } from '../virtuals/playedSpans.js';
import { barsText } from '../virtuals/describeWhere.js';
import { writeVoiceNotes } from './writeVoiceNotes.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';

/**
 * @typedef {import('../melody/roll/drawnMelody.js').DrawnVoice} DrawnVoice
 * @typedef {import('../melody/roll/editNotes.js').DrawnNote} DrawnNote
 * @typedef {{ lane: string, anchor: number, first: number, last: number }} Picked
 *   bars of the lane's part as written (indices); anchor: the one tapped first
 * @typedef {{ clip: import('../virtuals/barEdits.js').Clip, from: string }} Copied
 *   from: where it was copied, in words ("Melody, bars 5–8")
 */

export class VirtualEditsState {
	/** @type {Picked | null} */
	picked = $state.raw(null);
	/** @type {Copied | null} */
	copied = $state.raw(null);

	#arranger;

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/** The bass as the piano roll edits it: the song's own line, else the band's, written out. */
	#bass = $derived.by(() => {
		const { bass } = this.#arranger;
		if (bass.isWritten) return bassVoice(bass.read);
		return bassVoice(readBassScore(bassAbcInUse(this.#arranger), abcjsIfLoaded()));
	});

	/**
	 * A virtual's part as it's read now (null: not a virtual, or nothing written).
	 * @param {string} lane
	 * @returns {DrawnVoice | null}
	 */
	voiceOf(lane) {
		if (lane === BASS_VOICE) return this.#bass;
		return this.#arranger.melody.voices?.find((each) => each.id === lane) ?? null;
	}

	/** The picked part, while it can be edited. */
	voice = $derived(this.picked ? this.voiceOf(this.picked.lane) : null);

	/** The picked bars, in the part's ticks. */
	range = $derived.by(() => {
		const bars = this.voice?.score.bars;
		const picked = this.picked;
		if (!bars || !picked) return null;
		const last = bars[picked.last];
		return { from: bars[picked.first].start, to: last.start + last.length };
	});

	/** Every place the picked bars sound, in quarters from bar 1. */
	spans = $derived(this.picked && this.range ? this.#spans(this.picked.lane, this.range) : []);

	/** The picked bars in words ("bars 5–8"). */
	barsText = $derived(this.spans[0] ? barsText(this.#arranger.chartBars, this.spans[0]) : '');

	/** There's room after the picked bars to repeat them into. */
	canRepeat = $derived(!!this.range && this.range.to < this.#end());

	/**
	 * A tap on a virtual's lane, this many quarters from bar 1.
	 * @param {string} lane
	 * @param {number} quarters
	 */
	tapAt(lane, quarters) {
		const voice = this.voiceOf(lane);
		if (!voice || voice.problem) return;
		const tick = playheadTicks(this.#sequenceOf(lane))(quarters);
		const bar =
			tick === null
				? -1
				: voice.score.bars.findIndex(
						(each) => each.start <= tick && tick < each.start + each.length
					);
		if (bar < 0) return;
		const picked = this.picked;
		if (picked?.lane !== lane) return this.#pick(lane, bar, bar);
		if (bar >= picked.first && bar <= picked.last) return this.letGo();
		this.picked = {
			...picked,
			first: Math.min(picked.anchor, bar),
			last: Math.max(picked.anchor, bar)
		};
	}

	letGo() {
		this.picked = null;
	}

	/** The picked bars played again straight after themselves; the copy is picked, so again repeats again. */
	repeat() {
		const { range } = this;
		if (!range || !this.canRepeat) return;
		const length = range.to - range.from;
		this.#change(`Repeat ${this.#barCount()}`, range.to, range.to + length, (notes, end) =>
			repeated(notes, range.from, range.to, end)
		);
		this.#pickTicks(range.to, range.to + length);
	}

	/** Keep the picked bars' notes to paste, and let go so the next tap picks where. */
	copy() {
		const { range, picked } = this;
		if (!range || !picked || !this.voice) return;
		const name = this.#arranger.parts.name(picked.lane);
		this.copied = {
			clip: clipOf(this.voice.score.notes, range.from, range.to),
			from: `${name}, ${this.barsText}`
		};
		this.letGo();
	}

	/** The copied notes laid in from the picked bar, over what's there; they're picked after. */
	paste() {
		const { range, copied } = this;
		if (!range || !copied) return;
		const to = range.from + copied.clip.length;
		this.#change('Paste', range.from, to, (notes, end) =>
			pasted(notes, copied.clip, range.from, end)
		);
		this.#pickTicks(range.from, to);
	}

	/** The picked bars emptied. */
	clear() {
		const { range } = this;
		if (!range) return;
		this.#change(`Clear ${this.#barCount()}`, range.from, range.to, (notes) =>
			cleared(notes, range.from, range.to)
		);
	}

	/** The picked bars taken out, the rest of the part pulled in to close the gap (the chords stay). */
	takeOut() {
		const { range } = this;
		if (!range) return;
		this.#change(`Take out ${this.#barCount()}`, range.from, this.#end(), (notes) =>
			removed(notes, range.from, range.to)
		);
		this.letGo();
	}

	/** As many empty bars as are picked, put in before them: the rest of the part moves later. */
	insertBefore() {
		const { range } = this;
		if (!range) return;
		this.#change(`Insert ${this.#barCount('empty bar')}`, range.from, this.#end(), (notes, end) =>
			inserted(notes, range.from, range.to - range.from, end)
		);
	}

	/**
	 * Write the picked part's notes, changed, through the history.
	 * @param {string} label
	 * @param {number} from where the change shows, in the part's ticks
	 * @param {number} to
	 * @param {(notes: DrawnNote[], end: number) => DrawnNote[]} change
	 */
	#change(label, from, to, change) {
		const { voice, picked } = this;
		if (!voice || !picked || voice.problem) return;
		const notes = change(voice.score.notes, this.#end());
		const where = {
			lanes: this.#lanesWith(picked.lane),
			spans: this.#spans(picked.lane, { from, to })
		};
		this.#arranger.history.edit(() => writeVoiceNotes(this.#arranger, voice, notes), {
			label,
			where
		});
	}

	/**
	 * Pick the bars of the picked lane between these ticks (after an edit).
	 * @param {number} from
	 * @param {number} to
	 */
	#pickTicks(from, to) {
		const bars = this.voice?.score.bars ?? [];
		const first = bars.findIndex((bar) => bar.start >= from);
		const last = bars.findLastIndex((bar) => bar.start < to);
		if (this.picked && first >= 0 && last >= first) this.#pick(this.picked.lane, first, last);
	}

	/**
	 * @param {string} lane
	 * @param {number} first
	 * @param {number} last
	 */
	#pick(lane, first, last) {
		this.picked = { lane, anchor: first, first, last };
		this.#arranger.audioEdits.letGo(); // one thing picked at a time: one set of tools
	}

	/** @param {string} [noun] */
	#barCount(noun = 'bar') {
		const count = this.picked ? this.picked.last - this.picked.first + 1 : 0;
		return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
	}

	/** The picked part's last tick. */
	#end() {
		const last = this.voice?.score.bars.at(-1);
		return last ? last.start + last.length : 0;
	}

	/**
	 * @param {string} lane
	 * @param {{ from: number, to: number }} ticks
	 */
	#spans(lane, { from, to }) {
		return playedSpans(this.#sequenceOf(lane), from, to);
	}

	/** @param {string} lane the bass is written as played; the tune's parts as written */
	#sequenceOf(lane) {
		return lane === BASS_VOICE ? null : this.#arranger.melody.sequence;
	}

	/** @param {string} lane it, and the lines generated from it (they're written again with it) */
	#lanesWith(lane) {
		const lines = this.#arranger.melody.generated.filter((part) => part.lead === lane);
		return [lane, ...lines.map((part) => part.id)];
	}
}
