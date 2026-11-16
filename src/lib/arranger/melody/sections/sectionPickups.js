/**
 * A section's pickup laid over the end of whatever plays before it, and
 * lifted back out when the tune as played is written back.
 *
 * A verse's "I was…" belongs to the verse, but it's sung in the last beats
 * of the section before: after the intro once, after a chorus the next
 * time. So when the tune is put together, the last beats before each
 * section with a pickup play that pickup in every voice: notes starting
 * there make way, and a note ringing into them stops where they start. An
 * empty pickup is a rest. (The first section's pickup is the song's pickup
 * bar, before bar 1: playedTune puts it there.)
 *
 * Written back, it's the other way round: notes starting in those beats
 * are the section's pickup, and the section before gets back its own notes
 * there (and its cut note its own length), so drawing a pickup in the roll
 * never changes the section before.
 */
import { readScore } from '../roll/readScore.js';
import { isPickup, rewriteAbc } from '../roll/scoreToAbc.js';
import { barEvents, writeBar } from '../roll/writeBar.js';
import { TICKS_PER_QUARTER } from '../roll/ticks.js';
import { MELODY_VOICE, pickupBar } from './tuneBySection.js';

/**
 * @typedef {import('./tuneBySection.js').TuneBySection} TuneBySection
 * @typedef {import('./tuneBySection.js').SectionInstance} SectionInstance
 * @typedef {import('./tuneBySection.js').Fill} Fill
 * @typedef {import('../roll/editNotes.js').DrawnNote} DrawnNote
 * @typedef {import('../roll/readScore.js').Score} Score
 * @typedef {{ parse: (abc: string) => any, barCounts: number[] }} Reading
 *   parse: abcjs's reader; barCounts: each instance's bars in the chart
 * @typedef {{ source: string, from: number, to: number }} Region
 *   the beats (ticks) a later section's pickup plays in
 */

/**
 * Does any section after the first have a pickup to lay in?
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 */
export function hasLaterPickups(tune, instances) {
	return instances.slice(1).some((instance) => !!tune.pickups[instance.source]?.quarters);
}

/**
 * The tune as played with every later section's pickup laid in.
 * @param {string} base the tune as played without them (playedTune)
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {Fill} fill
 * @param {Reading} reading
 */
export function withPickupsLaidIn(base, tune, instances, fill, reading) {
	const parsed = reading.parse(base);
	if (!parsed) return base;
	let text = base;
	// The last voice first, so the earlier ones' places in the text still hold
	voiceIds(tune)
		.map((id, index) => ({ id, index }))
		.reverse()
		.forEach(({ id, index }) => {
			const { score } = readScore(base, parsed, index);
			let notes = score.notes;
			for (const region of regionsOf(score, tune, instances, reading)) {
				const bar = pickupBar(tune, id, region.source, fill) ?? '';
				const pickup = pickupNotes(bar, tune.header, reading).map((note) => ({
					...note,
					start: note.start + region.from
				}));
				notes = [...makeWay(notes, region), ...within(pickup, region)];
			}
			notes = sorted(notes);
			if (!sameNotes(notes, score.notes)) text = rewriteAbc(text, score, notes);
		});
	return text;
}

/**
 * The tune as played, written back with its later pickups lifted out:
 * each pickup's notes as a bar, and the text with the section before
 * given back its own notes in those beats (from `base`).
 * @param {string} written
 * @param {string} base the tune as played before (playedTune, nothing laid in)
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {Reading} reading
 * @returns {{ text: string, lifted: import('./tuneBySection.js').PickupBars } | null}
 *   null when it can't be read (bars added or taken away)
 */
