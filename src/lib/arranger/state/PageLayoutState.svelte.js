/**
 * What covers the bottom of the screen: the player bar (always), one drawer
 * above it at a time (the editor or the mixer), and the phone keypad while
 * writing. The page leaves room below its content so nothing is stuck
 * underneath them.
 */

/** Extra space under the content, beyond whatever is covering the screen. */
const BREATHING_ROOM_PX = 32;

/** @typedef {'edit' | 'mixer'} DrawerId */

export class PageLayoutState {
	/** The drawer that's open above the player bar, or null. */
	drawer = $state(/** @type {DrawerId | null} */ (null));
	/** Height of the open drawer, measured by the drawer itself. */
	drawerHeight = $state(0);

	/** Height of the player bar, measured by the bar itself. */
	barHeight = $state(0);

	/** The phone music keypad is on screen (it covers the player bar). */
	keypadVisible = $state(false);
	/** Height of the keypad, measured by the keypad itself. */
	keypadHeight = $state(0);

	/** Where a drawer's bottom edge sits: on top of the keypad while it's up, else on the bar. */
	drawerBottom = $derived(this.keypadVisible ? this.keypadHeight : this.barHeight);

	/** How much space the page should leave at the bottom (a CSS length). */
	bottomSpace = $derived.by(() => {
		const drawer = this.drawer ? this.drawerHeight : 0;
		return `${this.drawerBottom + drawer + BREATHING_ROOM_PX}px`;
	});

	/** @param {DrawerId} id */
	isOpen(id) {
		return this.drawer === id;
	}

	/** Open a drawer (closing any other), or close it if it's the one open. @param {DrawerId} id */
	toggle(id) {
		this.drawer = this.drawer === id ? null : id;
	}

	close() {
		this.drawer = null;
	}
}
