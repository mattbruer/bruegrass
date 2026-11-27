/**
 * Undo and Redo for edits to some of the song's fields (the Tracks page's:
 * the parts' notes, the audio lanes' clips, the chords' voicings, the tempo
 * lane). Each step keeps only the fields the edit changed, before and after,
 * so undoing a clip edit never undoes something changed elsewhere in the
 * meantime. Values are replaced whole on every edit (never changed in
 * place), so a field changed when it's a different value.
 *
 * Each step also says what it was and where (`About`), so Undo can name
 * what it takes back before you press it and show the place after. A field
 * changed outside the history since (the ABC typed by hand) makes its
 * steps out of date: they're forgotten rather than written over that change.
 * What follows a change by itself, a moment later, is kept as part of its
 * step (`#settle`).
 */

import { tick } from 'svelte';

/** How many edits Undo remembers. */
const UNDO_STEPS = 100;

/**
 * @typedef {{ read: () => unknown, write: (value: unknown) => void, label: string }} UndoableField
 *   label: what an edit of it is called when the edit doesn't say ("Change the tempo lane")
 * @typedef {{ lanes: string[], spans: import('../virtuals/playedSpans.js').Span[], wholeSong?: boolean }} Where
 *   lanes: the Tracks lanes it changed; spans: when, in quarters from bar 1; wholeSong: every lane moved
 * @typedef {{ label: string, where?: Where | null }} About
 * @typedef {{ changed: string[], before: Record<string, unknown>, after: Record<string, unknown>, label: string, where: Where | null }} Step
 * @typedef {{ verb: 'Undo' | 'Redo', label: string, where: Where | null, count: number }} Shown
 *   the step just taken back or done again; count: a new one each time, so the place flashes again
 */

export class EditHistory {
	/** @type {Record<string, UndoableField>} */
	#fields;
	#onChange;
	#undo = /** @type {Step[]} */ ($state.raw([]));
	#redo = /** @type {Step[]} */ ($state.raw([]));
	#count = 0;

	canUndo = $derived(this.#undo.length > 0);
	canRedo = $derived(this.#redo.length > 0);
	/** The step Undo would take back. */
	nextUndo = $derived(this.#undo.at(-1) ?? null);
	/** The step Redo would do again. */
	nextRedo = $derived(this.#redo.at(-1) ?? null);
	/** @type {Shown | null} */
	shown = $state.raw(null);

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
	 * @param {About} [about] what it is and where (left out: named after the field)
	 */
	edit(change, about) {
		const before = this.#snapshot();
		change();
		const after = this.#snapshot();
		const changed = Object.keys(before).filter((name) => before[name] !== after[name]);
		if (changed.length === 0) return;
		const label = about?.label ?? this.#fields[changed[0]].label;
		const step = { changed, before, after, label, where: about?.where ?? null };
		this.#undo = [...this.#undo.slice(1 - UNDO_STEPS), step];
		this.#redo = [];
		this.shown = null;
		this.#onChange();
		this.#settle(step, 'after');
	}

	undo() {
		const step = this.#undo.at(-1);
		if (!step) return;
		if (!this.#holds(step, step.after)) return this.clear();
		this.#undo = this.#undo.slice(0, -1);
		this.#redo = [...this.#redo, step];
		this.#write(step, step.before, 'Undo');
	}

	redo() {
		const step = this.#redo.at(-1);
		if (!step) return;
		if (!this.#holds(step, step.before)) return this.clear();
		this.#redo = this.#redo.slice(0, -1);
		this.#undo = [...this.#undo, step];
		this.#write(step, step.after, 'Redo');
	}

	/** Forget every step (another song is open, or the history is out of date). */
	clear() {
		this.#undo = [];
		this.#redo = [];
		this.shown = null;
	}

	#snapshot() {
		return Object.fromEntries(
			Object.entries(this.#fields).map(([name, field]) => [name, field.read()])
		);
	}

	/**
	 * Are the step's fields still as it left them (nothing else changed them since)?
	 * @param {Step} step
	 * @param {Record<string, unknown>} values
	 */
	#holds(step, values) {
		return step.changed.every((name) => this.#fields[name].read() === values[name]);
	}

	/**
	 * @param {Step} step
	 * @param {Record<string, unknown>} values
	 * @param {'Undo' | 'Redo'} verb
	 */
	#write(step, values, verb) {
		for (const name of step.changed) this.#fields[name].write(values[name]);
		this.shown = { verb, label: step.label, where: step.where, count: ++this.#count };
		this.#onChange();
		this.#settle(step, verb === 'Undo' ? 'before' : 'after');
	}

	/**
	 * Keep the song as it settles: what follows a change by itself (the
	 * tune's chord symbols tidied after the chart changed, the chart after
	 * chords typed in the tune) is part of the same step.
	 * @param {Step} step
	 * @param {'before' | 'after'} side the side just written
	 */
	async #settle(step, side) {
		await tick();
		const now = this.#snapshot();
		const followed = Object.keys(now).filter(
			(name) => side === 'after' && !step.changed.includes(name) && now[name] !== step.after[name]
		);
		step.changed.push(...followed);
		for (const name of step.changed) step[side][name] = now[name];
	}
}
