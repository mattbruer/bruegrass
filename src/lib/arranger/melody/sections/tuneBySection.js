/**
 * A tune kept by section: each section of the chart owns its bars of the
 * tune, so the tune follows the chart. `"Fiddle solo" as Verse` plays
 * Verse's tune, cutting or copying a section's line takes its tune along,
 * and a section with no tune yet plays rests (with the chart's chords).
 *
 * Kept as plain data, `{ header, parts }`: the ABC header (X:, T:, M:, L:,
 * K:, and a pickup bar if the song starts with one: everything before the
 * first section) and each section's bars in ABC, by the section's name. Two texts are
 * made from it, and either can be written back:
 *
 * - the tune as played (`playedTune`): every section in the chart's order,
 *   each under a `P:` line with its name. Everything that reads or writes
 *   the tune (the band, the sheet music, the piano roll, a capo change)
 *   uses this, as it would a tune typed whole.
 * - the tune by section (`tuneBySectionText`), the ABC view: each tune
 *   once, so every note written has one place.
 *
 * @typedef {{ header: string, parts: Record<string, string> }} TuneBySection
 * @typedef {{ name: string, source: string }} SectionInstance
 *   a section of the chart in play order, and whose tune it plays (its own
 *   name, or the section it repeats with `as`)
 * @typedef {(index: number) => string} RestsFor
 *   the bars an instance plays while its tune has none: rests, with chords
 */
import { sectionBlocks } from '../../chart/sectionBlocks.js';

/** A line naming the section the bars under it belong to. */
const PART_LINE = /^P:(.*)$/;
/** A harmony part's voice, which a tune by section doesn't have yet. */
const OTHER_VOICE = /^V:(?!1\b)/m;

/**
 * The chart's sections in play order, and whose tune each plays.
 * @param {string} chart
 * @returns {SectionInstance[]}
 */
export function sectionInstances(chart) {
	return sectionBlocks(chart).map((block) => ({
		name: block.name,
		source: block.content.startsWith('as ') ? block.content.slice(3).trim() : block.name
	}));
}

/**
 * The tune as played: every section in the chart's order.
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 */
export function playedTune(tune, instances, restsFor) {
	const sections = instances.map(
		(instance, index) => `P:${instance.name}\n${partOf(tune, instance.source, index, restsFor)}`
	);
	return [tune.header.trimEnd(), ...sections].join('\n') + '\n';
}

/**
 * The tune with each section's tune once, in the order they're first played.
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 */
export function tuneBySectionText(tune, instances, restsFor) {
	const sections = firstOfEach(instances).map(
		({ source, index }) => `P:${source}\n${partOf(tune, source, index, restsFor)}`
	);
	return [tune.header.trimEnd(), ...sections].join('\n') + '\n';
}

/**
 * The tune as played, written back: a section whose bars changed gives its
 * tune those bars (an `as` section changes the section it repeats).
 * Null when it can't be read back that way (sections added or taken away
 * by the edit, or a harmony part), so the caller keeps it as one tune.
 * @param {string} text
 * @param {TuneBySection} tune what it was made from
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 * @returns {TuneBySection | null}
 */
export function fromPlayedTune(text, tune, instances, restsFor) {
	if (OTHER_VOICE.test(text)) return null;
	const { header, sections } = splitAtParts(text);
	if (sections.length !== instances.length) return null;
	const parts = { ...tune.parts };
	sections.forEach(({ body }, index) => {
		const { source } = instances[index];
		if (body !== partOf(tune, source, index, restsFor)) parts[source] = body;
	});
	return { header, parts };
}

/**
 * The tune by section (the ABC view), written back: each `P:` block is
 * that section's tune. A name the chart doesn't have yet is kept for when
 * it does.
 * @param {string} text
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 * @returns {TuneBySection | null} null when it has no `P:` lines or has a harmony part
 */
export function fromTuneBySectionText(text, tune, instances, restsFor) {
	if (OTHER_VOICE.test(text)) return null;
	const { header, sections } = splitAtParts(text);
	if (sections.length === 0) return null;
	const parts = { ...tune.parts };
	for (const { name, body } of sections) {
		const index = instances.findIndex((instance) => instance.source === name);
		if (body !== partOf(tune, name, index, restsFor)) parts[name] = body;
	}
	return { header, parts };
}

/**
 * A section's tune: its own bars, else rests shaped like its bars in the chart.
 * @param {TuneBySection} tune
 * @param {string} source
 * @param {number} index an instance playing it (-1: none)
 * @param {RestsFor} restsFor
 */
function partOf(tune, source, index, restsFor) {
	return (tune.parts[source] ?? (index >= 0 ? restsFor(index) : '')).trim();
}

/**
 * Each tune once, with the first instance that plays it.
 * @param {SectionInstance[]} instances
 */
function firstOfEach(instances) {
	return instances
		.map((instance, index) => ({ source: instance.source, index }))
		.filter(({ source }, i, all) => all.findIndex((each) => each.source === source) === i);
}

/**
 * The header (everything before the first `P:` line), and each `P:` block's name and bars.
 * @param {string} text
 */
function splitAtParts(text) {
	const lines = text.split('\n');
	const first = lines.findIndex((line) => PART_LINE.test(line.trim()));
	if (first === -1) return { header: text, sections: [] };
	/** @type {{ name: string, lines: string[] }[]} */
	const sections = [];
	for (const line of lines.slice(first)) {
		const match = line.trim().match(PART_LINE);
		if (match) sections.push({ name: match[1].trim(), lines: [] });
		else sections[sections.length - 1].lines.push(line);
	}
	return {
		header: lines.slice(0, first).join('\n'),
		sections: sections.map(({ name, lines }) => ({ name, body: lines.join('\n').trim() }))
	};
}
