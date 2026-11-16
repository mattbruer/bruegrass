/**
 * Where each note of a part is played: a string and a fret. Your own
 * choices (a string per note) win; any other note goes where it's lowest on
 * the neck, the way bluegrass is usually played. Notes that start together
 * (a double stop) each get their own string, as low on the neck as they fit together. Plain logic: the board and the
 * choices are parameters.
 */

/**
 * @typedef {import('./fretboards.js').Fretboard} Fretboard
 * @typedef {import('../melody/roll/editNotes.js').DrawnNote} DrawnNote
 * @typedef {{ string: number, fret: number }} Place string: index into the board's strings
 * @typedef {{ note: DrawnNote, place: Place | null, options: Place[] }} TabNote
 *   place: null when the instrument can't play it; options: every place it could go
 */

/**
 * A note's key in your saved choices: where it starts and its pitch.
 * @param {DrawnNote} note
 */
export function noteKey(note) {
	return `${note.start}:${note.midi}`;
}

/**
 * Every place on the board that plays this pitch, lowest fret first.
 * @param {number} midi
 * @param {Fretboard} board
 * @returns {Place[]}
 */
export function placesFor(midi, board) {
	return board.strings
		.flatMap((string, index) => {
			const fret = fretOn(string, midi, board.frets);
			return fret === null ? [] : [{ string: index, fret }];
		})
		.toSorted((a, b) => a.fret - b.fret || a.string - b.string);
}

/**
 * @param {import('./fretboards.js').FretString} string
 * @param {number} midi
 * @param {number} frets
 */
function fretOn(string, midi, frets) {
	if (midi === string.open) return 0;
	const fret = midi - string.open + (string.firstFret ?? 0);
	return fret > (string.firstFret ?? 0) && fret <= frets ? fret : null;
}

/**
 * @param {DrawnNote[]} notes in order of start
 * @param {Fretboard} board
 * @param {Record<string, number>} chosen note key → string, your own choices
 * @returns {TabNote[]}
 */
export function tabNotes(notes, board, chosen) {
	/** @type {Map<DrawnNote, Place | null>} */
	const placed = new Map();
	for (const stack of stacksOf(notes)) {
		const choices = stack.map((note) => {
			const options = placesFor(note.midi, board);
			const mine = options.filter((place) => place.string === chosen[noteKey(note)]);
			return mine.length > 0 ? mine : options;
		});
		const best = lowestOnTheNeck(choices);
		stack.forEach((note, i) => placed.set(note, best?.[i] ?? null));
	}
	return notes.map((note) => ({
		note,
		place: placed.get(note) ?? null,
		options: placesFor(note.midi, board)
	}));
}

/**
 * @param {DrawnNote[]} notes in order of start
 * @returns {DrawnNote[][]} notes that start together
 */
function stacksOf(notes) {
	/** @type {Map<number, DrawnNote[]>} */
	const stacks = new Map();
	for (const note of notes) stacks.set(note.start, [...(stacks.get(note.start) ?? []), note]);
	return [...stacks.values()];
}

/**
 * One place per note, each on its own string, as low on the neck as can
 * be: the lowest highest fret, then the fewest frets in all. Stacks are a
 * few notes, so every way is tried.
 * @param {Place[][]} choices each note's possible places
 * @returns {Place[] | null} null when they can't all be played at once
 */
function lowestOnTheNeck(choices) {
	/** @type {Place[] | null} */
	let best = null;
	let bestScore = Infinity;
	/** @param {number} i @param {Place[]} picked */
	const tryFrom = (i, picked) => {
		if (i === choices.length) {
			const frets = picked.map((place) => place.fret);
			const score = Math.max(...frets) * 1000 + frets.reduce((a, b) => a + b, 0);
			if (score < bestScore) [best, bestScore] = [picked, score];
			return;
		}
		for (const place of choices[i]) {
			if (picked.some((each) => each.string === place.string)) continue;
			tryFrom(i + 1, [...picked, place]);
		}
	};
	tryFrom(0, []);
	return best;
}

/**
 * The next string that plays this note (round the options, back to the first).
 * @param {TabNote} tabNote
 * @returns {number | null} the string, or null when there's no other
 */
export function nextString({ place, options }) {
	if (!place || options.length < 2) return null;
	const at = options.findIndex((each) => each.string === place.string);
	return options[(at + 1) % options.length].string;
}
