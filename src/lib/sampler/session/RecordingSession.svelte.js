/**
 * The guided recording session: walks through a checklist one target at a
 * time ("D string, fret 5, hard, take 2 of 3"), records each, measures and
 * checks it, and keeps it when you say so.
 *
 *   R  record / stop: the take is analysed and saved on this computer at once
 *   K  keep it, and move to the next target still missing
 *   R  again instead: record over it (Redo)
 *   Space  listen (the trimmed sample)   ← →  previous / next target
 *
 * Everything is saved as it happens (storage/samplingSessions.js), so
 * there's nothing to lose on leaving and nothing to "save". The audio of
 * only the shown take is in memory at a time.
 */
import { analyseTake } from '../analysis/analyseTake.js';
import { takeProblems } from '../analysis/takeProblems.js';
import { findChecklist, isSameLayer, listTargets } from '../checklists/targets.js';
import { checkDetails } from './describeTarget.js';
import {
	discardTake,
	keepTake,
	listTakes,
	readTakeAudio,
	saveNewTake
} from '$lib/storage/samplingSessions.js';

/** @typedef {import('$lib/storage/samplingSessions.js').TakeRecord} TakeRecord */
/** @typedef {import('$lib/recording/takeRecorder.js').Take} Take */
/** @typedef {{ kept: TakeRecord | null, fresh: TakeRecord | null }} TargetTakes */

export class RecordingSession {
	/** Which target is shown (an index into `targets`). */
	index = $state(0);
	/** Each target's kept take and new (not yet kept) take, by target id. */
	/** @type {Record<string, TargetTakes>} */
	takes = $state.raw({});
	/** The shown take's audio (whichever of its takes is shown). */
	/** @type {{ record: TakeRecord, take: Take } | null} */
	shown = $state.raw(null);
	playing = $state(false);
	/** Saving or loading: buttons wait. */
	busy = $state(false);
	/** What went wrong last, in plain words. */
	problem = $state('');

	/** Counts loads, so a slow load can't show audio for a target you've already left. */
	#loadNumber = 0;

	/**
	 * @param {import('../InputCheck.svelte.js').InputCheck} input
	 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
	 * @param {import('../checklists/guitar.js').Checklist} checklist
	 * @param {TakeRecord[]} records
	 */
	constructor(input, session, checklist, records) {
		this.input = input;
		this.session = session;
		this.checklist = checklist;
		this.targets = listTargets(checklist);

		/** @type {Record<string, TargetTakes>} */
		const takes = {};
		for (const record of records) {
			const entry = (takes[record.targetId] ??= { kept: null, fresh: null });
			if (record.kept) entry.kept = record;
			else entry.fresh = record;
		}
		this.takes = takes;
	}

	/**
	 * Open a saved session at its first missing target.
	 * @param {import('../InputCheck.svelte.js').InputCheck} input
	 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
	 */
	static async open(input, session) {
		const checklist = findChecklist(session.checklistId);
		if (!checklist) throw new Error(`No checklist called “${session.checklistId}”`);
		const opened = new RecordingSession(input, session, checklist, await listTakes(session.id));
		await opened.go(Math.max(0, opened.nextMissingFrom(0)));
		return opened;
	}

	get target() {
		return this.targets[this.index];
	}

	/** @param {string} targetId */
	takesFor(targetId) {
		return this.takes[targetId] ?? { kept: null, fresh: null };
	}

	get keptCount() {
		return Object.values(this.takes).filter((entry) => entry.kept).length;
	}

	get recording() {
		return this.input.status === 'recording';
	}

	/** The shown take's problems, compared with the kept takes of the same note and intensity. */
	get problems() {
		if (!this.shown) return [];
		const target = this.target;
		const others = this.targets
			.filter((other) => other.id !== target.id && isSameLayer(other, target))
			.map((other) => this.takesFor(other.id).kept?.analysis)
			.filter((analysis) => analysis !== undefined);
		return takeProblems(this.shown.record.analysis, checkDetails(target, this.checklist), others);
	}

