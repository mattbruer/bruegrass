/**
 * "Make it its own": a section that plays another's tune (`"Verse 2" as
 * Verse`, or a second section with the same name) gets its own copy of
 * that section's chords and tune, to change from there: a verse copied as
 * the starting point for the next one, whose words fit the notes a little
 * differently.
 */
import { sectionBlocks } from '../../chart/sectionBlocks.js';
import { uniqueName } from '../../state/uniqueName.js';
import { sectionInstances } from './tuneBySection.js';

/**
 * Is this section a copy playing another's tune (so it can be made its
 * own)? A repeat (`as`), or a second section written with the same name;
 * never the section whose tune it is.
 * @param {import('./tuneBySection.js').SectionInstance[]} instances
 * @param {number} index
 */
export function sharesItsTune(instances, index) {
	const { name, source } = instances[index];
	if (name !== source) return true;
	return instances.findIndex((other) => other.name === source && other.source === source) !== index;
}

/**
 * @param {string} chart
 * @param {import('./tuneBySection.js').TuneBySection} tune
 * @param {number} index the section, in the chart's order
 * @returns {{ chart: string, tune: import('./tuneBySection.js').TuneBySection, name: string } | null}
 *   name: what the section is called now (a copy needs a name of its own)
 */
export function madeItsOwn(chart, tune, index) {
	const instances = sectionInstances(chart);
	if (!instances[index] || !sharesItsTune(instances, index)) return null;
	const { name, source } = instances[index];
	const blocks = sectionBlocks(chart);
	const written = blocks.find((block) => block.name === source && !block.content.startsWith('as '));
	if (!written) return null;

	const ownName =
		name === source
			? uniqueName(
					name,
					blocks.map((block) => block.name)
				)
			: name;
	const lines = chart.split('\n');
	const lineIndex = sectionLine(lines, index);
	lines[lineIndex] = `"${ownName}"${written.content}`;

	const parts = { ...tune.parts };
	if (source in tune.parts) parts[ownName] = tune.parts[source];
	return { chart: lines.join('\n'), tune: { ...tune, parts }, name: ownName };
}

/**
 * The line of the chart holding the nth section.
 * @param {string[]} lines
 * @param {number} index
 */
function sectionLine(lines, index) {
	let count = -1;
	return lines.findIndex((line) => /^\s*"[^"]+"/.test(line) && ++count === index);
}
