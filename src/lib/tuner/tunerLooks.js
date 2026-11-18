/**
 * The tuner's looks, as a list: a new look is a component that takes
 * `tuner` and one entry here.
 */
import TunerTrace from './TunerTrace.svelte';
import TunerMeter from './TunerMeter.svelte';

export const TUNER_LOOKS = Object.freeze([
	{ id: 'trace', name: 'Trace', component: TunerTrace },
	{ id: 'meter', name: 'Meter', component: TunerMeter }
]);

/** @param {string} id */
export function tunerLook(id) {
	return TUNER_LOOKS.find((look) => look.id === id) ?? TUNER_LOOKS[0];
}
