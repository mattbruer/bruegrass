/**
 * A tune kept by section: each section of the chart owns its bars of the
 * tune, in every voice (the melody and each harmony part), so the tune
 * follows the chart. `"Fiddle solo" as Verse` plays Verse's tune, cutting
 * or copying a section's line takes its tune along, and a section with no
 * tune yet plays rests (the melody's with the chart's chords).
 *
 * Kept as plain data (TuneBySection): the ABC header (X: to K:), the
 * harmony voices (their V: lines), each voice's pickup (the bars before
 * bar 1: it starts the song, not a section, so a section played again
 * doesn't play it again) and each section's bars in each voice, by the
 * section's name. Two texts are made from it, and either can be written back:
 *
 * - the tune as played (`playedTune`): each voice through every section in
 *   the chart's order, each section under a `P:` line with its name, voice
 *   after voice (the melody `V:1` first, as harmony parts are written).
 *   Everything that reads or writes the tune (the band, the sheet music,
 *   the piano roll, harmony, a capo change) uses this, as it would a tune
 *   typed whole.
 * - the tune by section (`tuneBySectionText`), the ABC view: each section's
 *   tune once, its voices under it, so every note written has one place.
 *
 * Both are read back by the same reader: a `V:` line says which voice the
 * lines after it are, a `P:` line which section; lines before the first
 * section are a voice's pickup.
 *
 * @typedef {{
 *   header: string,
 *   voices: { id: string, line: string }[],
 *   leads: Record<string, string>,
 *   parts: Record<string, Record<string, string>>
 * }} TuneBySection
 *   voices: the harmony parts (the melody is MELODY_VOICE); leads: each
 *   voice's pickup; parts: section name → voice id → its bars
 * @typedef {{ name: string, source: string }} SectionInstance
 *   a section of the chart in play order, and whose tune it plays (its own
 *   name, or the section it repeats with `as`)
 * @typedef {(index: number) => string} RestsFor
 *   the melody's bars for an instance while its tune has none: rests, with chords
 */
import { sectionBlocks } from '../../chart/sectionBlocks.js';

/** The melody's voice id, as the harmony writer marks it (V:1). */
export const MELODY_VOICE = '1';
/** A line naming the section the bars under it belong to. */
const PART_LINE = /^P:(.*)$/;
/** A line naming the voice the bars under it belong to. */
const VOICE_LINE = /^V:\s*(\S+)/;
/** Words under the notes: they come from the chart, so they're not kept with a section's tune. */
const WORDS_LINE = /^w:/i;
/** The header's last line. */
const KEY_LINE = /^K:/;

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
 * The tune as played: each voice through every section, in the chart's order.
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 */
export function playedTune(tune, instances, restsFor) {
	const voiced = tune.voices.length > 0;
	const voice = (/** @type {string} */ id, /** @type {string} */ line) => [
		...(voiced ? [line] : []),
		...nonEmpty(tune.leads[id]),
		...instances.flatMap((instance, index) => [
			`P:${instance.name}`,
			partOf(tune, id, instance.source, index, restsFor)
		])
	];
	return lines([
		tune.header.trimEnd(),
		...voice(MELODY_VOICE, `V:${MELODY_VOICE}`),
		...tune.voices.flatMap(({ id, line }) => voice(id, line))
	]);
}

/**
 * The tune with each section's tune once (its voices under it), in the
 * order they're first played.
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 */
export function tuneBySectionText(tune, instances, restsFor) {
	const voiced = tune.voices.length > 0;
	const ids = [MELODY_VOICE, ...tune.voices.map((voice) => voice.id)];
	const leads = voiced
		? [
				`V:${MELODY_VOICE}`,
				...nonEmpty(tune.leads[MELODY_VOICE]),
				...tune.voices.flatMap(({ id, line }) => [line, ...nonEmpty(tune.leads[id])])
			]
		: nonEmpty(tune.leads[MELODY_VOICE]);
	const sections = firstOfEach(instances).flatMap(({ source, index }) => [
		`P:${source}`,
		...ids.flatMap((id) => [
			...(voiced ? [`V:${id}`] : []),
			partOf(tune, id, source, index, restsFor)
		])
	]);
	return lines([tune.header.trimEnd(), ...leads, ...sections]);
}

/**
 * The tune as played, written back: a section whose bars changed in a
 * voice gives that voice of its tune those bars (an `as` section changes
 * the section it repeats). Null when it can't be read back that way (a
 * voice without every section, as when an edit adds or takes away a
 * section's line), so the caller keeps it as one tune.
 * @param {string} text
 * @param {TuneBySection} tune what it was made from
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 * @returns {TuneBySection | null}
 */
export function fromPlayedTune(text, tune, instances, restsFor) {
	const read = readTuneText(text);
	if (!read) return null;
	const parts = copyParts(tune.parts);
	for (const id of read.ids) {
		const sections = read.sections.filter((section) => section.voice === id);
		if (sections.length !== instances.length) return null;
		sections.forEach(({ body }, index) => {
			const { source } = instances[index];
			if (body !== partOf(tune, id, source, index, restsFor)) setPart(parts, source, id, body);
		});
	}
	return { header: read.header, voices: read.voices, leads: read.leads, parts };
}

