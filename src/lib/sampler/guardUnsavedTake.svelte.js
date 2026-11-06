/**
 * Ask before leaving the sampling page with a take that hasn't been
 * downloaded: takes only live in memory for now.
 *
 * Recording is desktop-only, where browsers do ask before closing a tab,
 * so asking is enough here. When takes are kept on the device (the
 * recording session), this guard goes: nothing will be left to lose.
 */
import { beforeNavigate } from '$app/navigation';

/**
 * Call once while the page is being set up.
 * @param {import('./InputCheck.svelte.js').InputCheck} input
 */
export function guardUnsavedTake(input) {
	beforeNavigate((navigation) => {
		if (!input.hasUnsavedTake) return;
		// Reloading or closing the tab: cancelling makes the browser show its own "Leave site?" prompt
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}
		if (!confirm('Your test take hasn’t been downloaded. Leave without it?')) navigation.cancel();
	});
}
