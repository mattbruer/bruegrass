/**
 * Tunings, as plain data: each is how far every string is tuned from the
 * instrument's standard tuning, in semitones, top line first (the order of
 * fretboards.js). A new tuning is one entry; any other set of steps is a
 * custom tuning. A part's TAB saves its steps (songTab.svelte.js).
 */

/** @typedef {{ id: string, name: string, steps: number[] }} Tuning */

/** @type {Readonly<Record<string, readonly Tuning[]>>} instrument id → its usual tunings, standard first */
export const TUNINGS = Object.freeze({
	guitar: [
		{ id: 'standard', name: 'Standard (EADGBE)', steps: [0, 0, 0, 0, 0, 0] },
		{ id: 'drop-d', name: 'Drop D (DADGBE)', steps: [0, 0, 0, 0, 0, -2] },
		{ id: 'double-drop-d', name: 'Double drop D (DADGBD)', steps: [-2, 0, 0, 0, 0, -2] },
		{ id: 'open-g', name: 'Open G (DGDGBD)', steps: [-2, 0, 0, 0, -2, -2] },
		{ id: 'open-d', name: 'Open D (DADF♯AD)', steps: [-2, -2, -1, 0, 0, -2] },
		{ id: 'dadgad', name: 'DADGAD', steps: [-2, -2, 0, 0, 0, -2] },
		{ id: 'half-step-down', name: 'Half step down', steps: [-1, -1, -1, -1, -1, -1] }
	],
	mandolin: [
		{ id: 'standard', name: 'Standard (GDAE)', steps: [0, 0, 0, 0] },
		{ id: 'cross-a', name: 'Cross A (AEAE)', steps: [0, 0, 2, 2] },
		{ id: 'cross-d', name: 'Cross D (ADAE)', steps: [0, 0, 0, 2] },
		{ id: 'cross-g', name: 'Cross G (GDGD)', steps: [-2, -2, 0, 0] }
	],
	banjo: [
		{ id: 'standard', name: 'Open G (gDGBD)', steps: [0, 0, 0, 0, 0] },
		{ id: 'double-c', name: 'Double C (gCGCD)', steps: [0, 1, 0, -2, 0] },
		{ id: 'open-c', name: 'Open C (gCGBD)', steps: [0, 0, 0, -2, 0] },
		{ id: 'sawmill', name: 'Sawmill (gDGCD)', steps: [0, 1, 0, 0, 0] },
		{ id: 'open-d', name: 'Open D (f♯DF♯AD)', steps: [0, -2, -1, 0, -1] },
		{ id: 'open-a', name: 'Open A (aEAC♯E)', steps: [2, 2, 2, 2, 2] }
	]
});

/** How far a custom tuning can take a string from standard (semitones). */
export const STEP_RANGE = Object.freeze({ lowest: -7, highest: 4 });

const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];

/**
 * The tuning these steps make, if it's one of the instrument's usual ones.
 * @param {string} instrument
 * @param {number[] | undefined} steps
 */
export function namedTuning(instrument, steps) {
	return (TUNINGS[instrument] ?? []).find((tuning) => sameSteps(tuning.steps, steps)) ?? null;
}

/**
 * The board tuned this way: each string's open pitch moved, its name the
 * new note (lower case where the board's was: a guitar's high e, a banjo's
 * short 5th string).
 * @param {import('./fretboards.js').Fretboard} board
 * @param {number[] | undefined} steps none: standard
 * @returns {import('./fretboards.js').Fretboard}
 */
export function tunedBoard(board, steps) {
	if (!steps || steps.every((step) => step === 0)) return board;
	return {
		...board,
		strings: board.strings.map((string, index) => {
			const step = steps[index] ?? 0;
			if (step === 0) return string;
			const open = string.open + step;
			return { ...string, open, name: stringName(open, string.name) };
		})
	};
}

/**
 * @param {number} midi
 * @param {string} standardName
 */
export function stringName(midi, standardName) {
	const name = NOTE_NAMES[((midi % 12) + 12) % 12];
	const lower = standardName[0] === standardName[0].toLowerCase();
	return lower ? name[0].toLowerCase() + name.slice(1) : name;
}

/**
 * @param {number[]} a
 * @param {number[] | undefined} b none: standard
 */
function sameSteps(a, b) {
	return a.every((step, index) => step === (b?.[index] ?? 0));
}
