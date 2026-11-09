/**
 * The arrangement's timeline: bars, time signatures, where each chord falls
 * and the rhythm grid every instrument plays on. All times are in quarter
 * notes from the top of one pass.
 */

/**
 * @typedef {{ beats: number, unit: number }} Meter e.g. 3/4 = { beats: 3, unit: 4 }
 * @typedef {{ name?: string, measures: string[][], meters?: Meter[], key?: import('./key.js').Key | null }} Section
 *   key: as the chart names it with [K:], else null (see key.js songKey)
 * @typedef {{
 *   section: number, measure: number, chord: number, name: string, sectionName: string,
 *   start: number, length: number, bar: number, barStart: number, meter: Meter
 * }} SlotPosition one chord's span, in quarter notes
 * @typedef {{ time: number, role: 'boom' | 'chuck', length: number, slot: number, bar: number, beatInBar: number }} Beat
 *   length: quarters until the next boom (for booms) or 1 (for chucks)
 */

/** 4/4 unless the arrangement says otherwise. */
export const DEFAULT_METER = Object.freeze({ beats: 4, unit: 4 });

/** @param {Meter} meter */
export function barQuarters(meter) {
	return (meter.beats * 4) / meter.unit;
}

/** @param {Meter} meter */
export function meterText(meter) {
	return `${meter.beats}/${meter.unit}`;
}

/**
 * How a bar's quarters group into boom-chuck figures: 2 = boom-chuck,
 * 3 = boom-chuck-chuck (waltz). Even bars are all pairs; odd bars longer
 * than 3 (crooked bars like 5/4) end with a group of three.
 * @param {number} quarters
 * @returns {number[]}
 */
export function beatGroups(quarters) {
	if (quarters <= 3) return [quarters];
	const groups = Array(Math.floor(quarters / 2)).fill(2);
	if (quarters % 2) groups[groups.length - 1] = 3;
	return groups;
}

/**
 * Where each chord falls, in play order. A bar's beats are shared evenly
 * between its chords; any odd beat goes to the earlier chords (|G,D| in 3/4
 * is G for two beats, D for one).
 * @param {Section[]} sections
 * @returns {SlotPosition[]}
 */
export function slotPositions(sections) {
	/** @type {SlotPosition[]} */
	const slots = [];
	let time = 0;
	let bar = 0;

	sections.forEach((section, s) => {
		section.measures.forEach((measure, m) => {
			const chords = measure.flatMap((name, c) => (name ? [{ name, c }] : []));
			if (chords.length === 0) return;
			const meter = section.meters?.[m] ?? DEFAULT_METER;
			const quarters = barQuarters(meter);
			if (chords.length > quarters) {
				throw new Error(
					`Bar ${m + 1} of ${section.name || 'a section'} has ${chords.length} chords, more than its ${meterText(meter)} beats`
				);
			}

			const base = Math.floor(quarters / chords.length);
			const extra = quarters % chords.length;
			let at = time;
			chords.forEach(({ name, c }, i) => {
				const length = base + (i < extra ? 1 : 0);
				slots.push({
					section: s,
					measure: m,
					chord: c,
					name,
					sectionName: section.name ?? '',
					start: at,
					length,
					bar,
					barStart: time,
					meter
				});
				at += length;
			});
			time += quarters;
			bar++;
		});
	});
	return slots;
}

/**
 * Every quarter note of one pass, with its place in the boom-chuck pattern.
 * @param {Section[]} sections
 * @returns {{ beats: Beat[], quarters: number, slots: SlotPosition[] }}
 */
export function rhythm(sections) {
	const slots = slotPositions(sections);
	/** @type {Beat[]} */
	const beats = [];

	let k = 0;
	while (k < slots.length) {
		const { bar, barStart, meter } = slots[k];
		const quarters = barQuarters(meter);
		let q = 0;
		for (const group of beatGroups(quarters)) {
			for (let i = 0; i < group; i++, q++) {
				const time = barStart + q;
				while (slots[k + 1]?.bar === bar && slots[k + 1].start <= time) k++;
				beats.push({
					time,
					role: i === 0 ? 'boom' : 'chuck',
					length: i === 0 ? group : 1,
					slot: k,
					bar,
					beatInBar: q
				});
			}
		}
		while (slots[k]?.bar === bar) k++;
	}

	const last = slots.at(-1);
	const quarters = last ? last.barStart + barQuarters(last.meter) : 0;
	return { beats, quarters, slots };
}
