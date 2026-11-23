/**
 * Undo and Redo for edits to some of the song's fields (the Tracks page's:
 * the audio lanes' clips, the tempo lane). Each step keeps only the fields
 * the edit changed, before and after, so undoing a clip edit never undoes
 * something changed elsewhere in the meantime. Values are replaced whole on
 * every edit (never changed in place), so a field changed when it's a
 * different value.
 */

/** How many edits Undo remembers. */
const UNDO_STEPS = 100;

/**
 * @typedef {{ read: () => unknown, write: (value: unknown) => void }} UndoableField
 * @typedef {{ changed: string[], before: Record<string, unknown>, after: Record<string, unknown> }} Step
 */

export class EditHistory {
	/** @type {Record<string, UndoableField>} */
	#fields;
	#onChange;
	#undo = /** @type {Step[]} */ ($state.raw([]));
	#redo = /** @type {Step[]} */ ($state.raw([]));

	canUndo = $derived(this.#undo.length > 0);
	canRedo = $derived(this.#redo.length > 0);

	/**
	 * @param {Record<string, UndoableField>} fields what Undo can take back, by name
	 * @param {() => void} onChange after every edit, undo and redo (the band picks it up)
	 */
	constructor(fields, onChange) {
		this.#fields = fields;
		this.#onChange = onChange;
	}

	/**
	 * Make an edit Undo can take back.
	 * @param {() => void} change writes any of the fields
	 */
	edit(change) {
		const before = this.#snapshot();
		change();
		const after = this.#snapshot();
		const changed = Object.keys(before).filter((name) => before[name] !== after[name]);
		if (changed.length === 0) return;
		this.#undo = [...this.#undo.slice(1 - UNDO_STEPS), { changed, before, after }];
		this.#redo = [];
		this.#onChange();
	}

	undo() {
		const step = this.#undo.at(-1);
		if (!step) return;
		this.#undo = this.#undo.slice(0, -1);
		this.#redo = [...this.#redo, step];
		this.#write(step.changed, step.before);
	}

	redo() {
		const step = this.#redo.at(-1);
		if (!step) return;
		this.#redo = this.#redo.slice(0, -1);
		this.#undo = [...this.#undo, step];
		this.#write(step.changed, step.after);
	}

	/** Forget every step (another song is open). */
	clear() {
		this.#undo = [];
		this.#redo = [];
	}

	#snapshot() {
		return Object.fromEntries(
			Object.entries(this.#fields).map(([name, field]) => [name, field.read()])
		);
	}

	/**
	 * @param {string[]} names
	 * @param {Record<string, unknown>} values
	 */
	#write(names, values) {
		for (const name of names) this.#fields[name].write(values[name]);
		this.#onChange();
	}
}
