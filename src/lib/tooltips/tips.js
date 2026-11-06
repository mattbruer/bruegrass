/**
 * Every tooltip's wording, in one place, grouped by where it appears.
 * Edit the words here; components only point at them (use:tooltip={TIPS.…}).
 *
 * Style: one or two short, plain sentences saying what the control does
 * (and why you'd use it), not how it's built. Lists keyed by id (EQ bands,
 * reverb controls, chord displays, visualiser views) follow the ids in the
 * code that defines them.
 */

export const TIPS = Object.freeze({
	app: {
		home: 'Back to the song list.',
		pages: {
			'/': 'Your recorded songs: play one, or play them all.',
			'/arranger': 'Write a chord chart and hear a bluegrass band play it.'
		},
		settings: 'Settings: tips, the music keypad, colours and shape.',
		tipsToggle: 'Tips are on: rest on any control to see what it does. Tap to turn them off.'
	},

	todo: {
		open: 'Your todo list for the app (only shown while developing on this machine).',
		add: 'Add this idea to your list. It’s saved to todo.json, where Claude can see it.',
		done: 'Mark this done.',
		undone: 'Mark this not done yet.',
		adopt: 'Move this suggestion to your list: you want it.',
		remove: 'Delete this from the list.'
	},

	songs: {
		playAll: 'Play every song in the list, one after another.',
		song: 'Play this song.'
	},

	song: {
		new: 'Start a new song from the starter tune. Asks first if you have unsaved changes.',
		open: 'Open one of your saved songs.',
		save: 'Save this song on this device (⌘S / Ctrl+S). The first save asks for a name.',
		openSaved: 'Open this song.',
		deleteSaved: 'Delete this song for good.'
	},

	drafts: {
		restore: 'Put last time’s unsaved changes back, so you can keep working and Save.',
		discard: 'Throw last time’s unsaved changes away.'
	},

	player: {
		play: 'Play the arrangement from the start, looping. Changes you make while it plays are picked up.',
		stop: 'Stop playing.',
		tempo: 'Speed, in beats per minute.',
		capo: 'Where the guitar’s capo sits. The chord shapes stay the same; everything sounds higher.',
		key: 'Move the whole song to another key. The guitar keeps its shapes and moves the capo to get there.',
		mixer: 'Open the mixer: levels, pan, EQ, reverb and loudness for each instrument.',
		midi: 'Download the arrangement as a MIDI file, with a track per instrument, for Logic or another DAW.',
		loopSection: 'Choose which part of the song repeats while it plays.',
		loopFrom: 'The first bar of the loop.',
		loopTo: 'The last bar of the loop.',
		loopEverything: 'Go back to looping the whole arrangement.',
		chordDisplay: {
			shapes: 'Show chords as the guitar shapes you play (with the capo on).',
			concert: 'Show chords as they actually sound.',
			roman: 'Show chords as Roman numerals (I, IV, V), the same in any key.',
			nashville: 'Show chords as Nashville numbers (1, 4, 5), the same in any key.'
		}
	},

	editor: {
		help: 'How to write an arrangement: bars, chords, sections, repeats and time signatures.'
	},

	melody: {
		abcLink: 'Learn ABC notation, a simple way to write a tune as text.',
		arrangementFromChords:
			'Replace the arrangement with one written from the melody’s chord symbols.',
		chordsIntoMelody:
			'Write the arrangement’s chords into the melody, as chord symbols above the notes.'
	},

	mixer: {
		openHandle: 'Open the mixer.',
		close: 'Close the mixer. Playback carries on.',
		listening:
			'What you’re listening on. Save the EQs for each speaker or pair of headphones, and this device uses them on every song.',
		stripEq: 'Open this strip’s EQ: shape its tone, from deep bass to bright treble.',
		part: {
			bass: 'How loud the guitar’s bass notes (the “boom”) are.',
			strum: 'How loud the guitar’s strums (the “chuck”) are.'
		},
		send: 'How much of this instrument goes to the reverb.',
		pan: 'Where this instrument sits, from left to right.',
		mute: 'Silence this strip.',
		solo: 'Hear only the soloed instruments (with their reverb).',
		fader: 'This strip’s level. Tap the number, or double-click the cap, to reset it.',
		meter: 'How loud this strip is right now. Red at the top means it clipped: tap to clear.',
		masterFader: 'The level of the whole mix.',
		reverbFader: 'How loud the reverb is overall.',
		pluginPower: 'Turn the reverb on, or bypass it to hear the mix without it.',
		pluginOpen: 'Open the reverb’s settings.',
		scopeView: {
			waveform: 'Show the sound as a wave.',
			spectrum: 'Show how loud each pitch range is, from bass on the left to treble on the right.',
			stereo:
				'Show how wide the mix is. The number: +1 is mono, 0 is wide, below 0 the sides cancel on a single speaker.'
		}
	},

	eq: {
		on: 'Turn this EQ on or off, to hear the difference.',
		graph: 'The EQ curve. Drag a band’s dot: sideways for pitch, up or down to boost or cut.',
		bandPower: 'Turn this band on or off.',
		bands: {
			lowCut: 'Low Cut: removes rumble and deep bass below its frequency.',
			lowShelf: 'Low Shelf: turns all the bass up or down.',
			bell1: 'Low Mid: boosts or cuts around its frequency. Cut here to clear up muddiness.',
			bell2: 'Mid: boosts or cuts around its frequency. The body and honk of an instrument.',
			bell3:
				'High Mid: boosts or cuts around its frequency. Presence and attack; too much sounds harsh.',
			bell4: 'Presence: boosts or cuts around its frequency. Clarity and pick or string detail.',
			highShelf: 'High Shelf: turns all the treble up or down. Air and sparkle.',
			highCut: 'High Cut: removes hiss and treble above its frequency.'
		},
		frequency: 'The pitch this band works at.',
		gain: 'How much this band boosts (up) or cuts (down).',
		q: 'How wide the band is: low is broad and gentle, high is narrow and precise.',
		slope: 'How steeply the cut falls away: 12 is gentle, 24 is steep.',
		flat: 'Reset every band, so the EQ changes nothing.',
		preset: 'Load a saved EQ onto this strip. Presets from other strips work too.',
		savePreset: 'Save this strip’s EQ as a preset, to use again on any strip.',
		deletePreset: 'Delete this preset.',
		saveToSetup: 'Save the EQ changes to your listening setup, so they come back on every song.',
		openSetups:
			'Save every strip’s EQ for what you’re listening on, so this device uses it on every song.'
	},

	listening: {
		choose: 'Use this setup on this device, for every song.',
		none: 'Use each song’s own EQ instead of a setup.',
		save: 'Save your EQ changes into this setup.',
		saveNew: 'Save every strip’s EQ as a new setup, named for what you’re listening on.',
		delete: 'Delete this setup.'
	},

	reverb: {
		on: 'Turn the reverb on or off.',
		resetAll: 'Put every reverb setting back to how it started.',
		controls: {
			decay: 'How long the reverb rings on: a small room is short, a hall is long.',
			preDelay: 'A short gap before the reverb starts, so the notes stay clear in front of it.',
			damping: 'How quickly the reverb’s treble fades: more sounds warmer and darker.',
			width: 'How wide the reverb spreads, from mono to fully stereo.',
			lowCut: 'Takes the bass out of the reverb, so it doesn’t muddy the mix.',
			highCut: 'Takes the top end out of the reverb, for a softer, more natural sound.',
			wet: 'How much reverb comes out of the plugin.',
			dry: 'How much of the original sound passes through the plugin. Usually 0 on an aux, since the instruments are heard directly.'
		}
	},

	loudness: {
		readout:
			'How loud it sounds, in LUFS (how streaming services measure loudness). Now: the last 3 seconds. Song: everything since Play.',
		limiter:
			'How much the limiter is turning down to stop clipping. A flicker is normal; a lot means the gain is too high.',
		gain: 'Raises the whole mix to a listening level. Saved with the song.',
		match:
			'Set the gain so this song plays at streaming loudness (−14 LUFS). Play it for a few seconds first.',
		compare:
			'A fair before-and-after: hear the loudness stage against the original mix, at the same volume.',
		hearA: 'A: through the loudness stage.',
		hearB: 'B: the original mix.'
	},

	settings: {
		preset: 'Use this colour scheme.',
		resetAppearance: 'Go back to the original colours and shape.'
	}
});
