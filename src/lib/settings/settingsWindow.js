/** Settings in a window of its own (a computer's), beside the page it changes. */

const SETTINGS_WINDOW_NAME = 'bluegrass-settings';

/** Opens the /settings page in a small window, or brings it forward if it's open already. */
export function openSettingsWindow() {
	const settingsWindow = window.open(
		'/settings',
		SETTINGS_WINDOW_NAME,
		'popup,width=520,height=860'
	);
	settingsWindow?.focus();
}
