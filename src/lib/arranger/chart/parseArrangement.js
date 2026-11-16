import { DEFAULT_METER } from './timeline.js';
import { parseMeterField } from './meterField.js';
import { sectionBlocks } from './sectionBlocks.js';
import { isKeyField, parseKeyField } from './keyField.js';
import { splitMark } from './analysisMarks.js';
import { chartTokens, isBar } from './chartTokens.js';

/**
 * Parse the arrangement text.
 *
 *   "Chorus"|G,G|C,C|G,G|D,D|
 *   "Waltz" [M:3/4] |G|G|C|D|
 *   "Crooked"|G,G|C,C|[2/4]D|G,G|
 *   "Break" as Chorus
 *
 * - Each line is a section; `|` separates bars, `,` separates chords in a bar
 *   (the bar's beats are shared between them).
 * - `[M:3/4]` changes the time signature from that bar on, like an abc
 *   inline field. It carries on into later sections until changed again.
 *   `[M:C]` is 4/4 and `[M:C|]` is 2/2 (cut time).
 * - `[2/4]` (no `M:`) sets the time signature for that one bar only, for
 *   the extra or missing beats of a crooked tune.
 * - Default is 4/4.
 * - `[K:G]` names the song's key (keyField.js), when the first chord
 *   doesn't give it. Every section carries it as `key` (null if not named).
 * - Lines under a section line are its lyrics (see sectionLyrics.js);
 *   the chord chart ignores them.
 * - `A7{V7/V}`: your own analysis of a chord (analysisMarks.js), kept in
 *   `marks`, parallel to `measures` (null where there's none).
 * - `held`, parallel to `measures`: true for a bar left empty, which holds
 *   the chord before it (drawn without a chord name).
 *
 * @returns {{ name: string, measures: string[][], meters: import('./timeline.js').Meter[], marks: (string | null)[][], held: boolean[], key: import('./key.js').Key | null }[]}
 */
export function parseArrangement(source) {
	/** @type {{ name: string, measures?: string[][], meters?: import('./timeline.js').Meter[], marks?: (string | null)[][], held?: boolean[], reference?: string, key?: import('./key.js').Key | null }[]} */
	const sections = [];
	let meter = DEFAULT_METER;
	/** @type {import('./key.js').Key | null} */
	let key = null;
	/** @type {string | null} */
	let chordBefore = null;

	for (const { name, content } of sectionBlocks(source)) {
		if (content.startsWith('as ')) {
			sections.push({
				name,
				reference: content.slice(3).trim()
			});
			continue;
		}

		const measures = [];
		const meters = [];
		const marks = [];
		const held = [];
		/** @type {import('./timeline.js').Meter | null} */
		let barOnly = null;
		let text = '';
		let afterBarline = false;

		const endBar = () => {
			let chords = text
				.split(',')
				.map((chord) => chord.trim())
				.filter(Boolean)
				.map(splitMark);
			text = '';
			if (!isBar(chords.length > 0, afterBarline)) return; // fields wait for a bar
			held.push(chords.length === 0);
			if (chords.length === 0) chords = [{ chord: carriedChord(chordBefore, name), mark: null }];
			chordBefore = chords.at(-1).chord;
			measures.push(chords.map(({ chord }) => chord));
			marks.push(chords.map(({ mark }) => mark));
			meters.push(barOnly ?? meter);
			barOnly = null;
		};

		for (const token of chartTokens(content)) {
			if (token === '|') {
				endBar();
				afterBarline = true;
			} else if (isKeyField(token)) key ??= parseKeyField(token, name);
			else if (token.startsWith('[')) {
				const field = parseMeterField(token, name);
				if (field.persistent) meter = field.meter;
				else barOnly = field.meter;
			} else text += token;
		}
		if (text.trim()) endBar(); // chords after the last barline

		sections.push({ name, measures, meters, marks, held });
	}

	// Resolve repeated sections
	for (const section of sections) {
		if (!section.reference) continue;

		const original = sections.find((item) => item.name === section.reference);

		if (!original || original.reference) {
			throw new Error(`Unknown section: ${section.reference}`);
		}

		section.measures = structuredClone(original.measures);
		section.meters = structuredClone(original.meters);
		section.marks = structuredClone(original.marks);
		section.held = structuredClone(original.held);
		delete section.reference;
	}

	for (const section of sections) section.key = key;

	return /** @type {{ name: string, measures: string[][], meters: import('./timeline.js').Meter[], marks: (string | null)[][], held: boolean[], key: import('./key.js').Key | null }[]} */ (
		sections
	);
}

/**
 * @param {string | null} chordBefore
 * @param {string} section
 */
function carriedChord(chordBefore, section) {
	if (chordBefore === null) throw new Error(`An empty bar needs a chord before it (${section})`);
	return chordBefore;
}
