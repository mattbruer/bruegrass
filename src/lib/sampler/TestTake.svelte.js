/**
 * The test take: record a few hits before a session to set the gain and
 * check the sound. Only in memory (it's a throwaway), so leaving with one
 * that hasn't been downloaded asks first.
 */

/** @typedef {import('$lib/recording/takeRecorder.js').Take} Take */

export class TestTake {
	/** The last take (raw: big arrays, nothing in them changes). */
	/** @type {Take | null} */
	take = $state.raw(null);
	/** Saved to a file since it was recorded? */
	downloaded = $state(false);
	playing = $state(false);

	/** @param {import('./InputCheck.svelte.js').InputCheck} input */
	constructor(input) {
		this.input = input;
	}

	/** Is there a take that would be lost by leaving? */
	get unsaved() {
		return this.take !== null && !this.downloaded;
	}

	async toggleRecording() {
		if (this.input.status === 'recording') {
			const take = await this.input.stopRecording();
			if (take) {
				this.take = take;
				this.downloaded = false;
			}
		} else {
			this.input.startRecording();
		}
	}

	togglePlaying() {
		if (this.playing) {
			this.input.stopPlaying();
			return;
		}
		if (!this.take) return;
		this.playing = this.input.play(this.take, () => (this.playing = false));
	}
}
