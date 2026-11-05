/**
 * A length in beats, for people: "1 beat", "3 beats", "1.5 beats".
 * @param {number} beats
 */
export function formatBeats(beats) {
	const rounded = Math.round(beats * 100) / 100;
	return rounded === 1 ? '1 beat' : `${rounded} beats`;
}
