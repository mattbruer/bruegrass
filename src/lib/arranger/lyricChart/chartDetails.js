/**
 * The facts a player needs before the first bar, for the chart's header:
 * key (and capo), tempo, time signature.
 */
import { keyName } from '../chart/key.js';
import { meterText, DEFAULT_METER } from '../chart/timeline.js';

/**
 * @param {import('../state/ArrangementState.svelte.js').ArrangementState} arrangement
 * @returns {{ label: string, value: string }[]}
 */
export function chartDetails(arrangement) {
	const details = [];
	const { key, pitchShift, shapesShift, capoFret, sections } = arrangement;

	if (key) details.push({ label: 'Key', value: keyName(key, pitchShift) });
	if (key && capoFret > 0) {
		details.push({ label: 'Capo', value: `${capoFret} (${keyName(key, shapesShift)} shapes)` });
	}
	details.push({ label: 'Tempo', value: `♩ = ${arrangement.bpm}` });
	details.push({ label: 'Time', value: meterText(sections[0]?.meters?.[0] ?? DEFAULT_METER) });

	return details;
}
