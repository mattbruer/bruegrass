/**
 * The open song, packed to send: what's on the page now (unsaved changes
 * included) and every take with its
 * audio compressed to travel (takeFormat.js). A take that was itself
 * received goes on in the file it came in, so it's never compressed twice.
 */
import { readSentAudio, readTakeAudio } from '$lib/storage/songTakes.js';
import { readSongFields } from '../state/songFields.js';
import { makePackage } from './songPackage.js';
import { packTakeAudio } from './takeFormat.js';

/**
 * @param {import('../state/Arranger.svelte.js').Arranger} arranger
 * @param {{ withTakes: boolean }} options
 * @returns {Promise<{ songPackage: import('./songPackage.js').SongPackage, audioFiles: { name: string, bytes: Uint8Array }[] }>}
 */
export async function gatherSong(arranger, { withTakes }) {
	const song = {
		id: arranger.song.savedId,
		title: arranger.song.name || arranger.song.suggestedName,
		...readSongFields(arranger)
	};

	const takes = [];
	const audioFiles = [];
	for (const take of withTakes ? arranger.recording.takes : []) {
		const packed = await takeToSend(take);
		if (!packed) continue;
		const { audio, bytes } = packed;
		// eslint-disable-next-line no-unused-vars -- the song id is the receiver's to give
		const { songId, ...details } = take;
		takes.push({ ...details, audio });
		audioFiles.push({ name: audio.file, bytes });
	}
	return { songPackage: makePackage(song, takes), audioFiles };
}

/**
 * @param {import('$lib/storage/songTakes.js').TakeDocument} take
 * @returns {Promise<{ audio: import('./takeFormat.js').TakeAudio, bytes: Uint8Array } | null>}
 */
async function takeToSend(take) {
	const name = `takes/${take.id}`;
	const sent = await readSentAudio(take.id);
	if (sent) {
		const extension = sent.audio.file.slice(sent.audio.file.lastIndexOf('.'));
		return { audio: { ...sent.audio, file: name + extension }, bytes: sent.bytes };
	}
	const channels = await readTakeAudio(take.id);
	return channels ? packTakeAudio(name, channels, take.sampleRate) : null;
}
