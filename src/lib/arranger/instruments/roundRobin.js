/*
 * A fake round robin: every time a sample plays it's nudged a tiny, random
 * amount, so repeated notes don't sound like a machine gun. Each note gets
 * a slightly different pitch and level, and starts a hair into the sample,
 * which moves the attack's waveform a little.
 * Random on every play (not seeded), so no two passes or renders are the same.
 * Settings → Vary each note turns it off, checked on every note so it can be
 * compared while playing.
 */
import { settings } from '$lib/settings/settings.svelte.js';

const PITCH_CENTS = 5; // up to this much sharp or flat
const LEVEL_DB = 1; // up to this much louder or softer
const MAX_SKIP_SECONDS = 0.0015; // how far into the sample a note may start

/** @param {number} range */
const either = (range) => (Math.random() * 2 - 1) * range;

/** @returns {{ rate: number, db: number, skip: number }} rate: multiply the playback rate; skip: seconds into the sample */
export function roundRobin() {
	if (!settings.varyNotes) return { rate: 1, db: 0, skip: 0 };
	return {
		rate: 2 ** (either(PITCH_CENTS) / 1200),
		db: either(LEVEL_DB),
		skip: Math.random() * MAX_SKIP_SECONDS
	};
}
