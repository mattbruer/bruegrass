/**
 * Rewrite a chord chart's chords in another key, leaving everything else
 * (section names, bar lines, time signatures, spacing) as typed. Every
 * `[K:]` field moves with the chords, and each chord is spelled in the key
 * it's written in.
 */
import { chordLabel, keyName, songKey } from './key.js';
import { isKeyField, parseKeyField } from './keyField.js';
import { chartTokens } from './chartTokens.js';
import { parseArrangement } from './parseArrangement.js';
import { splitMark, withMark } from './analysisMarks.js';
import { splitHit, withHit } from './hits.js';

/**
 * @param {string} text the chord chart
 * @param {number} semitones how far to move every chord
 */
export function transposeChart(text, semitones) {
	let key = songKey(parseArrangement(text));
	if (!key) return text;

	/** @param {string} text a chord, maybe with a hit and your analysis after it (which don't change with the key) */
	const moved = (text) => {
		const { chord: written, mark } = splitMark(text);
		const { chord, hit } = splitHit(written);
		const label = chordLabel(chord, { key, shift: semitones, mode: 'concert' });
		return withMark(withHit(label, hit), mark);
	};

	return text
		.split('\n')
		.map((line) => {
			const match = line.match(/^(\s*"[^"]+"\s*)(.*)$/);
			if (!match || match[2].startsWith('as ')) return line;
			const [, name, content] = match;
			const rewritten = chartTokens(content).map((token) => {
				if (isKeyField(token)) {
					key = parseKeyField(token, name);
					return `[K:${keyName(key, semitones)}]`;
				}
				if (token === '|' || token.startsWith('[')) return token;
				return token.replace(/[^,\s]+/g, moved);
			});
			return name + rewritten.join('');
		})
		.join('\n');
}
