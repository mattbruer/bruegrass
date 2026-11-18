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
 * - `[K:G]` names the key from there on (keyField.js), carrying into
 *   later sections until changed, like `[M:]`: a B part in minor, a
 *   modulation. Inside a bar it changes the key from the next chord, for a
 *   pivot chord (`|G,[K:Em]Am|`). `keys`, parallel to `measures`, is each
 *   chord's key (null before any is named). A `[K:]` before the first bar names the song's
 *   key, which every section carries as `key` (null if not named: the
 *   first chord says it).
 * - Lines under a section line are its lyrics (see sectionLyrics.js);
 *   the chord chart ignores them.
 * - `A7{V7/V}`: your own analysis of a chord (analysisMarks.js), kept in
 *   `marks`, parallel to `measures` (null where there's none).
 * - `held`, parallel to `measures`: true for a bar left empty, which holds
 *   the chord before it (drawn without a chord name).
 *
 * @returns {{ name: string, measures: string[][], meters: import('./timeline.js').Meter[], marks: (string | null)[][], held: boolean[], keys: (import('./key.js').Key | null)[][], key: import('./key.js').Key | null }[]}
 */
export function parseArrangement(source) {
	/** @type {{ name: string, measures?: string[][], meters?: import('./timeline.js').Meter[], marks?: (string | null)[][], held?: boolean[], keys?: (import('./key.js').Key | null)[][], reference?: string, key?: import('./key.js').Key | null }[]} */
	const sections = [];
	let meter = DEFAULT_METER;
	/** @type {import('./key.js').Key | null} the key in force */
	let key = null;
	/** @type {import('./key.js').Key | null} named before the first bar */
	let songKey = null;
	let barsSoFar = 0;
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
		const keys = [];
		/** @type {import('./timeline.js').Meter | null} */
		let barOnly = null;
		let text = '';
		let afterBarline = false;
		/** @type {{ from: number, key: import('./key.js').Key }[]} keys named inside this bar, from which chord */
		let keyChanges = [];

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
			keys.push(
				chords.map((_, c) => keyChanges.findLast((change) => change.from <= c)?.key ?? key)
			);
			key = keyChanges.at(-1)?.key ?? key;
			keyChanges = [];
			barsSoFar += 1;
			barOnly = null;
		};

		for (const token of chartTokens(content)) {
			if (token === '|') {
				endBar();
				afterBarline = true;
			} else if (isKeyField(token)) {
				const from = text.split(',').filter((chord) => chord.trim()).length;
				const named = parseKeyField(token, name);
				if (barsSoFar === 0 && from === 0) songKey = named;
				keyChanges.push({ from, key: named });
			} else if (token.startsWith('[')) {
				const field = parseMeterField(token, name);
				if (field.persistent) meter = field.meter;
				else barOnly = field.meter;
			} else text += token;
		}
		if (text.trim()) endBar(); // chords after the last barline
		key = keyChanges.at(-1)?.key ?? key; // named after the section's last bar: from the next one on

		sections.push({ name, measures, meters, marks, held, keys });
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
		section.keys = structuredClone(original.keys);
		delete section.reference;
	}

	for (const section of sections) section.key = songKey;

	return /** @type {{ name: string, measures: string[][], meters: import('./timeline.js').Meter[], marks: (string | null)[][], held: boolean[], keys: (import('./key.js').Key | null)[][], key: import('./key.js').Key | null }[]} */ (
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
