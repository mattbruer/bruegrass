/**
 * Each bar's time signature, as the chart builder shows and sets it.
 * A bar can change the time for itself only (`[2/4]`, a crooked bar) or
 * from there on (`[M:3/4]`, which carries into later sections).
 */
import { DEFAULT_METER, barQuarters, meterText } from '../chart/timeline.js';
import { chordPlaces } from '../chart/chordPlaces.js';
import { parseMeterField } from '../chart/meterField.js';

/**
 * @typedef {{ time: string, changes: 'bar' | 'on' | null }} BarTime
 *   time: "3/4"; changes: whether this bar sets it (for itself, or from here on)
 */

/**
 * @param {import('../chart/writtenChart.js').WrittenChart} chart
 * @returns {BarTime[][]} per section, per bar (none for a repeat)
 */
export function barTimes(chart) {
	let running = meterText(DEFAULT_METER);
	return chart.sections.map((section) => {
		const times = section.bars.map((bar) => {
			let own = null;
			/** @type {BarTime['changes']} */
			let changes = null;
			for (const field of bar.fields) {
				const read = readTime(field);
				if (!read) continue;
				if (read.persistent) running = read.time;
				else own = read.time;
				changes = own ? 'bar' : 'on';
			}
			return { time: own ?? running, changes };
		});
		for (const field of section.tail) {
			const read = readTime(field);
			if (read?.persistent) running = read.time;
		}
		return times;
	});
}

/**
 * The time fields a bar needs to be in `time`, for itself or from here on.
 * @param {string} time e.g. "3/4"
 * @param {'bar' | 'on'} scope
 * @param {string} before the time the bar would have without a field of its own
 */
export function timeFields(time, scope, before) {
	if (scope === 'bar') return time === before ? [] : [`[${time}]`];
	return time === before ? [] : [`[M:${time}]`];
}

/**
 * The time a bar would have without its own field: the one before it.
 * @param {BarTime[][]} times
 * @param {{ section: number, bar: number }} place
 */
export function timeBefore(times, place) {
	const earlier = [
		...times.slice(0, place.section).flat(),
		...times[place.section].slice(0, place.bar)
	];
	const lastOn = earlier.findLast((time) => time.changes !== 'bar');
	return lastOn?.time ?? meterText(DEFAULT_METER);
}

/**
 * How many chords a bar in this time can have: one per place a chord may
 * change on (two in 4/4, three in 3/4).
 * @param {string} time e.g. "4/4"
 */
export function mostChords(time) {
	const [beats, unit] = time.split('/').map(Number);
	return chordPlaces(barQuarters({ beats, unit })).length;
}

/** @param {string} field */
function readTime(field) {
	if (/^\[K:/i.test(field)) return null;
	try {
		const { persistent, meter } = parseMeterField(field, '');
		return { persistent, time: meterText(meter) };
	} catch {
		return null;
	}
}