/**
 * The tune by section (the ABC view), written back: each section's bars in
 * each voice are that section's tune. A name the chart doesn't have yet is
 * kept for when it does.
 * @param {string} text
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {RestsFor} restsFor
 * @returns {TuneBySection | null} null when it has no `P:` lines
 */
export function fromTuneBySectionText(text, tune, instances, restsFor) {
	const read = readTuneText(text);
	if (!read || read.sections.length === 0) return null;
	const parts = copyParts(tune.parts);
	for (const { name, voice, body } of read.sections) {
		const index = instances.findIndex((instance) => instance.source === name);
		if (body !== partOf(tune, voice, name, index, restsFor)) setPart(parts, name, voice, body);
	}
	return { header: read.header, voices: read.voices, leads: read.leads, parts };
}

/**
 * ABC read as voices and sections: the header (to K:), each voice's V:
 * line and pickup, and each section's bars in each voice, in order.
 * @param {string} text
 * @returns {{ header: string, voices: TuneBySection['voices'], ids: string[], leads: Record<string, string>,
 *   sections: { name: string, voice: string, body: string }[] } | null} null without a K: line
 */
export function readTuneText(text) {
	const lines = text.split('\n');
	const keyAt = lines.findIndex((line) => KEY_LINE.test(line.trim()));
	if (keyAt === -1) return null;
	/** @type {TuneBySection['voices']} */
	const voices = [];
	/** @type {Record<string, string[]>} */
	const leads = {};
	/** @type {{ name: string, voice: string, lines: string[] }[]} */
	const sections = [];
	const music = lines.slice(keyAt + 1).map((line) => line.trim());
	// As played, a voice's block starts afresh (its pickup, then its sections);
	// in the ABC view, voices are under each section (`P:` then `V:`)
	const voicesUnderSections = music.some(
		(line, i) => PART_LINE.test(line) && VOICE_LINE.test(music.slice(i + 1).find(Boolean) ?? '')
	);
	let voice = MELODY_VOICE;
	/** @type {string | null} */
	let section = null;
	/** @type {{ name: string, voice: string, lines: string[] } | null} */
	let current = null;

	for (const line of music) {
		const voiceMatch = line.match(VOICE_LINE);
		const partMatch = line.match(PART_LINE);
		if (voiceMatch) {
			voice = voiceMatch[1];
			if (voice !== MELODY_VOICE && !voices.some((each) => each.id === voice))
				voices.push({ id: voice, line });
			if (!voicesUnderSections) section = null;
			current = null;
		} else if (partMatch) {
			section = partMatch[1].trim();
			current = null;
		} else if (!line || WORDS_LINE.test(line)) {
			continue;
		} else if (section === null) {
			(leads[voice] ??= []).push(line);
		} else {
			if (!current) {
				current = { name: section, voice, lines: [] };
				sections.push(current);
			}
			current.lines.push(line);
		}
	}

	const read = sections.map(({ name, voice, lines }) => ({
		name,
		voice,
		body: lines.join('\n').trim()
	}));
	return {
		header: lines.slice(0, keyAt + 1).join('\n'),
		voices,
		ids: [MELODY_VOICE, ...voices.map((each) => each.id)],
		leads: Object.fromEntries(
			Object.entries(leads).map(([id, lines]) => [id, lines.join('\n').trim()])
		),
		sections: read
	};
}

/**
 * A section's tune in a voice: its own bars, else rests shaped like its
 * bars in the chart (the melody's with the chart's chords, a harmony
 * part's without).
 * @param {TuneBySection} tune
 * @param {string} voice
 * @param {string} source
 * @param {number} index an instance playing it (-1: none)
 * @param {RestsFor} restsFor
 */
function partOf(tune, voice, source, index, restsFor) {
	const own = tune.parts[source]?.[voice];
	if (own !== undefined) return own.trim();
	if (index < 0) return '';
	const rests = restsFor(index).trim();
	return voice === MELODY_VOICE ? rests : rests.replace(/"[^"]*"/g, '');
}

/**
 * @param {TuneBySection['parts']} parts
 * @param {string} section
 * @param {string} voice
 * @param {string} body
 */
function setPart(parts, section, voice, body) {
	parts[section] = { ...parts[section], [voice]: body };
}

/** @param {TuneBySection['parts']} parts */
function copyParts(parts) {
	return Object.fromEntries(Object.entries(parts).map(([name, voices]) => [name, { ...voices }]));
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

/** @param {string | undefined} text */
function nonEmpty(text) {
	return text?.trim() ? [text.trim()] : [];
}

/** @param {string[]} parts */
function lines(parts) {
	return parts.filter((part) => part !== '').join('\n') + '\n';
}
