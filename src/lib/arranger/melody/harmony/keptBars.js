/**
 * Bars of a generated line you've locked: they stay as they are, whatever
 * the lead or the chords do, until you unlock them. A bar you change by
 * hand is locked for you, so your change is never written over.
 *
 * The lock is kept in the bar itself, as an ABC remark just before its
 * first note (`| [r:kept] g d c B |`): abcjs and other ABC readers skip it,
 * and it moves with its bar wherever the tune goes (by section, copied,
 * cut). The piano roll's edits and the line's rewrites only change a bar's
 * notes (from its first note to its last), so the lock stays put.
 * Locking half a bar would be a second kind of remark (where in the bar it starts).
 */

const KEPT = '[r:kept]';

/** @typedef {{ from: number | null, to: number | null }} BarText where a bar's notes are (readScore.js) */

/**
 * Which of a voice's bars are locked.
 * @param {string} abc
 * @param {BarText[]} bars the voice's bars, read from this ABC
 * @returns {Set<number>}
 */
export function keptBars(abc, bars) {
	const kept = new Set();
	bars.forEach((bar, index) => {
		const before = gapBefore(bars, index);
		if (before && abc.slice(before.from, before.to).includes(KEPT)) kept.add(index);
	});
	return kept;
}

/**
 * The ABC with some of a voice's bars locked, or unlocked.
 * @param {string} abc
 * @param {BarText[]} bars the voice's bars, read from this ABC
 * @param {Iterable<number>} indexes
 * @param {boolean} locked
 */
export function withBarsKept(abc, bars, indexes, locked) {
	const kept = keptBars(abc, bars);
	/** @type {{ from: number, to: number, text: string }[]} */
	const edits = [];
	for (const index of new Set(indexes)) {
		const gap = gapBefore(bars, index);
		if (!gap || kept.has(index) === locked) continue;
		if (locked) {
			const at = endOfText(abc, gap);
			edits.push({ from: at, to: at, text: ` ${KEPT}` });
		} else {
			const at = abc.indexOf(KEPT, gap.from);
			const start = abc[at - 1] === ' ' ? at - 1 : at;
			edits.push({ from: start, to: at + KEPT.length, text: '' });
		}
	}
	let text = abc;
	for (const edit of edits.sort((a, b) => b.from - a.from)) {
		text = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
	}
	return text;
}

/**
 * Where a gap's text ends, before the spaces leading up to the bar's first note.
 * @param {string} abc
 * @param {{ from: number, to: number }} gap
 */
function endOfText(abc, gap) {
	let at = gap.to;
	while (at > gap.from && /\s/.test(abc[at - 1])) at--;
	return at;
}

/**
 * The text between a bar's first note and the bar before it (its bar line,
 * and the lock if it has one).
 * @param {BarText[]} bars
 * @param {number} index
 * @returns {{ from: number, to: number } | null}
 */
function gapBefore(bars, index) {
	const bar = bars[index];
	if (bar?.from == null) return null;
	const previous = bars.slice(0, index).findLast((each) => each.to != null);
	const from = previous?.to ?? Math.max(0, bar.from - KEPT.length - 1);
	return { from, to: bar.from };
}
