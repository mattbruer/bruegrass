import { DEFAULT_METER } from './timeline.js';

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
 *
 * @returns {{ name: string, measures: string[][], meters: import('./timeline.js').Meter[] }[]}
 */
export function parseArrangement(source) {
	/** @type {{ name: string, measures?: string[][], meters?: import('./timeline.js').Meter[], reference?: string }[]} */
	const sections = [];
	let meter = DEFAULT_METER;

	for (const line of source.split('\n')) {
		const match = line.trim().match(/^"([^"]+)"\s*(.*)$/);

		if (!match) continue;

		const [, name, content] = match;

		if (content.startsWith('as ')) {
			sections.push({
				name,
				reference: content.slice(3).trim()
			});
			continue;
		}

		const measures = [];
		const meters = [];
		/** @type {import('./timeline.js').Meter | null} */
		let barOnly = null;
		let text = '';

		const endBar = () => {
			const chords = text
				.split(',')
				.map((chord) => chord.trim())
				.filter(Boolean);
			text = '';
			if (chords.length === 0) return; // fields before the first barline wait for a bar
			measures.push(chords);
			meters.push(barOnly ?? meter);
			barOnly = null;
		};

		// Inline fields first, so the | in [M:C|] isn't read as a barline
		for (const token of content.match(/\[[^\]]*\]|\||[^|[]+/g) ?? []) {
			if (token === '|') endBar();
			else if (token.startsWith('[')) {
				const field = parseField(token, name);
				if (field.persistent) meter = field.meter;
				else barOnly = field.meter;
			} else text += token;
		}
		endBar();

		sections.push({ name, measures, meters });
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
		delete section.reference;
	}

	return /** @type {{ name: string, measures: string[][], meters: import('./timeline.js').Meter[] }[]} */ (
		sections
	);
}

/**
 * @param {string} token e.g. "[M:3/4]", "[2/4]", "[M:C|]"
 * @param {string} section for error messages
 */
function parseField(token, section) {
	const body = token.slice(1, -1).trim();
	const persistent = /^M:/i.test(body);
	const value = persistent ? body.slice(2).trim() : body;

	if (value === 'C') return { persistent, meter: { beats: 4, unit: 4 } };
	if (value === 'C|') return { persistent, meter: { beats: 2, unit: 2 } };

	const fraction = value.match(/^(\d+)\s*\/\s*(\d+)$/);
	if (!fraction)
		throw new Error(
			`Can't read ${token} in ${section}: use a time signature like [M:3/4] or [2/4]`
		);
	const beats = Number(fraction[1]);
	const unit = Number(fraction[2]);
	if (unit !== 2 && unit !== 4) {
		throw new Error(`${token} in ${section}: only time signatures over 4 or 2 are supported`);
	}
	if (beats < 1 || beats > 12) throw new Error(`${token} in ${section}: 1 to 12 beats per bar`);
	return { persistent, meter: { beats, unit } };
}
