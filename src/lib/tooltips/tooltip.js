/**
 * Tooltips: a short summary of what a control does, shown when you rest the
 * mouse on it or tab to it.
 *
 * Usage, on any element:
 *   <button use:tooltip={TIPS.player.play}>Play</button>
 * (The wording lives in tips.js, so all of it can be read and edited in one place.)
 *
 * How it behaves (the timings are constants below):
 *   - Mouse: appears once you rest on a control (1.5 s), so moving around
 *     the page doesn't set them off. Once one has shown, moving straight to
 *     the next control shows its tip at once.
 *   - Keyboard: appears when you tab to a control.
 *   - Touch: none. A phone or tablet has no hover, so tips (and the switch
 *     for them) only exist where there's a mouse or trackpad.
 *   - Clicking, Escape, or scrolling hides it.
 *   - The ? button in the top bar (or Settings → General → Tips) turns them
 *     all off; screen readers still get the text, as the control's description.
 *
 * There's one bubble for the whole app. It's a native popover, so it sits in
 * the browser's top layer, above dialogs and the floating EQ and reverb windows.
 */
import { settings } from '$lib/settings/settings.svelte.js';
import './tooltip.css';

/**
 * Resting the mouse this long shows a tip. Long on purpose: tips should
 * come when you stop and wonder, not every time the pointer passes by.
 */
const SHOW_DELAY_MS = 1500;
/** After a tip hides, others show at once for this long (you're exploring). */
const WARM_MS = 300;
/** Space kept between the tip and its control, and the screen edge. */
const GAP_PX = 8;

/** @type {HTMLElement | null} */
let bubble = null;
/** @type {HTMLElement | null} */
let shownFor = null;
let showTimer = 0;
let hideTimer = 0;
/** Until when (ms) tips show without waiting. */
let warmUntil = 0;

/**
 * Svelte action: give an element a tooltip.
 * @param {HTMLElement} node
 * @param {string | undefined} text the tip (none: no tooltip, for optional ones)
 */
export function tooltip(node, text) {
	let tip = text;
	describe(tip);

	/** Only a mouse or pen hovers; a finger touching down isn't asking for a tip. @param {PointerEvent} event */
	function pointerEnter(event) {
		if (event.pointerType === 'touch' || !tip) return;
		scheduleShow(node, () => tip);
	}

	function pointerLeave() {
		if (shownFor === node || showTimer) hideSoon();
	}

	/** Clicking means you've got it. */
	function pointerDown() {
		hideNow();
	}

	/** Focus anywhere inside (a slider's focusable part is nested in it). @param {FocusEvent} event */
	function focus(event) {
		// Only for keyboard focus: a mouse click focuses too, and shouldn't pop a tip
		const target = /** @type {Element} */ (event.target);
		if (target.matches(':focus-visible')) scheduleShow(node, () => tip);
	}

	function blur() {
		if (shownFor === node || showTimer) hideNow();
	}

	/** @param {string | undefined} words */
	function describe(words) {
		if (words) node.setAttribute('aria-description', words);
		else node.removeAttribute('aria-description');
	}

	node.addEventListener('pointerenter', pointerEnter);
	node.addEventListener('pointerleave', pointerLeave);
	node.addEventListener('pointerdown', pointerDown);
	node.addEventListener('focusin', focus);
	node.addEventListener('focusout', blur);

	return {
		/** @param {string | undefined} next */
		update(next) {
			tip = next;
			describe(tip);
			if (shownFor === node && bubble) bubble.textContent = tip ?? '';
		},
		destroy() {
			if (shownFor === node) hideNow();
			node.removeEventListener('pointerenter', pointerEnter);
			node.removeEventListener('pointerleave', pointerLeave);
			node.removeEventListener('pointerdown', pointerDown);
			node.removeEventListener('focusin', focus);
			node.removeEventListener('focusout', blur);
		}
	};
}

/**
 * Show after the delay, or at once if a tip was just showing.
 * @param {HTMLElement} node
 * @param {() => string} text the tip, read when it shows (it may have changed)
 */
function scheduleShow(node, text) {
	clearTimeout(showTimer);
	clearTimeout(hideTimer);
	if (shownFor === node) return;
	const delay = Date.now() < warmUntil || shownFor ? 0 : SHOW_DELAY_MS;
	showTimer = window.setTimeout(() => {
		showTimer = 0;
		if (node.isConnected) show(node, text());
	}, delay);
}

/**
 * @param {HTMLElement} node
 * @param {string} text
 */
function show(node, text) {
	if (!settings.showTips || !text) return;
	const tip = ensureBubble();
	tip.textContent = text;
	// Re-showing puts it on top of anything opened since (a dialog, an EQ window)
	if (tip.matches(':popover-open')) tip.hidePopover();
	tip.showPopover();
	place(tip, node);
	shownFor = node;
}

/** Hide when the pointer has really left (not just crossed a gap between controls). */
function hideSoon() {
	clearTimeout(showTimer);
	showTimer = 0;
	clearTimeout(hideTimer);
	hideTimer = window.setTimeout(hideNow, 80);
}

function hideNow() {
	clearTimeout(showTimer);
	clearTimeout(hideTimer);
	showTimer = 0;
	if (shownFor) warmUntil = Date.now() + WARM_MS;
	shownFor = null;
	if (bubble?.matches(':popover-open')) bubble.hidePopover();
}

/**
 * Above the control, centred on it; below if there's no room above; never
 * past the edges of the screen.
 * @param {HTMLElement} tip
 * @param {HTMLElement} node
 */
function place(tip, node) {
	const target = node.getBoundingClientRect();
	const size = tip.getBoundingClientRect();
	const screenWidth = document.documentElement.clientWidth;

	let top = target.top - size.height - GAP_PX;
	if (top < GAP_PX) top = target.bottom + GAP_PX;
	const centred = target.left + target.width / 2 - size.width / 2;
	const left = Math.min(Math.max(GAP_PX, centred), screenWidth - size.width - GAP_PX);

	tip.style.top = `${top}px`;
	tip.style.left = `${left}px`;
}

/** The one bubble, made the first time a tip shows. */
function ensureBubble() {
	if (bubble) return bubble;
	bubble = document.createElement('div');
	bubble.className = 'tooltip-bubble';
	bubble.setAttribute('popover', 'manual');
	bubble.setAttribute('role', 'tooltip');
	bubble.setAttribute('aria-hidden', 'true'); // the control already carries the text, as its description
	document.body.append(bubble);

	window.addEventListener('keydown', (event) => event.key === 'Escape' && hideNow());
	window.addEventListener('scroll', hideNow, { capture: true, passive: true });
	return bubble;
}
