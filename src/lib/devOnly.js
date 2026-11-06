/**
 * Dev tools (the /todo and /sampler pages) only exist while you run the dev server
 * on your own machine: not in a real build, and not when the dev server is
 * reached from another device on the network.
 */
import { dev } from '$app/environment';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * @param {URL} url the page's address
 */
export function isLocalDev(url) {
	return dev && LOCAL_HOSTS.has(url.hostname);
}
