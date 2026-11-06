/**
 * Keeps an open session's copy in the project folder (samples-source/) up
 * to date: each take is written the moment it's kept, and "Save all"
 * rewrites the lot. Saves run one after another (a queue), so a manifest
 * written for an earlier keep can never land after a newer one.
 *
 * A failed save never stops recording: the take is still safe in the
 * browser, and the problem is shown with a way to save everything again.
 */
import {
	projectFolder,
	saveAllToProject,
	saveManifestToProject,
	saveSampleToProject
} from './projectFolder.js';

export class ProjectCopy {
	/** 'saving' while anything is being written. */
	/** @type {'idle' | 'saving' | 'saved' | 'failed'} */
	status = $state('idle');
	problem = $state('');
	/** Save all's progress. */
	/** @type {{ done: number, total: number } | null} */
	progress = $state(null);

	#queue = Promise.resolve();

	/**
	 * @param {import('$lib/storage/samplingSessions.js').SamplingSession} session
	 * @param {import('../checklists/guitar.js').Checklist} checklist
	 */
	constructor(session, checklist) {
		this.session = session;
		this.checklist = checklist;
		this.folder = projectFolder(session);
	}

	/**
	 * A take was just kept: write it, and the manifest for every kept take.
	 * @param {import('./sampleSet.js').KeptSample} sample
	 * @param {import('./sampleSet.js').KeptSample[]} allKept
	 */
	saveKept(sample, allKept) {
		return this.#run(async () => {
			await saveSampleToProject(this.session, sample);
			await saveManifestToProject(this.session, this.checklist, allKept);
		});
	}

	saveAll() {
		return this.#run(async () => {
			await saveAllToProject(this.session, (done, total) => (this.progress = { done, total }));
			this.progress = null;
		});
	}

	/** @param {() => Promise<void>} job */
	#run(job) {
		this.#queue = this.#queue.then(async () => {
			this.status = 'saving';
			try {
				await job();
				this.status = 'saved';
				this.problem = '';
			} catch (error) {
				this.status = 'failed';
				this.progress = null;
				this.problem = error instanceof Error ? error.message : String(error);
			}
		});
		return this.#queue;
	}
}
