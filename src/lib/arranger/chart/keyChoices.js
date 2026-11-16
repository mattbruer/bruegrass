/**
 * Key menus: the keys a singer can move the song to (the Key menu), and
 * every key the song could be in (to name it when the first chord misleads).
 */
import { keyName, parseKeyName } from './key.js';

/* How far the Key menu reaches from the song's key, in semitones */
const SEMITONES_DOWN = 5;
const SEMITONES_UP = 6;

/**
 * Each key the song can be moved to: how many semitones that is (the
 * `transpose` setting) and the key's name as it would sound with this capo.
 * @param {import('./key.js').Key | null} key the song's key, as written
 * @param {number} capo
 * @returns {{ transpose: number, name: string }[]}
 */
export function keyChoicesFor(key, capo) {
	if (!key) return [];

	const choices = [];
	for (let transpose = -SEMITONES_DOWN; transpose <= SEMITONES_UP; transpose++) {
		const name = keyName(key, capo + transpose);
		choices.push({ transpose, name: transpose === 0 ? `${name} (original)` : name });
	}
	return choices;
}

/** The song-key menus' groups, each starting from C. */
export const KEY_GROUPS = /** @type {const} */ ([
	{ name: 'Major', from: 'C' },
	{ name: 'Minor', from: 'Cm' }
]);

/**
 * Every major and minor key, to name the song's key ([K:] in the chart),
 * grouped as KEY_GROUPS. Each is named as it sounds, with the guitar's
 * shapes when there's a capo, the way a player says it: "A (G shapes, capo 2)".
 * @param {number} capo
 * @returns {{ group: string, value: string, name: string }[]} value: the shapes key, as [K:] writes it
 */
export function songKeyChoices(capo) {
	return KEY_GROUPS.flatMap(({ name: group, from }) => {
		const tonic = /** @type {import('./key.js').Key} */ (parseKeyName(from));
		return Array.from({ length: 12 }, (_, semitones) => {
			const shapes = keyName(tonic, semitones);
			const sounds = keyName(tonic, semitones + capo);
			const name = capo ? `${sounds} (${shapes} shapes, capo ${capo})` : sounds;
			return { group, value: shapes, name };
		});
	});
}
