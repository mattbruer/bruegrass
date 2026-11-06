/**
 * The shape being typed in My chords: a new one, or one of yours being
 * changed. What you type is kept as a draft until it's saved, so it isn't
 * lost if the page goes away (an iPhone never asks first).
 */
import { BUILT_IN_CHORDS } from '../instruments/chordBook.js';
import { readFrets, writeFrets } from './typedFrets.js';
import { nameProblem, shapeProblem } from './checkVoicing.js';
import { myChords } from './myChords.svelte.js';
import { clearDraft, readDraft, writeDraft } from '$lib/storage/drafts.js';

const DRAFT = 'myChord';

export class ChordForm {
	/** The shape being changed, or null for a new one. */
	id = $state(/** @type {string | null} */ (null));
	name = $state('');
	fretsText = $state('');

	#saved = $derived(myChords.all.find((voicing) => voicing.id === this.id) ?? null);
	#read = $derived(readFrets(this.fretsText));
	#takenNames = $derived(
		myChords.all.filter((voicing) => voicing.id !== this.id).map((voicing) => voicing.name)
	);

	frets = $derived(this.#read.frets);
	/** What stops it saving ('' when it's fine). */
	problem = $derived(this.#findProblem());
	/** It's named like a built-in chord, so it plays instead of that one. */
	replacesBuiltIn = $derived(BUILT_IN_CHORDS.includes(this.name.trim()));
	hasChanges = $derived(
		this.#saved
			? this.name.trim() !== this.#saved.name || this.fretsText !== writeFrets(this.#saved.frets)
			: this.name.trim() !== '' || this.fretsText.trim() !== ''
	);

	#findProblem() {
		const name = this.name.trim();
		const naming = nameProblem(name, this.#takenNames);
		if (naming) return naming;
		if (this.#read.error) return this.#read.error;
		if (!this.frets) return 'Type its six frets, low E to high e';
		return shapeProblem(name, this.frets);
	}

	/** @param {import('$lib/storage/chordVoicings.js').ChordVoicing | null} voicing null: a new one */
	edit(voicing) {
		this.id = voicing?.id ?? null;
		this.name = voicing?.name ?? '';
		this.fretsText = voicing ? writeFrets(voicing.frets) : '';
	}

	/** The shape to save (only when there's no problem). */
	toVoicing() {
		return {
			...(this.id ? { id: this.id } : {}),
			name: this.name.trim(),
			frets: /** @type {(number | null)[]} */ (this.frets)
		};
	}

	/** Keep a draft while there are unsaved changes; forget it once there aren't. */
	keepDraft() {
		if (this.hasChanges) {
			writeDraft(DRAFT, { id: this.id, name: this.name, fretsText: this.fretsText });
		} else clearDraft(DRAFT);
	}

	/**
	 * Put back what you were typing last time, if there's a draft.
	 * @returns {boolean} whether there was one
	 */
	restoreDraft() {
		const value = readDraft(DRAFT)?.value;
		if (!value || typeof value.name !== 'string' || typeof value.fretsText !== 'string')
			return false;
		const stillThere = myChords.all.some((voicing) => voicing.id === value.id);
		this.id = stillThere ? value.id : null;
		this.name = value.name;
		this.fretsText = value.fretsText;
		return true;
	}
}
