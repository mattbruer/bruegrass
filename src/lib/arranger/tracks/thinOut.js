/**
 * When marks are packed too close to read (zoomed far out), show only every
 * nth: 1, 2, 4, 8… whichever first leaves `minGap` px between them.
 * @param {number} spacing px between neighbouring marks
 * @param {number} minGap px
 */
export function everyNth(spacing, minGap) {
	let nth = 1;
	while (spacing > 0 && spacing * nth < minGap) nth *= 2;
	return nth;
}
