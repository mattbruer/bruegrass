/**
 * Ask before leaving the sampling page while something would be lost: a
 * test take that hasn't been downloaded, or a take still being recorded.
 * (Session takes are saved on the computer as soon as they stop, so they
 * never need asking about.)
 *
 * Recording is desktop-only, where browsers do ask before closing a tab,
 * so asking is enough here.
 */
import { beforeNavigate } from '$app/navigation';

/**
 * Call once while the page is being set up.
 * @param {() => string | null} whatWouldBeLost a question to ask, or null when nothing would be lost
 */
export function guardLeaving(whatWouldBeLost) {
	beforeNavigate((navigation) => {
		const question = whatWouldBeLost();
		if (!question) return;
		// Reloading or closing the tab: cancelling makes the browser show its own "Leave site?" prompt
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}
		if (!confirm(question)) navigation.cancel();
	});
}
