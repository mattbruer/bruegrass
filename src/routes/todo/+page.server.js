/**
 * The /todo page's data and changes. Dev on localhost only: anywhere else
 * the page doesn't exist (404), and nothing can write to todo.json.
 */
import { error, fail } from '@sveltejs/kit';
import { isLocalDev } from '$lib/devOnly.js';
import {
	COLUMNS,
	addIdea,
	adoptSuggestion,
	readTodoList,
	removeItem,
	toggleDone
} from '$lib/server/todoList.js';

/** @param {URL} url */
function onlyInLocalDev(url) {
	if (!isLocalDev(url)) error(404, 'Not found');
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
	onlyInLocalDev(url);
	return { list: await readTodoList() };
}

/**
 * @param {FormData} form
 * @returns {import('$lib/server/todoList.js').Column | null}
 */
function columnOf(form) {
	const column = form.get('column');
	return COLUMNS.find((each) => each === column) ?? null;
}

/** @type {import('./$types').Actions} */
export const actions = {
	add: async ({ request, url }) => {
		onlyInLocalDev(url);
		const text = String((await request.formData()).get('text') ?? '').trim();
		if (!text) return fail(400, { message: 'Write something first.' });
		await addIdea(text.slice(0, 300));
	},

	toggle: async ({ request, url }) => {
		onlyInLocalDev(url);
		const form = await request.formData();
		const column = columnOf(form);
		if (column) await toggleDone(column, String(form.get('id')));
	},

	remove: async ({ request, url }) => {
		onlyInLocalDev(url);
		const form = await request.formData();
		const column = columnOf(form);
		if (column) await removeItem(column, String(form.get('id')));
	},

	adopt: async ({ request, url }) => {
		onlyInLocalDev(url);
		await adoptSuggestion(String((await request.formData()).get('id')));
	}
};
