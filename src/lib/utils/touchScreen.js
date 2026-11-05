/**
 * Is this a touch screen (a finger, not a mouse, is the main pointer)?
 * Calls `onChange` now and whenever that changes (e.g. a tablet docked to a
 * keyboard and trackpad). Returns a function that stops watching.
 * @param {(isTouchScreen: boolean) => void} onChange
 */
export function watchTouchScreen(onChange) {
	const touchQuery = window.matchMedia('(pointer: coarse)');
	const report = () => onChange(touchQuery.matches);

	report();
	touchQuery.addEventListener('change', report);
	return () => touchQuery.removeEventListener('change', report);
}
