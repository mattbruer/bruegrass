/**
 * A tune kept by section: each section of the chart owns its bars of the
 * tune, in every voice (the melody and each harmony part), so the tune
 * follows the chart. `"Fiddle solo" as Verse` plays Verse's tune, cutting
 * or copying a section's line takes its tune along, and a section with no
 * tune yet plays rests (the melody's with the chart's chords).
 *
 * Kept as plain data (TuneBySection): the ABC header (X: to K:), the
 * harmony voices (their V: lines), each section's bars in each voice, by
 * the section's name, and each section's pickup: the notes before its bar
 * 1, which belong to it (a verse's "I was…"), so wherever it plays they're
 * laid over the last beats of whatever comes before (sectionPickups.js),
 * and at the song's start they're its pickup bar. (`leads`: a song's
 * opening pickup kept apart, from before sections had their own.) Two texts are made from it, and either can be written back:
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
 *   parts: Record<string, Record<string, string>>,
 *   pickups: Record<string, { quarters: number, voices: Record<string, string> }>
 * }} TuneBySection
 *   voices: the harmony parts (the melody is MELODY_VOICE); leads: each
 *   voice's opening pickup; parts: section name → voice id → its bars;
 *   pickups: section name → how long its pickup is, and its bar in each voice
 * @typedef {{ name: string, source: string }} SectionInstance
 *   a section of the chart in play order, and whose tune it plays (its own
 *   name, or the section it repeats with `as`)
 * @typedef {(index: number) => string} RestsFor
 *   the melody's bars for an instance while its tune has none: rests, with chords
 * @typedef {{ restsFor: RestsFor, pickupRests?: (quarters: number) => string }} Fill
 *   what's played where nothing is written: a section's rests, a pickup's rest
 * @typedef {Record<string, Record<string, string>>} PickupBars section → voice → its pickup bar
 */
import { sectionBlocks } from '../../chart/sectionBlocks.js';
import { tuneKeyText, withKeyResets, withoutReset } from './sectionKeys.js';

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
 * The tune as played: each voice through every section, in the chart's
 * order, the first section's pickup (or the song's) before bar 1. Later
 * sections' pickups aren't laid in yet: that needs the notes read
 * (sectionPickups.js `withPickupsLaidIn`).
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {Fill} fill
 */
export function playedTune(tune, instances, fill) {
	const voiced = tune.voices.length > 0;
	const first = instances[0]?.source;
	const tuneKey = tuneKeyText(tune.header);
	const voice = (/** @type {string} */ id, /** @type {string} */ line) => {
		const bodies = withKeyResets(
			instances.map((instance, index) => partOf(tune, id, instance.source, index, fill)),
			tuneKey
		);
		return [
			...(voiced ? [line] : []),
			...nonEmpty(pickupBar(tune, id, first, fill) ?? tune.leads[id]),
			...instances.flatMap((instance, index) => [`P:${instance.name}`, bodies[index]])
		];
	};
	return lines([
		tune.header.trimEnd(),
		...voice(MELODY_VOICE, `V:${MELODY_VOICE}`),
		...tune.voices.flatMap(({ id, line }) => voice(id, line))
	]);
}

/**
 * A section's pickup bar in a voice (null: it has no pickup): its own, else a rest.
 * @param {TuneBySection} tune
 * @param {string} voice
 * @param {string | undefined} source
 * @param {Fill} fill
 * @returns {string | null}
 */
export function pickupBar(tune, voice, source, fill) {
	const pickup = source === undefined ? undefined : tune.pickups[source];
	if (!pickup?.quarters) return null;
	return (pickup.voices[voice] ?? fill.pickupRests?.(pickup.quarters) ?? '').trim();
}

/**
 * The tune with each section's tune once (its voices under it, each
 * starting with the section's pickup bar if it has one), in the order
 * they're first played.
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {Fill} fill
 */
