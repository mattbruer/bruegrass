/**
 * Things that cover the bottom of the screen (the mixer drawer, the phone
 * keypad) and the room the page needs below its content so nothing is
 * stuck underneath them.
 */

/** Extra space under the content, beyond whatever is covering the screen. */
const BREATHING_ROOM_PX = 32;

export class PageLayoutState {
	mixerOpen = $state(false);
	/** Height of the mixer drawer, measured by the drawer itself. */
	mixerHeight = $state(0);

	/** The phone music keypad is on screen. */
	keypadVisible = $state(false);
	/** Height of the keypad, measured by the keypad itself. */
	keypadHeight = $state(0);

	/** How much space the page should leave at the bottom (a CSS length, or null for none). */
	bottomSpace = $derived.by(() => {
		if (this.mixerOpen) return `${this.mixerHeight + BREATHING_ROOM_PX}px`;
		if (this.keypadVisible) return `${this.keypadHeight + BREATHING_ROOM_PX}px`;
		return null;
	});
}
