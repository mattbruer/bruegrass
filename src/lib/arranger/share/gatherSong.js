/**
 * The open song, packed to send: what's on the page now (unsaved changes
 * included), the sender's own chord shapes it uses, and the takes in use
 * with their audio compressed to travel (takeFormat.js).
 */
import { ARRANGEMENT_VERSION } from '$lib/storage/arrangements.js';
import { readTakeAudio } from '$lib/storage/songTakes.js';
import { readSongFields } from '../state/songFields.js';
import { myChords } from '../voicings/myChords.svelte.js';
import { withoutBass } from '../instruments/chordBook.js';
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
		version: ARRANGEMENT_VERSION,
		title: arranger.song.name || arranger.song.suggestedName,
		...readSongFields(arranger)
	};
	const chords = chordsTheSongUses(arranger.arrangement.sections, myChords.all);

	const takes = [];
	const audioFiles = [];
	const inUse = withTakes ? arranger.recording.takes.filter((take) => take.inUse) : [];
	for (const take of inUse) {
		const channels = await readTakeAudio(take.id);
		if (!channels) continue;
		const { audio, bytes } = await packTakeAudio(`takes/${take.id}`, channels, take.sampleRate);
		// eslint-disable-next-line no-unused-vars -- the song id is the receiver's to give
		const { songId, ...details } = take;
		takes.push({ ...details, audio });
		audioFiles.push({ name: audio.file, bytes });
	}
	return { songPackage: makePackage(song, chords, takes), audioFiles };
}

/**
 * Your own shapes the chart plays (without them it won't play on another device).
 * @param {{ measures: string[][] }[]} sections
 * @param {{ name: string, frets: (number | null)[] }[]} yourShapes
 */
export function chordsTheSongUses(sections, yourShapes) {
	const names = new Set(sections.flatMap((section) => section.measures.flat().map(withoutBass)));
	return yourShapes
		.filter((shape) => names.has(shape.name))
		.map(({ name, frets }) => ({ name, frets }));
}
