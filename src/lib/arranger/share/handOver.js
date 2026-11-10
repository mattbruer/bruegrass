/**
 * Handing a shared song to the person sending it. On a phone, the share
 * sheet (Messages, AirDrop, Mail…), since a download on an iPhone is hard
 * to find again. On a computer, a link goes to the clipboard and a file
 * downloads, as people expect there.
 */
import { downloadFile } from '$lib/utils/downloadFile.js';

/** Whether this device hands things over through the share sheet. */
export function usesShareSheet() {
	return matchMedia('(pointer: coarse)').matches && 'share' in navigator;
}

/**
 * @param {Uint8Array} bytes
 * @param {string} fileName
 * @param {string} type
 * @returns {Promise<'shared' | 'downloaded' | 'cancelled'>}
 */
export async function handOverFile(bytes, fileName, type) {
	const file = new File([bytes], fileName, { type });
	if (usesShareSheet() && navigator.canShare?.({ files: [file] })) {
		return shareOrCancel({ files: [file] });
	}
	downloadFile(bytes, fileName, type);
	return 'downloaded';
}

/**
 * @param {string} url
 * @param {string} title
 * @returns {Promise<'shared' | 'copied' | 'cancelled'>}
 */
export async function handOverLink(url, title) {
	if (usesShareSheet()) return shareOrCancel({ url, title });
	await navigator.clipboard.writeText(url);
	return 'copied';
}

/** @param {ShareData} data */
async function shareOrCancel(data) {
	try {
		await navigator.share(data);
		return 'shared';
	} catch (problem) {
		if (problem instanceof DOMException && problem.name === 'AbortError') return 'cancelled';
		throw problem;
	}
}
