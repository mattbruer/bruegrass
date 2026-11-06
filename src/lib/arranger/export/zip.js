/**
 * A .zip of several files, so stems download as one file (browsers block a
 * burst of separate downloads, and on an iPhone the Files app opens a zip
 * with a tap). Files are stored as they are, not compressed: audio barely
 * compresses, and storing is instant. Written by hand: the browser has no
 * zip writer.
 */

/** CRC-32 lookup table (the checksum every zip entry carries). */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

/** @param {Uint8Array} bytes */
function crc32(bytes) {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

/** The time and date in the old DOS format zips use. */
function dosDateTime(date = new Date()) {
	return {
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
		date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
	};
}

/**
 * @param {{ name: string, bytes: Uint8Array }[]} files
 * @returns {Uint8Array} the whole .zip file
 */
export function makeZip(files) {
	const encoder = new TextEncoder();
	const { time, date } = dosDateTime();
	/** @type {Uint8Array[]} */
	const parts = [];
	/** @type {Uint8Array[]} */
	const directory = [];
	let offset = 0;

	for (const file of files) {
		const name = encoder.encode(file.name);
		const crc = crc32(file.bytes);
		const size = file.bytes.length;

		const local = new DataView(new ArrayBuffer(30));
		local.setUint32(0, 0x04034b50, true); // local file header
		local.setUint16(4, 20, true); // version needed
		local.setUint16(6, 0x0800, true); // names are UTF-8
		local.setUint16(8, 0, true); // stored, not compressed
		local.setUint16(10, time, true);
		local.setUint16(12, date, true);
		local.setUint32(14, crc, true);
		local.setUint32(18, size, true);
		local.setUint32(22, size, true);
		local.setUint16(26, name.length, true);
		parts.push(new Uint8Array(local.buffer), name, file.bytes);

		const central = new DataView(new ArrayBuffer(46));
		central.setUint32(0, 0x02014b50, true); // central directory entry
		central.setUint16(4, 20, true); // version made by
		central.setUint16(6, 20, true); // version needed
		central.setUint16(8, 0x0800, true);
		central.setUint16(10, 0, true);
		central.setUint16(12, time, true);
		central.setUint16(14, date, true);
		central.setUint32(16, crc, true);
		central.setUint32(20, size, true);
		central.setUint32(24, size, true);
		central.setUint16(28, name.length, true);
		central.setUint32(42, offset, true); // where its local header is
		directory.push(new Uint8Array(central.buffer), name);

		offset += 30 + name.length + size;
	}

	const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true); // end of central directory
	end.setUint16(8, files.length, true);
	end.setUint16(10, files.length, true);
	end.setUint32(12, directorySize, true);
	end.setUint32(16, offset, true);

	const all = [...parts, ...directory, new Uint8Array(end.buffer)];
	const zip = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
	let at = 0;
	for (const part of all) {
		zip.set(part, at);
		at += part.length;
	}
	return zip;
}
