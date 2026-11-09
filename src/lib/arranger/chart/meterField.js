/**
 * Time signatures written as abc-style inline fields, shared by the
 * arranger's chart and anything else that reads time signatures.
 *
 * - `[M:3/4]` changes the time signature from here on (persistent).
 * - `[2/4]` sets it for one bar only.
 * - `[M:C]` is 4/4 and `[M:C|]` is 2/2.
 */

/**
 * @param {string} token e.g. "[M:3/4]", "[2/4]", "[M:C|]"
 * @param {string} section for error messages
 */
export function parseMeterField(token, section) {
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
