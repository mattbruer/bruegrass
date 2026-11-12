/**
 * How a chord's function is written, Berklee style: upper-case numerals
 * with the chord's own quality (IIm7, V7, IVmaj7, VIIm7b5), a target after
 * a slash for a chord that belongs to another chord (V7/V, IIm7/V, subV7/V),
 * and "sub" for a tritone substitute. The one place the notation is decided.
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** @param {{ steps: number, prefix: string }} degree */
export function numeral({ steps, prefix }) {
	return prefix + ROMAN[steps];
}

/** @param {string} rest the quality as written: "m7", "dim7", "min" */
function quality(rest) {
	return rest.replace(/^dim/, '°').replace(/^(min|-)/, 'm');
}

/** A chord by its own degree: "IIm7", "bVII7", "#IV°7" */
export function plainLabel(degree, rest) {
	return numeral(degree) + quality(rest);
}

/** @param {{ steps: number, offset: number, prefix: string } | null} target null = the tonic */
function over(target) {
	return target && !(target.steps === 0 && target.offset === 0) ? `/${numeral(target)}` : '';
}

/** A dominant of the target: "V7/V", or plain "V7" when the target is home */
export function dominantLabel(rest, target) {
	return `V${quality(rest)}${over(target)}`;
}

/** A tritone substitute for the target's dominant: "subV7/V", "subV7" */
export function subLabel(rest, target) {
	return `subV${quality(rest)}${over(target)}`;
}

/** The II of a II–V into the target: "IIm7/V" */
export function relatedTwoLabel(rest, target) {
	return `II${quality(rest)}${over(target)}`;
}
