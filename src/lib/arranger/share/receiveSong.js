/**
 * Putting a song someone sent into this device's songs: the song itself,
 * the chord shapes it needs, and its takes. Nothing here deletes anything:
 *
 *   - Update: the song keeps its id, so sending it again updates the copy.
 *     Its fields are replaced; takes recorded here stay, takes already
 *     received are updated in place (nudges, which is in use).
 *   - Keep both (or a song that was never saved): a new song beside yours.
 *   - A chord name you already have with a different shape keeps yours.
 */
import { createArrangement, getArrangement, saveArrangement } from '$lib/storage/arrangements.js';
import { listTakes, putTake, updateTake, useTake } from '$lib/storage/songTakes.js';
import { listChordVoicings } from '$lib/storage/chordVoicings.js';
import { saveMyChord } from '../voicings/myChords.svelte.js';
import { newId } from '$lib/storage/newId.js';
import { unpackTakeAudio } from './takeFormat.js';

/**
 * Your saved copy of this song, if you have one (it was received before, or it's yours).
 * @param {import('./songPackage.js').SongPackage} songPackage
 */
export function yourCopyOf(songPackage) {
	return songPackage.song.id ? getArrangement(songPackage.song.id) : null;
}

/**
 * @param {import('./songPackage.js').SongPackage} songPackage
 * @param {Map<string, Uint8Array>} audioFiles by name (empty for a link)
 * @param {{ asNewSong: boolean }} options
 * @returns {Promise<{ songId: string, notes: string[] }>}
 */
export async function receiveSong(songPackage, audioFiles, { asNewSong }) {
	const notes = [];
	const songId = saveReceivedSong(songPackage.song, asNewSong);
	notes.push(...addChords(songPackage.chords));

	const added = await addTakes(songPackage.takes, audioFiles, songId, asNewSong);
	if (added > 0) notes.push(`${added} take${added === 1 ? '' : 's'} added.`);
	return { songId, notes };
}

/**
 * @param {import('./songPackage.js').SharedSong} song
 * @param {boolean} asNewSong
 */
function saveReceivedSong(song, asNewSong) {
	const { id, ...fields } = song;
	const yours = id && !asNewSong ? getArrangement(id) : null;
	if (yours) return saveArrangement({ ...yours, ...fields }).id;
	if (id && !getArrangement(id)) return saveArrangement({ ...createArrangement(fields), id }).id;
	const title = asNewSong ? `${fields.title} (copy)` : fields.title;
	return saveArrangement(createArrangement({ ...fields, title })).id;
}

/** @param {import('./songPackage.js').SharedChord[]} chords */
function addChords(chords) {
	const yours = new Map(listChordVoicings().map((voicing) => [voicing.name, voicing.frets]));
	const notes = [];
	for (const chord of chords) {
		const existing = yours.get(chord.name);
		if (!existing) saveMyChord(chord);
		else if (existing.join() !== chord.frets.join()) {
			notes.push(`You already have your own ${chord.name} shape, so the song plays yours.`);
		}
	}
	return notes;
}

/**
 * @param {import('./songPackage.js').SharedTake[]} takes
 * @param {Map<string, Uint8Array>} audioFiles
 * @param {string} songId
 * @param {boolean} asNewSong
 * @returns {Promise<number>} how many were added
 */
async function addTakes(takes, audioFiles, songId, asNewSong) {
	const already = new Map((await listTakes(songId)).map((take) => [take.id, take]));
	let added = 0;
	for (const { audio, ...details } of takes) {
		const take = {
			...details,
			id: asNewSong ? newId() : details.id,
			songId,
			quality: /** @type {const} */ ('compressed')
		};
		const existing = already.get(take.id);
		if (existing) {
			await updateTake({ ...take, quality: existing.quality });
			if (take.inUse) await useTake(take);
			continue;
		}
		const bytes = audioFiles.get(audio.file);
		if (!bytes) continue;
		await putTake(take, await unpackTakeAudio(bytes, audio), { bytes, audio });
		added++;
	}
	return added;
}
