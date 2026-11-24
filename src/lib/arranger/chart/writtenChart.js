/**
 * The chart as written, as plain data that edits can change and write
 * back as text: what the button editor (components/builder/) works on.
 * Unlike parseArrangement, nothing is worked out (no repeats followed, no
 * held chord filled in, no fields read), so writing it back keeps
 * everything that was typed: fields, marks, repeats and lyric lines. Only
 * spacing is tidied.
 *
 * @typedef {{ chords: string[], fields: string[] }} WrittenBar
 *   chords as written ("A7{V7/V}", "[K:G]D7" for a key named mid-bar); none: a held bar;
 *   fields: `[M:3/4]`, `[2/4]`, `[K:G]` written before the bar's chords
 * @typedef {{ name: string, repeats: string | null, bars: WrittenBar[], tail: string[], lyrics: string[] }} WrittenSection
 *   repeats: the section this one plays again (`"Break" as Chorus`);
 *   tail: fields after the last bar; lyrics: the lines under the section line
 * @typedef {{ before: string[], sections: WrittenSection[] }} WrittenChart
 *   before: lines above the first section, which nothing reads
 */
import { sectionBlocks } from './sectionBlocks.js';
import { chartTokens, isBar } from './chartTokens.js';

/**
 * @param {string} text
 * @returns {WrittenChart}
 */
export function readWrittenChart(text) {
	const lines = text.split('\n');
	const firstSection = lines.findIndex((line) => /^\s*"[^"]+"/.test(line));
	const before = firstSection < 0 ? lines : lines.slice(0, firstSection);
	return {
		before: before.filter((line) => line.trim()),
		sections: sectionBlocks(text).map(({ name, content, lines }) => ({
			name,
			...readContent(content),
			lyrics: lines
		}))
	};
}

/**
 * @param {WrittenChart} chart
 * @returns {string}
 */
export function writeWrittenChart(chart) {
	const sections = chart.sections.map((section) =>
		[sectionLine(section), ...section.lyrics].join('\n')
	);
	return [...chart.before, ...sections].join('\n');
}

/** @param {string} content */
function readContent(content) {
	if (content.startsWith('as ')) {
		return { repeats: content.slice(3).trim(), bars: [], tail: [] };
	}
	/** @type {WrittenBar[]} */
	const bars = [];
	/** @type {string[]} */
	let fields = [];
	let text = '';
	let afterBarline = false;

	const endBar = () => {
		const chords = text
			.split(',')
			.map((chord) => chord.trim())
			.filter(Boolean);
		text = '';
		if (!isBar(chords.length > 0, afterBarline)) return;
		bars.push({ chords, fields });
		fields = [];
	};

	for (const token of chartTokens(content)) {
		if (token === '|') {
			endBar();
			afterBarline = true;
		} else if (token.startsWith('[') && !text.trim()) fields.push(token);
		else text += token;
	}
	if (text.trim()) endBar();
	return { repeats: null, bars, tail: fields };
}

/** @param {WrittenSection} section */
function sectionLine(section) {
	const name = `"${section.name}"`;
	if (section.repeats) return `${name} as ${section.repeats}`;
	if (section.bars.length === 0) return name + section.tail.join('');
	const [first, ...rest] = section.bars;
	const cells = [cell(first, false), ...rest.map((bar) => cell(bar, true))];
	return `${name}${first.fields.join('')}|${cells.join('|')}|${section.tail.join('')}`;
}

/**
 * @param {WrittenBar} bar
 * @param {boolean} withFields the first bar's fields go before the section's first barline
 */
function cell(bar, withFields) {
	const chords = bar.chords.length ? bar.chords.join(',') : ' ';
	return (withFields ? bar.fields.join('') : '') + chords;
}
