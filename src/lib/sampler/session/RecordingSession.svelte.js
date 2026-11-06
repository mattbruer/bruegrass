/**
 * The guided recording session: walks through a checklist one target at a
 * time ("D string, fret 5, hard, take 2 of 3"), records each, measures and
 * checks it, and keeps it when you say so.
 *
 *   R  record / stop: the take is analysed and saved on this computer at once
 *   K  keep it, and move to the next target still missing
 *
 * A recording can hold many hits (play the note as often as you like, then
 * stop). Then each hit is found and checked, you tick the ones to keep, and
 * Keep cuts those out as takes of that note (filling its missing takes);
 * the rest of the recording is thrown away.
 *   R  again instead: record over it (Redo)
 *   Space  listen (the trimmed sample)   ← →  previous / next target
 *
 * Everything is saved as it happens (storage/samplingSessions.js), so
 * there's nothing to lose on leaving and nothing to "save". Each kept take
 * is also written into the project folder (ProjectCopy). The audio of only
 * the shown take is in memory at a time.
 */
import { analyseTake } from '../analysis/analyseTake.js';
import { analyseHits, cutOut } from '../analysis/findHits.js';
import { takeProblems } from '../analysis/takeProblems.js';
import { findChecklist, isSameLayer, listTargets } from '../checklists/targets.js';
import { clickRun } from '../checklists/groupClick.js';
import { checkDetails } from './describeTarget.js';
import { ProjectCopy } from './ProjectCopy.svelte.js';
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
/** @typedef {ReturnType<typeof analyseHits>[number]} Hit */
/** @typedef {{ hits: Hit[], chosen: number[] }} Run */

export class RecordingSession {
	/** Which target is shown (an index into `targets`). */
	index = $state(0);
	/** Each target's kept take and new (not yet kept) take, by target id. */
	/** @type {Record<string, TargetTakes>} */
	takes = $state.raw({});
	/** The shown take's audio (whichever of its takes is shown). */
	/** @type {{ record: TakeRecord, take: Take } | null} */
	shown = $state.raw(null);
	/** The hits in the shown new recording, when it has several, and which are ticked to keep. */
	/** @type {Run | null} */
	run = $state.raw(null);
	playing = $state(false);
	/** Which hit is playing (null: none, or the whole take). */
	/** @type {number | null} */
	playingHit = $state(null);
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
		/** The copy in the project folder (samples-source/), written as takes are kept. */
		this.projectCopy = new ProjectCopy(session, checklist);

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

