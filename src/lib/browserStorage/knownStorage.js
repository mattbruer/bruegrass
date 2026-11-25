/**
 * What each thing the app keeps in this browser is, in plain words, for the
 * storage page. Anything stored that isn't listed here still shows, under
 * its raw name. A new storage key or database is one entry here.
 *
 * `items`: the key holds a collection ({ [id]: document }), counted as
 * [one, many] of these.
 */

/** @type {Record<string, { name: string, about: string, items?: [string, string] }>} */
export const KNOWN_KEYS = {
	'bruegrass.arrangements': {
		name: 'Saved songs',
		about: 'Every song you’ve saved: chart, tune, tempo, capo and mix.',
		items: ['song', 'songs']
	},
	'bruegrass.drafts': {
		name: 'Drafts of unsaved work',
		about: 'Work in progress that isn’t a song yet: transcriptions of recordings.',
		items: ['draft', 'drafts']
	},
	'bruegrass.settings': {
		name: 'Settings',
		about: 'Tips, the music keypad, colours, the player’s look, the click.'
	},
	'bruegrass.firstPaint': {
		name: 'Colours for opening the page',
		about:
			'A copy of your theme’s colours, so the page opens in them without a flash. Safe to delete.'
	},
	'bruegrass.eqPresets': {
		name: 'EQ presets',
		about: 'One strip’s EQ, saved by name.',
		items: ['preset', 'presets']
	},
	'bruegrass.listeningSetups': {
		name: 'Listening setups',
		about: 'Every strip’s EQ, tuned for one pair of speakers or headphones.',
		items: ['setup', 'setups']
	},
	'bruegrass.guitarPatterns': {
		name: 'Guitar patterns',
		about: 'How you changed the guitar on a chord, saved by name to use in any song.',
		items: ['pattern', 'patterns']
	},
	'bruegrass.chordVoicings': {
		name: 'My chords (no longer used)',
		about:
			'Guitar shapes from My chords, which guitar patterns replaced. Nothing reads them now: safe to delete.',
		items: ['chord', 'chords']
	},
	'bruegrass.thisDevice': {
		name: 'This device’s choices',
		about:
			'Which listening setup and audio input this device uses, and the song it had open. Never shared with other devices.'
	},
	'sveltekit:scroll': {
		name: 'Scroll positions',
		about: 'Where each page was scrolled to, for the Back button. Gone when the tab closes.'
	},
	'sveltekit:snapshot': {
		name: 'Page snapshots',
		about: 'What was typed on each page, for the Back button. Gone when the tab closes.'
	}
};

/** @type {Record<string, { name: string, about: string, stores: Record<string, string> }>} */
export const KNOWN_DATABASES = {
	'bruegrass.takes': {
		name: 'Recorded takes',
		about: 'Takes you recorded along with the band, or added from a file, kept with their song.',
		stores: { takes: 'Take details', takeAudio: 'Take audio' }
	},
	'bruegrass.referenceAnalyses': {
		name: 'Recordings worked out for Transcribe',
		about:
			'Where each recording’s beats, bass and chords fall, so a recording opens without working it out again. Safe to delete: it’s worked out again when needed.',
		stores: { analyses: 'Recordings' }
	},
	'bruegrass.sampler': {
		name: 'Sampling sessions',
		about: 'The sampler’s recordings of your instrument (a tool for building the app’s sounds).',
		stores: { sessions: 'Sessions', takes: 'Take details', takeAudio: 'Take audio' }
	}
};
