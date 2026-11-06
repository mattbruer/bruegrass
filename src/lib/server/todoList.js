/**
 * The app's todo list, kept in todo.json at the project root (so it's in
 * git, and Claude can read it and update its suggestions in any chat).
 *
 *   mine:        your ideas, added from the /todo page
 *   suggestions: Claude's, kept to about 10, short and high level
 *
 * Server-only ($lib/server), and only used by the dev-only /todo page: it
 * writes a file in the project, which only makes sense on your own machine.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const TODO_FILE = new URL('../../../todo.json', import.meta.url);

/** The two columns. */
export const COLUMNS = /** @type {const} */ (['mine', 'suggestions']);

/**
 * @typedef {{ id: string, text: string, done: boolean, addedAt: string }} TodoItem
 * @typedef {{ mine: TodoItem[], suggestions: TodoItem[] }} TodoList
 * @typedef {typeof COLUMNS[number]} Column
 */

/** @returns {Promise<TodoList>} */
export async function readTodoList() {
	try {
		const list = JSON.parse(await readFile(TODO_FILE, 'utf8'));
		return { mine: list.mine ?? [], suggestions: list.suggestions ?? [] };
	} catch {
		return { mine: [], suggestions: [] };
	}
}

/** @param {TodoList} list */
async function save(list) {
	await writeFile(TODO_FILE, `${JSON.stringify(list, null, '\t')}\n`);
}

/**
 * Change the list: read it, apply the change, write it back.
 * @param {(list: TodoList) => void} change
 */
async function update(change) {
	const list = await readTodoList();
	change(list);
	await save(list);
}

/** @param {string} text */
export function addIdea(text) {
	return update((list) => {
		list.mine.push({ id: randomUUID(), text, done: false, addedAt: new Date().toISOString() });
	});
}

/**
 * @param {Column} column
 * @param {string} id
 */
export function toggleDone(column, id) {
	return update((list) => {
		const item = list[column].find((each) => each.id === id);
		if (item) item.done = !item.done;
	});
}

/**
 * @param {Column} column
 * @param {string} id
 */
export function removeItem(column, id) {
	return update((list) => {
		list[column] = list[column].filter((each) => each.id !== id);
	});
}

/**
 * Move one of Claude's suggestions into your list (you want it).
 * @param {string} id
 */
export function adoptSuggestion(id) {
	return update((list) => {
		const item = list.suggestions.find((each) => each.id === id);
		if (!item) return;
		list.suggestions = list.suggestions.filter((each) => each.id !== id);
		list.mine.push({ ...item, addedAt: new Date().toISOString() });
	});
}
