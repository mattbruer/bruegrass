/**
 * The music keypad's text rules: what each key does to the arrangement text.
 * Pure functions (text and caret in, text and caret out) so they're easy to
 * test; ArrangementKeypad.svelte applies the result to the textarea.
 */

/**
 * @typedef {{ id: string, label: string, kind: 'chord' | 'text' | 'action', text?: string, wide?: boolean }} Key
 * @typedef {{ value: string, caret: number }} Edit
 */

/** @param {string} label @param {string} [text] @returns {Key} */
const chord = (label, text = label) => ({ id: `chord-${label}`, label, kind: 'chord', text });
/** @param {string} id @param {string} label @param {string} value @param {boolean} [wide] @returns {Key} */
const text = (id, label, value, wide) => ({ id, label, kind: 'text', text: value, wide });
/** @param {string} id @param {string} label @param {boolean} [wide] @returns {Key} */
const action = (id, label, wide) => ({ id, label, kind: 'action', wide });

/** Keypad rows, top to bottom. */
export const KEYS = [
	['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((root) => chord(root)),
	[
		text('sharp', '#', '#'),
		text('flat', 'b', 'b'),
		text('minor', 'm', 'm'),
		text('seventh', '7', '7'),
		text('slash', '/', '/'),
		text('comma', ',', ','),
		text('bar', '|', '|'),
		action('backspace', '⌫')
	],
	[
		action('time', 'Time'),
		action('as', 'as'),
		action('part', 'New part', true),
		text('space', '␣', ' '),
		action('left', '←'),
		action('right', '→'),
		text('newline', '⏎', '\n')
	]
];

/** Time signature keys: "from now on" and "this bar only". */
export const TIME_KEYS = [
	{ label: '4/4', text: '[M:4/4]', note: 'from now on' },
	{ label: '3/4', text: '[M:3/4]', note: 'from now on' },
	{ label: '2/2', text: '[M:2/2]', note: 'from now on' },
	{ label: '2/4', text: '[2/4]', note: 'this bar' },
	{ label: '3/4', text: '[3/4]', note: 'this bar' },
	{ label: '5/4', text: '[5/4]', note: 'this bar' }
];

/** A complete chord name, as far as the keypad can type one. */
const CHORD = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?\d*(:[^\s,|/]+)?(\/[A-G][#b]?)?$/;

/** Prefix of the key id for one of your own chords (My chords). */
const YOUR_CHORD = 'your-chord:';

/**
 * The key id that types one of your own chord names.
 * @param {string} name
 */
export const yourChordKey = (name) => YOUR_CHORD + name;

/**
 * Insert text at the caret (replacing any selection).
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @param {string} insert
 * @param {number} [caretOffset] where the caret ends up inside `insert` (default: after it)
 * @returns {Edit}
 */
export function insertText(value, start, end, insert, caretOffset = insert.length) {
	return { value: value.slice(0, start) + insert + value.slice(end), caret: start + caretOffset };
}

/** @param {string} value @param {number} at */
function lineBefore(value, at) {
	return value.slice(value.lastIndexOf('\n', at - 1) + 1, at);
}

/** Is the caret inside a part name ("…")? */
function inName(/** @type {string} */ value, /** @type {number} */ at) {
	return (lineBefore(value, at).split('"').length - 1) % 2 === 1;
}

/**
 * A chord key: a comma first when it follows another chord, so G then C
 * gives "G,C".
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @param {string} root
 */
function chordKey(value, start, end, root) {
	const token =
		lineBefore(value, start)
			.split(/[|,\s[\]"]/)
			.pop() ?? '';
	const needsComma = !inName(value, start) && CHORD.test(token);
	return insertText(value, start, end, (needsComma ? ',' : '') + root);
}

/**
 * What a key does.
 * @param {string} value textarea text
 * @param {number} start selection start
 * @param {number} end selection end
 * @param {string} key a key id from KEYS, a TIME_KEYS text, yourChordKey(name) or 'leave-name'
 * @returns {Edit}
 */
export function applyKey(value, start, end, key) {
	const keyDef = KEYS.flat().find((k) => k.id === key);
	if (keyDef?.kind === 'chord')
		return chordKey(value, start, end, /** @type {string} */ (keyDef.text));
	if (keyDef?.kind === 'text')
		return insertText(value, start, end, /** @type {string} */ (keyDef.text));
	if (key.startsWith(YOUR_CHORD)) return chordKey(value, start, end, key.slice(YOUR_CHORD.length));
	if (key.startsWith('[')) return insertText(value, start, end, key); // time signature

	switch (key) {
		case 'backspace': {
			if (start !== end) return insertText(value, start, end, '');
			if (start === 0) return { value, caret: 0 };
			// A whole [M:3/4] tag goes at once
			if (value[start - 1] === ']') {
				const open = value.lastIndexOf('[', start - 1);
				const newline = value.lastIndexOf('\n', start - 1);
				if (open > newline) return insertText(value, open, start, '');
			}
			return insertText(value, start - 1, start, '');
		}
		case 'left':
			return { value, caret: Math.max(0, start === end ? start - 1 : start) };
		case 'right':
			return { value, caret: Math.min(value.length, start === end ? end + 1 : end) };
		case 'as': {
			// "Name"|  →  "Name" as   (a repeat doesn't take bars)
			const before = value.slice(0, start);
			const trimmed = before.endsWith('"|') ? before.slice(0, -1) : before;
			const space = trimmed.endsWith(' ') || trimmed.endsWith('\n') || trimmed === '' ? '' : ' ';
			const insert = `${space}as `;
			return { value: trimmed + insert + value.slice(end), caret: trimmed.length + insert.length };
		}
		case 'part': {
			// New line with an empty name, caret between the quotes
			const atLineStart = start === 0 || value[start - 1] === '\n';
			const insert = `${atLineStart ? '' : '\n'}""`;
			return insertText(value, start, end, insert, insert.length - 1);
		}
		case 'leave-name': {
			// Back from typing a name: step past the closing quote, add the first barline
			if (!inName(value, start) || value[start] !== '"') return { value, caret: start };
			const after = start + 1;
			if (value[after] === '|' || value.slice(after).startsWith(' as'))
				return { value, caret: after + 1 };
			return insertText(value, after, after, '|');
		}
		default:
			return { value, caret: end };
	}
}
