/**
 * A short line telling you something the app just did for you (the harmony
 * followed a chord edit, say): shown at the top of the screen for a few
 * seconds, or until tapped. One at a time; a new one replaces the last.
 * Shown by `components/page/Notice.svelte`, mounted once in the band layout.
 */

/** How long a notice stays up. */
const SHOWN_FOR_MS = 5000;

class Notice {
	text = $state('');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	#timer;

	/** @param {string} text */
	show(text) {
		this.text = text;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.hide(), SHOWN_FOR_MS);
	}

	hide() {
		clearTimeout(this.#timer);
		this.text = '';
	}
}

/** Kept for the life of the page, like the mixer. */
export const notice = new Notice();