export function tuneBySectionText(tune, instances, fill) {
	const voiced = tune.voices.length > 0;
	const ids = [MELODY_VOICE, ...tune.voices.map((voice) => voice.id)];
	const firstHasPickup = !!tune.pickups[instances[0]?.source]?.quarters;
	const leadOf = (/** @type {string} */ id) => (firstHasPickup ? [] : nonEmpty(tune.leads[id]));
	const leads = voiced
		? [
				`V:${MELODY_VOICE}`,
				...leadOf(MELODY_VOICE),
				...tune.voices.flatMap(({ id, line }) => [line, ...leadOf(id)])
			]
		: leadOf(MELODY_VOICE);
	const shown = firstOfEach(instances);
	const tuneKey = tuneKeyText(tune.header);
	const bodiesOf = Object.fromEntries(
		ids.map((id) => [
			id,
			withKeyResets(
				shown.map(({ source, index }) => partOf(tune, id, source, index, fill)),
				tuneKey
			)
		])
	);
	const sections = shown.flatMap(({ source }, i) => [
		`P:${source}`,
		...ids.flatMap((id) => [
			...(voiced ? [`V:${id}`] : []),
			...nonEmpty(pickupBar(tune, id, source, fill) ?? ''),
			bodiesOf[id][i]
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
 * @param {string} text with later sections' pickups lifted out (sectionPickups.js)
 * @param {TuneBySection} tune what it was made from
 * @param {SectionInstance[]} instances
 * @param {Fill} fill
 * @param {PickupBars} [lifted] the pickups lifted out of it
 * @returns {TuneBySection | null}
 */
export function fromPlayedTune(text, tune, instances, fill, lifted = {}) {
	const read = readTuneText(text);
	if (!read) return null;
	const parts = copyParts(tune.parts);
	const pickups = copyPickups(tune.pickups);
	const tuneKey = tuneKeyText(read.header);
	for (const id of read.ids) {
		const sections = read.sections.filter((section) => section.voice === id);
		if (sections.length !== instances.length) return null;
		sections.forEach(({ body: written }, index) => {
			const body = withoutReset(written, tuneKey);
			const { source } = instances[index];
			if (body !== partOf(tune, id, source, index, fill)) setPart(parts, source, id, body);
		});
	}
	const first = instances[0]?.source;
	const opening = first !== undefined && !!tune.pickups[first]?.quarters;
	const bars = { ...lifted };
	if (opening) bars[first] = { ...read.leads, ...bars[first] };
	for (const [source, voices] of Object.entries(bars))
		for (const [id, bar] of Object.entries(voices)) setPickup(pickups, tune, source, id, bar, fill);
	return {
		header: read.header,
		voices: read.voices,
		leads: opening ? {} : read.leads,
		parts,
		pickups
	};
}

/**
 * The tune by section (the ABC view), written back: each section's bars in
 * each voice are that section's tune (its first bar its pickup, when it has
 * one). A name the chart doesn't have yet is kept for when it does.
 * @param {string} text
 * @param {TuneBySection} tune
 * @param {SectionInstance[]} instances
 * @param {Fill} fill
 * @returns {TuneBySection | null} null when it has no `P:` lines
 */
export function fromTuneBySectionText(text, tune, instances, fill) {
	const read = readTuneText(text);
	if (!read || read.sections.length === 0) return null;
	const parts = copyParts(tune.parts);
	const pickups = copyPickups(tune.pickups);
	const tuneKey = tuneKeyText(read.header);
	for (const { name, voice, body: written } of read.sections) {
		const body = withoutReset(written, tuneKey);
		const index = instances.findIndex((instance) => instance.source === name);
		const { pickup, rest } = tune.pickups[name]?.quarters
			? splitFirstBar(body)
			: { pickup: null, rest: body };
		if (pickup !== null) setPickup(pickups, tune, name, voice, pickup, fill);
		if (rest !== partOf(tune, voice, name, index, fill)) setPart(parts, name, voice, rest);
	}
	return { header: read.header, voices: read.voices, leads: read.leads, parts, pickups };
}

/**
 * A section's bars split after the first bar line: its pickup bar, and the rest.
 * @param {string} body
 */
function splitFirstBar(body) {
	const at = body.indexOf('|');
	if (at === -1) return { pickup: null, rest: body };
	return { pickup: body.slice(0, at + 1).trim(), rest: body.slice(at + 1).trim() };
}

/**
 * Keep a pickup bar in a voice, unless it's what plays anyway (a rest).
 * @param {TuneBySection['pickups']} pickups
 * @param {TuneBySection} tune
 * @param {string} source
 * @param {string} voice
 * @param {string} bar
 * @param {Fill} fill
 */
function setPickup(pickups, tune, source, voice, bar, fill) {
	const pickup = pickups[source];
	if (!pickup?.quarters) return;
	if (bar.trim() === pickupBar(tune, voice, source, fill)) return;
	pickups[source] = { ...pickup, voices: { ...pickup.voices, [voice]: bar.trim() } };
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
 * @param {Fill} fill
 */
function partOf(tune, voice, source, index, fill) {
	const own = tune.parts[source]?.[voice];
	if (own !== undefined) return own.trim();
	if (index < 0) return '';
	const rests = fill.restsFor(index).trim();
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

/** @param {TuneBySection['pickups']} pickups */
function copyPickups(pickups) {
	return Object.fromEntries(
		Object.entries(pickups).map(([name, pickup]) => [
			name,
			{ ...pickup, voices: { ...pickup.voices } }
		])
	);
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