	/** Every kept take, in checklist order. */
	keptSamples() {
		return this.targets.flatMap((target) => {
			const record = this.takesFor(target.id).kept;
			return record ? [{ target, record }] : [];
		});
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
		return takeProblems(
			this.shown.record.analysis,
			checkDetails(target, this.checklist),
			this.#keptOfLayer(target)
		);
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
			this.input.startRecording(clickRun(this.checklist, this.target));
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
			this.run = this.#findRun(record, take);
		});
	}

	/** Keep the new take (or the ticked hits), then go to the next target still missing. */
	async keep() {
		if (this.run) return this.#keepChosenHits(this.run);
		const target = this.target;
		const { kept, fresh } = this.takesFor(target.id);
		if (!fresh || this.busy || this.recording) return;
		await this.#work(async () => {
			const nowKept = await keepTake(fresh, kept);
			this.#setTakes(target.id, { kept: nowKept, fresh: null });
			if (this.shown?.record.id === nowKept.id) this.shown = { ...this.shown, record: nowKept };
			// In the background: the next target needn't wait for the disk
			this.projectCopy.saveKept({ target, record: nowKept }, this.keptSamples());
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
		// A recording of many hits plays whole; a single take as it will be cut
		this.#play(this.run ? undefined : this.shown.record.analysis.trim, null);
	}

	/**
	 * Listen to one hit, as it would be cut (again: stop).
	 * @param {number} index
	 */
	playHit(index) {
		const hit = this.run?.hits[index];
		if (!hit || !this.shown || this.recording) return;
		const wasThis = this.playing && this.playingHit === index;
		this.stopPlaying();
		if (wasThis) return;
		const { start, end } = hit.analysis.trim;
		this.#play({ start: hit.range.start + start, end: hit.range.start + end }, index);
	}

	/**
	 * Tick or untick a hit to keep (no more than there are takes to fill).
	 * @param {number} index
	 */
	toggleChosen(index) {
		const run = this.run;
		if (!run) return;
		const chosen = run.chosen.includes(index)
			? run.chosen.filter((each) => each !== index)
			: run.chosen.length < this.slots.length
				? [...run.chosen, index].sort((a, b) => a - b)
				: run.chosen;
		this.run = { ...run, chosen };
	}

	/** The takes the ticked hits fill, in order: this note's missing takes, or all of them to redo. */
	get slots() {
		const layer = this.targets.filter((other) => isSameLayer(other, this.target));
		const missing = layer.filter((other) => !this.takesFor(other.id).kept);
		return missing.length > 0 ? missing : layer;
	}

	/**
	 * One hit's problems: the take checks, worded for a hit inside a recording.
	 * @param {number} index
	 */
	hitProblems(index) {
		return this.run ? this.#problemsOfHit(this.run.hits, index) : [];
	}

	/**
	 * @param {Hit[]} hits
	 * @param {number} index
	 */
	#problemsOfHit(hits, index) {
		const details = {
			...checkDetails(this.target, this.checklist),
			afterAnotherHit: index > 0,
			endsAtNextHit: index < hits.length - 1,
			inMotion: clickRun(this.checklist, this.target) !== null
		};
		return takeProblems(hits[index].analysis, details, this.#keptOfLayer(this.target));
	}

	stopPlaying() {
		if (this.playing) this.input.stopPlaying();
	}

	/**
	 * @param {{ start: number, end: number } | undefined} range
	 * @param {number | null} hit
	 */
	#play(range, hit) {
		if (!this.shown) return;
		this.playing = this.input.play(
			this.shown.take,
			() => {
				this.playing = false;
				this.playingHit = null;
			},
			range
		);
		this.playingHit = this.playing ? hit : null;
	}

	/**
	 * The hits in a new recording, when there's more than one to choose from.
	 * @param {TakeRecord} record
	 * @param {Take} take
	 * @returns {Run | null}
	 */
	#findRun(record, take) {
		if (record.kept || checkDetails(this.target, this.checklist).pattern) return null;
		const click = clickRun(this.checklist, this.target);
		const hits = analyseHits(take, this.target.midi, click ? 60 / click.tempo : null);
		if (hits.length < 2) return null;
		// Ticked to start with: the first hits without a reason to redo, as many as there are takes to fill
		const clean = hits
			.map((_, index) => index)
			.filter(
				(index) => !this.#problemsOfHit(hits, index).some((problem) => problem.severity === 'redo')
			);
		return { hits, chosen: clean.slice(0, this.slots.length) };
	}

	/**
	 * Cut each ticked hit out as a kept take, then throw the recording away.
	 * @param {Run} run
	 */
	async #keepChosenHits(run) {
		const shown = this.shown;
		if (!shown || run.chosen.length === 0 || this.busy || this.recording) return;
		this.stopPlaying();
		const recording = shown.record;
		const slots = this.slots;
		await this.#work(async () => {
			for (const [order, index] of run.chosen.entries()) {
				const target = slots[order];
				const hit = run.hits[index];
				const { kept, fresh } = this.takesFor(target.id);
				const replacing = fresh && fresh.id !== recording.id ? fresh : null;
				const take = cutOut(shown.take, hit.range);
				const analysis = { ...hit.analysis, offBeatMs: hit.offBeatMs };
				const record = await saveNewTake(this.session.id, target.id, take, analysis, replacing);
				const nowKept = await keepTake(record, kept);
				this.#setTakes(target.id, { kept: nowKept, fresh: null });
				this.projectCopy.saveKept({ target, record: nowKept }, this.keptSamples());
			}
			await discardTake(recording);
			const own = this.takesFor(recording.targetId);
			if (own.fresh?.id === recording.id)
				this.#setTakes(recording.targetId, { ...own, fresh: null });
			this.run = null;
		});
		const next = this.nextMissingFrom(this.index);
		if (next >= 0) await this.go(next);
	}

	/** @param {import('../checklists/targets.js').Target} target */
	#keptOfLayer(target) {
		return this.targets
			.filter((other) => other.id !== target.id && isSameLayer(other, target))
			.map((other) => this.takesFor(other.id).kept?.analysis)
			.filter((analysis) => analysis !== undefined);
	}

	/** @param {TakeRecord | null} record */
	async #show(record) {
		const loadNumber = ++this.#loadNumber;
		if (!record) {
			this.shown = null;
			this.run = null;
			return;
		}
		const channels = await readTakeAudio(record.id);
		if (loadNumber !== this.#loadNumber) return; // moved on meanwhile
		const take = channels ? { channels, sampleRate: record.sampleRate } : null;
		this.shown = take ? { record, take } : null;
		this.run = take ? this.#findRun(record, take) : null;
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
