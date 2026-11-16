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
		about:
			'Work in progress that isn’t a song yet: transcriptions of recordings, a chord shape you’re typing.',
		items: ['draft', 'drafts']
	},
	'bruegrass.songMixes': {
		name: 'Each song’s mix between saves (no longer used)',
		about: 'From before songs saved themselves. Safe to delete.',
		items: ['mix', 'mixes']
	},
	'bruegrass.settings': {
		name: 'Settings',
		about: 'Tips, the music keypad, colours, the player’s look, the click.'
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
	'bruegrass.chordVoicings': {
		name: 'My chords',
		about: 'Your own guitar chord shapes.',
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
	},
	'arranger.phoneKeyboard': {
		name: 'Old keypad setting',
		about: 'Left over from an older version. Safe to delete.'
	},
	'bruegrass.currentArrangement': {
		name: 'Old “last opened song”',
		about: 'Left over from an older version. Safe to delete.'
	}
};

/** @type {Record<string, { name: string, about: string, stores: Record<string, string> }>} */
export const KNOWN_DATABASES = {
	'bruegrass.takes': {
		name: 'Recorded takes',
		about: 'Takes you recorded along with the band, or added from a file, kept with their song.',
		stores: { takes: 'Take details', takeAudio: 'Take audio' }
	},
	'bruegrass.recordingAnalyses': {
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
