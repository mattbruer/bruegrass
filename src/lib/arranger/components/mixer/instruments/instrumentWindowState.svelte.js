/**
 * Which tune channel's instrument window is open (one at a time, like the EQ window).
 */

export const instrumentWindow = $state({
	/** The channel choosing its instrument (Melody or a harmony part); null when closed. */
	channelId: /** @type {string | null} */ (null)
});

/** @param {string} channelId */
export function openInstruments(channelId) {
	instrumentWindow.channelId = channelId;
}

export function closeInstruments() {
	instrumentWindow.channelId = null;
}
