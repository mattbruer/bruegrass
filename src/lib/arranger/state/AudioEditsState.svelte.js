/**
 * Editing the audio lanes on the Tracks page: one clip is picked at a
 * time, and the clip tools act on it. Every edit goes through the history,
 * so Undo takes it back, and writes the lane's clips into the song
 * (`song.audioClips`, takes/clips.js), which saves itself. The takes' audio
 * is never changed.
 */
import {
	clipsOfTrack,
	fromTake,
	movedBy,
	splitClip,
	splitClipAt,
	withEndAt,
	withFades,
	withGain,
	withStartAt
} from '../takes/clips.js';
import { evenedOutGain, peakIn } from '../takes/clipLevel.js';
import { sectionStarts } from '../tracks/sectionStarts.js';
import { readTakeAudio } from '$lib/storage/songTakes.js';

/**
 * @typedef {import('../takes/clips.js').AudioClip} AudioClip
 * @typedef {import('$lib/storage/songTakes.js').TakeDocument} TakeDocument
 * @typedef {import('../tracks/lanes.js').LaneClip} LaneClip
 */

export class AudioEditsState {
	/** @type {import('./Arranger.svelte.js').Arranger} */
	#arranger;

	/** The picked clip: its lane and its place on the lane (null: none). */
	picked = $state.raw(/** @type {{ trackId: string, index: number } | null} */ (null));

	/** The picked clip as the lane shows it (null: none, or it's gone). */
	pickedClip = $derived.by(() => {
		const picked = this.picked;
		if (!picked) return null;
		const lane = this.#arranger.recording.lanes.find((each) => each.id === picked.trackId);
		return lane?.clips[picked.index] ?? null;
	});

	/** The takes the picked clip can be swapped for, its own among them, oldest first. */
	takesForPicked = $derived.by(() => {
		const laneClip = this.pickedClip;
		if (!laneClip) return [];
		return this.#arranger.recording.takes.filter(
			(take) =>
				take.trackId === laneClip.take.trackId && fromTake(laneClip.clip, laneClip.take, take)
		);
	});

	/** @param {import('./Arranger.svelte.js').Arranger} arranger */
	constructor(arranger) {
		this.#arranger = arranger;
	}

	/**
	 * @param {string} trackId
	 * @param {number} index
	 */
	pick(trackId, index) {
		this.picked = { trackId, index };
	}

	letGo() {
		this.picked = null;
	}

	/**
	 * Cut the picked clip in two where the playhead is; the first half stays picked.
	 * @param {number} at seconds from bar 1
	 */
	split(at) {
		this.#replacePicked((clip, take) => splitClip(clip, take, at) ?? [clip]);
	}

	/** Cut the picked clip at every section it crosses, ready to comp section by section. */
	splitAtSections() {
		const { arrangement } = this.#arranger;
		const places = sectionStarts(arrangement.sections).map((quarters) =>
			arrangement.clock.secondsAt(quarters)
		);
		this.#replacePicked((clip, take) => splitClipAt(clip, take, places));
	}

	/** @param {number} at seconds from bar 1 */
	trimStart(at) {
		this.#replacePicked((clip, take) => [withStartAt(clip, take, at)]);
	}

	/** @param {number} at seconds from bar 1 */
	trimEnd(at) {
		this.#replacePicked((clip, take) => [withEndAt(clip, take, at)]);
	}

	/** @param {number} seconds later (negative: earlier) */
	move(seconds) {
		this.#replacePicked((clip) => [movedBy(clip, seconds)]);
	}

	/** @param {number} gain dB */
	setGain(gain) {
		this.#replacePicked((clip) => [withGain(clip, gain)]);
	}

	/** @param {{ fadeIn?: number, fadeOut?: number }} fades seconds */
	setFades(fades) {
		this.#replacePicked((clip) => [withFades(clip, fades)]);
	}

	/** The picked clip as loud as it can go without clipping. */
	async evenOut() {
		const laneClip = this.pickedClip;
		if (!laneClip) return;
		const channels = await readTakeAudio(laneClip.take.id);
		if (!channels) return;
		const { clip, take } = laneClip;
		this.setGain(evenedOutGain(peakIn(channels, take.sampleRate, clip.from, clip.to)));
	}

	/**
	 * The same stretch from another take (comping).
	 * @param {number} step 1: the next take, -1: the one before
	 */
	otherTake(step) {
		const laneClip = this.pickedClip;
		const takes = this.takesForPicked;
		if (!laneClip || takes.length < 2) return;
		const here = takes.findIndex((take) => take.id === laneClip.take.id);
		const other = takes[(here + step + takes.length) % takes.length];
		this.#replacePicked((clip, take) => [fromTake(clip, take, other) ?? clip]);
	}

	/** Take the picked clip away: its stretch of the lane is silent. */
	remove() {
		this.#replacePicked(() => []);
		this.picked = null;
	}

	/**
	 * Replace the picked clip with what `change` makes of it (nothing, one, or
	 * several clips), as one edit.
	 * @param {(clip: AudioClip, take: TakeDocument) => AudioClip[]} change
	 */
	#replacePicked(change) {
		const picked = this.picked;
		if (!picked) return;
		const { song, history, recording } = this.#arranger;
		const lane = clipsOfTrack(picked.trackId, song.audioClips, recording.takes);
		const here = lane[picked.index];
		if (!here) return;
		const clips = lane.map(({ clip }) => clip);
		const next = [
			...clips.slice(0, picked.index),
			...change(here.clip, here.take),
			...clips.slice(picked.index + 1)
		];
		history.edit(() => {
			song.audioClips = { ...song.audioClips, [picked.trackId]: next };
		});
	}
}
