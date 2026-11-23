/**
 * How well a song's notes fit a key: the 12 notes' weights compared with
 * how often each step is heard in music in that key (Krumhansl and
 * Kessler's listening tests), as a correlation from −1 to 1.
 */

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const ROOT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * The key among these the notes fit best.
 * @param {number[]} noteWeights 12 weights, C first
 * @param {string[]} keys e.g. 'G', 'Bb', 'Em'
 * @returns {{ key: string, fit: number }}
 */
export function bestKey(noteWeights, keys) {
	let best = { key: keys[0], fit: -Infinity };
	for (const key of keys) {
		const fit = keyFit(noteWeights, key);
		if (fit > best.fit) best = { key, fit };
	}
	return best;
}

/**
 * @param {number[]} noteWeights 12 weights, C first
 * @param {string} key e.g. 'G', 'Bb', 'Em'
 */
export function keyFit(noteWeights, key) {
	const minor = key.endsWith('m');
	const profile = minor ? MINOR_PROFILE : MAJOR_PROFILE;
	const tonic = tonicPc(minor ? key.slice(0, -1) : key);
	const expected = noteWeights.map((_, pc) => profile[(pc - tonic + 12) % 12]);
	return correlation(noteWeights, expected);
}

/** @param {string} name e.g. 'Bb', 'F#' */
function tonicPc(name) {
	const accidental = name[1] === 'b' ? -1 : name[1] === '#' ? 1 : 0;
	return (ROOT_PC[/** @type {keyof ROOT_PC} */ (name[0])] + accidental + 12) % 12;
}

/**
 * @param {number[]} a
 * @param {number[]} b
 */
function correlation(a, b) {
	const meanA = a.reduce((sum, v) => sum + v, 0) / a.length;
	const meanB = b.reduce((sum, v) => sum + v, 0) / b.length;
	let together = 0;
	let spreadA = 0;
	let spreadB = 0;
	for (let i = 0; i < a.length; i++) {
		together += (a[i] - meanA) * (b[i] - meanB);
		spreadA += (a[i] - meanA) ** 2;
		spreadB += (b[i] - meanB) ** 2;
	}
	return spreadA && spreadB ? together / Math.sqrt(spreadA * spreadB) : 0;
}