	/**
	 * The first target from `from` on (wrapping round) with no kept take; -1 when all are kept.
	 * @param {number} from
	 */
	nextMissingFrom(from) {
		for (let step = 0; step < this.targets.length; step++) {
			const index = (from + step) % this.targets.length;
			if (!this.takesFor(this.targets[index].id).kept) return index;
		}
		return -1;
	}

	/**
	 * Show a target and load its take (the new one if there is one, else the kept one).
	 * @param {number} index
	 */
	async go(index) {
		if (this.recording || index < 0 || index >= this.targets.length) return;
		this.stopPlaying();
		this.index = index;
		const { kept, fresh } = this.takesFor(this.targets[index].id);
		await this.#show(fresh ?? kept);
	}

	previous() {
		return this.go(this.index - 1);
	}

	next() {
		return this.go(this.index + 1);
	}

	async toggleRecording() {
		if (this.busy) return;
		if (!this.recording) {
			this.stopPlaying();
			this.problem = '';
			this.input.startRecording();
			return;
		}
		const take = await this.input.stopRecording();
		if (!take) return;
		await this.#work(async () => {
			const target = this.target;
			const analysis = analyseTake(take, target.midi);
			const record = await saveNewTake(
				this.session.id,
				target.id,
				take,
				analysis,
				this.takesFor(target.id).fresh
			);
			this.#setTakes(target.id, { ...this.takesFor(target.id), fresh: record });
			this.#loadNumber++;
			this.shown = { record, take };
		});
	}

	/** Keep the new take, then go to the next target still missing. */
	async keep() {
		const target = this.target;
		const { kept, fresh } = this.takesFor(target.id);
		if (!fresh || this.busy || this.recording) return;
		await this.#work(async () => {
			const nowKept = await keepTake(fresh, kept);
			this.#setTakes(target.id, { kept: nowKept, fresh: null });
			if (this.shown?.record.id === nowKept.id) this.shown = { ...this.shown, record: nowKept };
		});
		const next = this.nextMissingFrom(this.index + 1);
		if (next >= 0) await this.go(next);
	}

	/** Throw away the new take, going back to the kept one (if any). */
	async discard() {
		const target = this.target;
		const { kept, fresh } = this.takesFor(target.id);
		if (!fresh || this.busy || this.recording) return;
		this.stopPlaying();
		await this.#work(async () => {
			await discardTake(fresh);
			this.#setTakes(target.id, { kept, fresh: null });
		});
		await this.#show(kept);
	}

	togglePlaying() {
		if (this.playing) {
			this.input.stopPlaying();
			return;
		}
		if (!this.shown || this.recording) return;
		this.playing = this.input.play(
			this.shown.take,
			() => (this.playing = false),
			this.shown.record.analysis.trim
		);
	}

	stopPlaying() {
		if (this.playing) this.input.stopPlaying();
	}

	/** @param {TakeRecord | null} record */
	async #show(record) {
		const loadNumber = ++this.#loadNumber;
		if (!record) {
			this.shown = null;
			return;
		}
		const channels = await readTakeAudio(record.id);
		if (loadNumber !== this.#loadNumber) return; // moved on meanwhile
		this.shown = channels ? { record, take: { channels, sampleRate: record.sampleRate } } : null;
	}

	/**
	 * @param {string} targetId
	 * @param {TargetTakes} entry
	 */
	#setTakes(targetId, entry) {
		this.takes = { ...this.takes, [targetId]: entry };
	}

	/**
	 * Run a save, holding the buttons meanwhile and putting any failure into words.
	 * @param {() => Promise<void>} job
	 */
	async #work(job) {
		this.busy = true;
		try {
			await job();
		} catch (error) {
			this.problem = `Couldn’t save on this computer: ${error instanceof Error ? error.message : String(error)}`;
		} finally {
			this.busy = false;
		}
	}
}
