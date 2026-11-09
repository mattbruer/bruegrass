/**
 * Songs to start from, in the song bar's Examples menu. Each is a whole
 * song (the fields a saved song holds; see $lib/storage/arrangements.js).
 * A new example is one more entry. Write any melody ourselves, from a
 * public-domain tune (never from thesession.org).
 */
import { STARTER_SONG } from './starterSong.js';
import { TEMPO_DEFAULT } from './chart/tempo.js';

/**
 * Keep on the Sunny Side: Ada Blenkhorn's 1899 words, public domain. Two
 * verses and the chorus in G, with the words for the lyric chart. Chords
 * and words only: no melody yet (write one from a checked public-domain
 * source before adding it).
 */
const KEEP_ON_THE_SUNNY_SIDE = Object.freeze({
	arrangement: `
"Verse 1"|G|G|C|G|G|G|D|D|G|G|C|G|D|D|G|G|
There's a |dark and a |trou-bled side of |life, |there's a
|bright and a |sun-ny side |too, |though we
|meet with the |dark-ness and |strife, |the
|sun-ny side we |al-so may |view | |

"Chorus"|G|G|C|G|G|D|D|G|G|C|G|D|D|G|G|G|
Keep on the |sun-ny side, |al-ways on the |sun-ny |side, keep on the
|sun-ny side of |life, |it will |help us ev-ery
|day, it will |bright-en all the |way, if we'll |keep on the
|sun-ny side of |life | | |

"Verse 2" as Verse 1
Though the |storm in its |fu-ry break to-|day, |crush-ing
|hopes that we |cher-ish so |dear, |clouds and
|storm will in |time pass a-|way, |and the
|sun a-gain will |shine bright and |clear | |

"Chorus 2" as Chorus
Keep on the |sun-ny side, |al-ways on the |sun-ny |side, keep on the
|sun-ny side of |life, |it will |help us ev-ery
|day, it will |bright-en all the |way, if we'll |keep on the
|sun-ny side of |life | | |
`,
	abc: '',
	tempo: TEMPO_DEFAULT,
	capo: 0,
	transpose: 0,
	mix: null
});

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

/** The Lonesome River: a verse in 3/4 with the chorus the same as the verse. Chords only. */
const THE_LONESOME_RIVER = Object.freeze({
	arrangement: `
"Verse"[M:3/4]|G|G|G|G|G|G|G|G7|C|C|C|C|G|G|G|G7|C|C|C|C|G|G|G|G|D|D|D7|D7|G|G|G|G|
"Chorus" as Verse
`,
	abc: '',
	tempo: TEMPO_DEFAULT,
	capo: 0,
	transpose: 0,
	mix: null
});

export const EXAMPLE_SONGS = [
	{ id: 'amazingGrace', name: 'Amazing Grace', title: 'Amazing Grace (3/4)', song: STARTER_SONG },
	{
		id: 'sunnySide',
		name: 'Keep on the Sunny Side',
		title: 'Keep on the Sunny Side (4/4)',
		song: KEEP_ON_THE_SUNNY_SIDE
	},
	{
		id: 'boilThemCabbageDown',
		name: 'Boil Them Cabbage Down',
		title: 'Boil Them Cabbage Down (4/4)',
		song: BOIL_THEM_CABBAGE_DOWN
	},
	{
		id: 'lonesomeRiver',
		name: 'The Lonesome River',
		title: 'The Lonesome River (3/4)',
		song: THE_LONESOME_RIVER
	}
];
