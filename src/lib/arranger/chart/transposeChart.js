/**
 * Rewrite a chord chart's chords in another key, leaving everything else
 * (section names, bar lines, time signatures, spacing) as typed. A `[K:]`
 * field moves with the chords.
 */
import { chordLabel, keyName, songKey } from './key.js';
import { isKeyField } from './keyField.js';
import { parseArrangement } from './parseArrangement.js';

/**
 * @param {string} text the chord chart
 * @param {number} semitones how far to move every chord
 */
export function transposeChart(text, semitones) {
	const key = songKey(parseArrangement(text));
	if (!key) return text;

	/** @param {string} chord */
	const moved = (chord) => chordLabel(chord, { key, shift: semitones, mode: 'concert' });

	return text
		.split('\n')
		.map((line) => {
			const match = line.match(/^(\s*"[^"]+"\s*)(.*)$/);
			if (!match || match[2].startsWith('as ')) return line;
			const [, name, content] = match;
			// Same tokens as the parser: inline fields, bar lines, then chords
			const tokens = content.match(/\[[^\]]*\]|\||[^|[]+/g) ?? [];
			const rewritten = tokens.map((token) => {
				if (isKeyField(token)) return `[K:${keyName(key, semitones)}]`;
				if (token === '|' || token.startsWith('[')) return token;
				return token.replace(/[^,\s]+/g, moved);
			});
			return name + rewritten.join('');
		})
		.join('\n');
}
