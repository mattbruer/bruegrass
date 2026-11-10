/**
 * Stored values as text people can read: audio and other binary data is
 * summarised (kind, length, size) instead of printed.
 */

/** @param {number} bytes */
export function formatBytes(bytes) {
	if (bytes < 1000) return `${bytes} B`;
	if (bytes < 1e6) return `${(bytes / 1e3).toFixed(1)} KB`;
	if (bytes < 1e9) return `${(bytes / 1e6).toFixed(1)} MB`;
	return `${(bytes / 1e9).toFixed(2)} GB`;
}

/**
 * Roughly how many bytes a value takes: binary data by its size, the rest
 * by its JSON text.
 * @param {unknown} value
 */
export function sizeOf(value) {
	let binary = 0;
	const text = JSON.stringify(value, (_key, part) => {
		const bytes = binarySize(part);
		if (bytes === null) return part;
		binary += bytes;
		return null;
	});
	return binary + (text?.length ?? 0);
}

/**
 * A value as indented JSON, with binary data summarised.
 * @param {unknown} value
 */
export function readableJson(value) {
	return JSON.stringify(
		value,
		(_key, part) => {
			const bytes = binarySize(part);
			if (bytes === null) return part;
			const length = ArrayBuffer.isView(part) && 'length' in part ? part.length : null;
			const kind = part?.constructor?.name ?? 'Binary';
			return `‹${kind}${length === null ? '' : `, ${length.toLocaleString()} values`}, ${formatBytes(bytes)}›`;
		},
		2
	);
}

/** @param {unknown} part */
function binarySize(part) {
	if (part instanceof ArrayBuffer) return part.byteLength;
	if (ArrayBuffer.isView(part)) return part.byteLength;
	if (typeof Blob !== 'undefined' && part instanceof Blob) return part.size;
	return null;
}