export function withPickupsLifted(written, base, tune, instances, reading) {
	const writtenTune = reading.parse(written);
	const baseTune = reading.parse(base);
	if (!writtenTune || !baseTune) return null;
	/** @type {import('./tuneBySection.js').PickupBars} */
	const lifted = {};
	let text = written;
	const ids = voiceIds(tune);
	for (let index = ids.length - 1; index >= 0; index--) {
		const { score } = readScore(written, writtenTune, index);
		const { score: before } = readScore(base, baseTune, index);
		if (score.bars.length !== before.bars.length) return null;
		let notes = score.notes;
		for (const region of regionsOf(score, tune, instances, reading)) {
			const bar = barOf(within(notes, region), region, score);
			(lifted[region.source] ??= {})[ids[index]] ??= bar;
			const own = before.notes.filter(
				(note) => note.start >= region.from && note.start < region.to
			);
			notes = [...restoreCut(makeWay(notes, region), before.notes, region), ...own];
		}
		notes = sorted(notes);
		if (!sameNotes(notes, score.notes)) text = rewriteAbc(text, score, notes);
	}
	return { text, lifted };
}

/**
 * The beats each later section's pickup plays in.
 * @param {Score} score a voice of the tune as played
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {Reading} reading
 * @returns {Region[]}
 */
function regionsOf(score, tune, instances, reading) {
	const lead = score.bars.length > 0 && isPickup(score, 0) ? 1 : 0;
	/** @type {Region[]} */
	const regions = [];
	let bar = lead;
	instances.forEach(({ source }, index) => {
		const start = score.bars[bar]?.start;
		bar += reading.barCounts[index] ?? 0;
		const quarters = tune.pickups[source]?.quarters ?? 0;
		if (index === 0 || !quarters || start === undefined) return;
		const from = Math.max(0, start - quarters * TICKS_PER_QUARTER);
		regions.push({ source, from, to: start });
	});
	return regions;
}

/**
 * Notes making way for a pickup: those starting in its beats go, and one
 * ringing into them stops where they start.
 * @param {DrawnNote[]} notes
 * @param {Region} region
 */
function makeWay(notes, region) {
	return notes
		.filter((note) => note.start < region.from || note.start >= region.to)
		.map((note) =>
			note.start < region.from && note.start + note.length > region.from
				? { ...note, length: region.from - note.start }
				: note
		);
}

/**
 * A note cut short by a pickup given back its own length, from before.
 * @param {DrawnNote[]} notes
 * @param {DrawnNote[]} before
 * @param {Region} region
 */
function restoreCut(notes, before, region) {
	return notes.map((note) => {
		if (note.start + note.length !== region.from) return note;
		const own = before.find((each) => each.start === note.start && each.midi === note.midi);
		return own && own.length > note.length ? { ...note, length: own.length } : note;
	});
}

/**
 * Notes starting in a pickup's beats, cut at its end.
 * @param {DrawnNote[]} notes
 * @param {Region} region
 */
function within(notes, region) {
	return notes
		.filter((note) => note.start >= region.from && note.start < region.to)
		.map((note) => ({ ...note, length: Math.min(note.length, region.to - note.start) }));
}

/**
 * A pickup's notes written as its bar.
 * @param {DrawnNote[]} notes in the region
 * @param {Region} region
 * @param {Score} score the voice they're from (its key, unit and time)
 */
function barOf(notes, region, score) {
	const meter = score.bars.find((bar) => bar.start <= region.from)?.meter ?? { num: 4, den: 4 };
	const bar = { start: region.from, length: region.to - region.from, meter, from: null, to: null };
	return `${writeBar(bar, barEvents(bar, notes, []), { key: score.key, unit: score.unit, pickup: true })} |`;
}

/**
 * A pickup bar's notes, timed from its start.
 * @param {string} bar
 * @param {string} header the tune's header (for its key and note length)
 * @param {Reading} reading
 * @returns {DrawnNote[]}
 */
function pickupNotes(bar, header, reading) {
	if (!bar.trim()) return [];
	const abc = `${header.trimEnd()}\n${bar}\n`;
	const parsed = reading.parse(abc);
	return parsed ? readScore(abc, parsed, 0).score.notes : [];
}

/** @param {TuneBySection} tune */
function voiceIds(tune) {
	return [MELODY_VOICE, ...tune.voices.map((voice) => voice.id)];
}

/** @param {DrawnNote[]} notes */
function sorted(notes) {
	return notes.toSorted((a, b) => a.start - b.start || a.midi - b.midi);
}

/**
 * @param {DrawnNote[]} a
 * @param {DrawnNote[]} b
 */
function sameNotes(a, b) {
	return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}
