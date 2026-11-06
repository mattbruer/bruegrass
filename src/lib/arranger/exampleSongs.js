/**
 * Songs to start from, in the song bar's Examples menu. Each is a whole
 * song (the fields a saved song holds; see $lib/storage/arrangements.js).
 * A new example is one more entry. Write any melody ourselves, from a
 * public-domain tune (never from thesession.org).
 */
import { STARTER_SONG } from './starterSong.js';
import { TEMPO_DEFAULT } from './chart/tempo.js';

/** Boil Them Cabbage Down: a traditional fiddle tune, public domain. Chords only, in 4/4. */
const BOIL_THEM_CABBAGE_DOWN = Object.freeze({
	arrangement: `
"Verse"|G|C|G|D|G|C|G,D|G|
"Break" as Verse
`,
	abc: '',
	tempo: TEMPO_DEFAULT,
	capo: 0,
	transpose: 0,
	mix: null
});

export const EXAMPLE_SONGS = [
	{ id: 'amazingGrace', title: 'Amazing Grace (3/4)', song: STARTER_SONG },
	{ id: 'boilThemCabbageDown', title: 'Boil Them Cabbage Down (4/4)', song: BOIL_THEM_CABBAGE_DOWN }
];
