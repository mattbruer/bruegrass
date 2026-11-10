/**
 * A share link: the whole song (no takes) squeezed into the link itself,
 * after a `#`. The part after `#` never leaves the browser, so the song
 * isn't sent to any server and the link works without a backend. Opening
 * it opens the arranger, which offers the song (state/ReceiveState).
 */
import { readPackage, ShareProblem } from './songPackage.js';

const HASH_PREFIX = '#song=';

/**
 * @param {import('./songPackage.js').SongPackage} songPackage (without takes)
 * @param {string} pageUrl the arranger's address
 */
export async function shareLink(songPackage, pageUrl) {
	const json = new TextEncoder().encode(JSON.stringify(songPackage));
	const packed = await squeeze(json, new CompressionStream('deflate-raw'));
	return `${pageUrl}${HASH_PREFIX}${toBase64Url(packed)}`;
}

/** @param {string} hash e.g. location.hash */
export function hasSharedSong(hash) {
	return hash.startsWith(HASH_PREFIX);
}

/**
 * @param {string} hash
 * @returns {Promise<import('./songPackage.js').SongPackage>}
 */
export async function songFromLink(hash) {
	try {
		const packed = fromBase64Url(hash.slice(HASH_PREFIX.length));
		const json = await squeeze(packed, new DecompressionStream('deflate-raw'));
		return readPackage(JSON.parse(new TextDecoder().decode(json)));
	} catch (problem) {
		if (problem instanceof ShareProblem) throw problem;
		throw new ShareProblem(
			'This link’s song couldn’t be read. It may have been cut short: ask for it again.'
		);
	}
}

/**
 * @param {Uint8Array} bytes
 * @param {CompressionStream | DecompressionStream} through
 */
async function squeeze(bytes, through) {
	const stream = new Blob([bytes]).stream().pipeThrough(through);
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** @param {Uint8Array} bytes */
function toBase64Url(bytes) {
	let text = '';
	for (const byte of bytes) text += String.fromCharCode(byte);
	return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** @param {string} text */
function fromBase64Url(text) {
	const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
