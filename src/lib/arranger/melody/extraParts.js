/**
 * Extra parts: lines of the tune written by ear (a vocal line, a mandolin
 * break, a fiddle part), added with Transcribe's + Lane. Each is a voice of
 * the tune's ABC like a harmony part (`V:part-1 name="P1"`), so it's drawn,
 * played on its own mixer channel, saved, cut by section and exported the
 * same way, but it's never written from the melody: it starts as rests.
 *
 * id: its ABC voice and mixer channel. label: written on the sheet music,
 * and how abcjs's parse finds its channel (partChannels.js). Its name is the
 * song's to change (partNames.js). A new slot is one entry.
 */
export const EXTRA_PARTS = Object.freeze(
	[1, 2, 3, 4, 5, 6].map((number) => ({
		id: `part-${number}`,
		name: `Part ${number}`,
		label: `P${number}`
	}))
);

const EXTRA_PART_LINE = /^V:(part-\d+)\b/gm;
const ANY_VOICE_LINE = /^V:\s*(\S+)/gm;

/** @param {string} id */
export function isExtraPart(id) {
	return EXTRA_PARTS.some((part) => part.id === id);
}

/**
 * The extra parts the ABC has, in order.
 * @param {string} abc
 * @returns {string[]}
 */
export function extraPartsIn(abc) {
	return [...abc.matchAll(EXTRA_PART_LINE)].map((match) => match[1]);
}

/**
 * The first extra part the ABC hasn't got yet, or null when every slot is used.
 * @param {string} abc
 */
export function nextExtraPart(abc) {
	const used = extraPartsIn(abc);
	return EXTRA_PARTS.find((part) => !used.includes(part.id)) ?? null;
}

/**
 * Each extra part's whole text (its V: line and music up to the next voice).
 * @param {string} abc
 * @returns {{ id: string, from: number, to: number }[]}
 */
export function extraPartBlocks(abc) {
	const voices = [...abc.matchAll(ANY_VOICE_LINE)].map((match) => ({
		id: match[1],
		from: match.index
	}));
	return voices
		.map((voice, i) => ({ ...voice, to: voices[i + 1]?.from ?? abc.length }))
		.filter((voice) => isExtraPart(voice.id));
}

/**
 * The ABC without one extra part.
 * @param {string} abc
 * @param {string} id
 */
export function withoutExtraPart(abc, id) {
	const block = extraPartBlocks(abc).find((each) => each.id === id);
	return block ? withoutLoneLeadVoice(abc.slice(0, block.from) + abc.slice(block.to)) : abc;
}

/**
 * The ABC with a new extra part at the end: the melody's bars with nothing
 * in them. The melody is marked V:1 (abcjs plays voices together only then).
 * @param {string} abc
 * @param {string} resting the same ABC with the melody's notes all rests
 *   (rewriteAbc with no notes), so the new part keeps its bars and repeats
 * @param {(typeof EXTRA_PARTS)[number]} part
 */
export function withExtraPart(abc, resting, part) {
	const lead = withLeadVoice(abc);
	const body = melodyBody(resting).replace(/"[^"]*"/g, '');
	const music = body
		.split('\n')
		.filter((line) => !/^[wW]:/.test(line) && line.trim() !== '')
		.join('\n');
	return `${lead.trimEnd()}\nV:${part.id} name="${part.label}"\n${music}\n`;
}

/**
 * The melody's music: after the header (and its V:1 line), up to the first other voice.
 * @param {string} abc
 */
function melodyBody(abc) {
	const start = bodyStart(abc);
	const next = /^V:(?!1\b)/m.exec(abc.slice(start));
	return abc.slice(start, next ? start + next.index : abc.length);
}

/** @param {string} abc */
function bodyStart(abc) {
	const keyLine = /^K:.*$/m.exec(abc);
	const headerEnd = keyLine ? keyLine.index + keyLine[0].length + 1 : 0;
	const lead = /^V:1[ \t]*(\n|$)/.exec(abc.slice(headerEnd));
	return headerEnd + (lead ? lead[0].length : 0);
}

/**
 * The ABC without its melody's V:1 line once no other voice is left, so
 * taking the last part away gives back the tune as it was.
 * @param {string} abc
 */
function withoutLoneLeadVoice(abc) {
	const others = [...abc.matchAll(ANY_VOICE_LINE)].filter((match) => match[1] !== '1');
	if (others.length > 0) return abc;
	const keyLine = /^K:.*$/m.exec(abc);
	const headerEnd = keyLine ? keyLine.index + keyLine[0].length + 1 : 0;
	const lead = /^V:1[ \t]*(\n|$)/.exec(abc.slice(headerEnd));
	return lead ? abc.slice(0, headerEnd) + abc.slice(headerEnd + lead[0].length) : abc;
}

/**
 * The ABC with its melody marked V:1, if it wasn't.
 * @param {string} abc
 */
function withLeadVoice(abc) {
	const keyLine = /^K:.*$/m.exec(abc);
	const headerEnd = keyLine ? keyLine.index + keyLine[0].length + 1 : 0;
	if (/^V:1[ \t]*(\n|$)/.test(abc.slice(headerEnd))) return abc;
	return `${abc.slice(0, headerEnd)}V:1\n${abc.slice(headerEnd)}`;
}
