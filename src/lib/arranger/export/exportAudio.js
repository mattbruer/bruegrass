/**
 * The Export dialog's audio choices: render, encode, name and download.
 *
 *   full mix → name-120bpm.wav
 *   stems    → name-120bpm-stems.zip (name-120bpm-guitar.wav, …, and the full mix if asked)
 *
 * Every file starts at the same moment, so they line up dropped into a DAW
 * (and line up with the .mid file).
 */
import { renderMix, renderStems, EXPORT_SAMPLE_RATE } from './renderSong.js';
import { encodeWav } from './wav.js';
import { makeZip } from './zip.js';
import { mixSnapshot } from '../playback/mixer.svelte.js';
import { downloadFile } from '$lib/utils/downloadFile.js';
import { slugify } from '$lib/utils/slugify.js';

/**
 * @typedef {{ kind: 'mix' } | { kind: 'stems', processed: boolean, withMix: boolean }} AudioExport
 *   processed: stems with the mix's EQ, levels, pan and reverb (else dry);
 *   withMix: put the full mix in the zip too
 */

/**
 * @param {import('./renderSong.js').Song & { name: string }} song name: for the file names
 * @param {AudioExport} request
 */
export async function exportAudio(song, request) {
	// The mix as set now (solos are left out: they're for listening, not part of the mix)
	const mix = mixSnapshot();
	const base = `${slugify(song.name) || 'arrangement'}-${song.bpm}bpm`;
	/** @param {import('./renderSong.js').RenderedFile} file */
	const wav = (file) => encodeWav(file.channels, EXPORT_SAMPLE_RATE);

	if (request.kind === 'mix') {
		downloadFile(wav(await renderMix(song, mix)), `${base}.wav`, 'audio/wav');
		return;
	}

	const stems = await renderStems(song, mix, { processed: request.processed });
	const files = stems.map((stem) => ({
		name: `${base}-${slugify(stem.name)}.wav`,
		bytes: wav(stem)
	}));
	if (request.withMix) {
		files.push({ name: `${base}-full-mix.wav`, bytes: wav(await renderMix(song, mix)) });
	}
	downloadFile(makeZip(files), `${base}-stems.zip`, 'application/zip');
}
