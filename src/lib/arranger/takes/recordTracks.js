/**
 * The tracks you record on, like a four-track tape: each has its own mixer
 * channel (id = track id), shown only while the track has a take. Record a
 * voice on one, a real guitar on another (and mute the band's guitar).
 * A new track is one entry; ids are saved with songs' mixes and takes, so
 * they must stay the same.
 */
export const RECORD_TRACKS = Object.freeze([
	{ id: 'track-1', name: 'Track 1' },
	{ id: 'track-2', name: 'Track 2' },
	{ id: 'track-3', name: 'Track 3' },
	{ id: 'track-4', name: 'Track 4' }
]);

/** @param {string} channelId */
export function isRecordTrack(channelId) {
	return RECORD_TRACKS.some((track) => track.id === channelId);
}

/** @param {string} trackId */
export function trackName(trackId) {
	return RECORD_TRACKS.find((track) => track.id === trackId)?.name ?? trackId;
}
