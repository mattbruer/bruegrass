/**
 * The sampler is a dev tool, like /todo: it only exists while you run the
 * dev server on this computer. Anywhere else the page doesn't exist (404).
 */
import { error } from '@sveltejs/kit';
import { isLocalDev } from '$lib/devOnly.js';

/** @type {import('./$types').PageLoad} */
export function load({ url }) {
	if (!isLocalDev(url)) error(404, 'Not found');
}
