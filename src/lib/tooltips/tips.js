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
		storage: 'What the app keeps on this device: see it, and delete what you don’t want.',
		tipsToggle: 'Tips are on: rest on any control to see what it does. Tap to turn them off.'
	},

	storage: {
		look: 'Show what’s stored in it.',
		deleteOne: 'Delete this from the browser, for good.',
		deleteAll: 'Delete everything the app keeps in this browser, for good.',
		protect: 'Ask the browser not to clear the app’s data when the device runs low on space.'
	},

	todo: {
		open: 'Your todo list for the app (only shown while developing on this machine).',
		add: 'Add this idea to your list. It’s saved to todo.json, where Claude can see it.',
		done: 'Mark this done.',
		undone: 'Mark this not done yet.',
		adopt: 'Move this suggestion to your list: you want it.',
		remove: 'Delete this from the list.'
	},

	sampler: {
		open: 'Record instrument samples for the band (only shown while developing on this computer).',
		input: 'The audio interface or microphone to record from. This computer remembers your choice.',
		turnOn:
			'Start listening to the input, so you can see its levels. The browser asks the first time.',
		turnOff: 'Stop listening and let go of the input.',
		meter:
			'How loud each input is. Aim for your hardest hits to peak around -6 dB. Click to clear the red clip light.',
		record: 'Record a test take (R). Press again to stop.',
		play: 'Listen to the take (Space). With two mics, one plays on each side.',
		download: 'Save the take as a 24-bit WAV file, to check it in Logic.',
		newSession:
			'Start recording a new sample set. It’s saved on this computer as you go, so you can stop and come back.',
		continueSession: 'Carry on with this session, at the first thing still to record.',
		deleteSession: 'Delete this session and all its recordings from this computer, for good.',
		recordingList:
			'Everything this session asks you to record, counted up: every note, how many takes, and the total.',
		closeSession: 'Go back to the session list. Everything is already saved.',
		recordTarget:
			'Record this target (R), and press again to stop. Play it as many times as you like: each hit is found, checked, and saved straight away.',
		playSample: 'Listen to the sample as it will be cut (Space).',
		keep: 'Keep this take and go on to the next thing to record (K).',
		discard: 'Throw away this new take (X). To redo it, just record again.',
		previous: 'The previous target (←).',
		next: 'The next target (→).',
		chooseHit:
			'Keep this hit as one of the note’s takes. Keep (K) cuts the ticked hits out and throws the rest of the recording away.',
		playHit: 'Listen to this hit as it would be cut.',
		gridCell: 'Go to the first take still to record here. The bar fills as takes are kept.',
		exportSamples:
			'Download every kept sample as a WAV, cut and faded, with a manifest listing them, in one zip.',
		saveAllToProject:
			'Write every kept take into the project folder again, and remove any no longer on the list. Kept takes are saved there by themselves; use this to catch up.',
		includeRaw: 'Also put the uncut takes in the zip, to reprocess later. Makes it much bigger.'
	},

	songs: {
		playAll: 'Play every song in the list, one after another.',
		song: 'Play this song.'
	},

	song: {
		new: 'Start a new song from the starter tune. Asks first if you have unsaved changes.',
		examples: 'Start a new song from an example. Asks first if you have unsaved changes.',
		open: 'Open one of your saved songs.',
		save: 'Save this song on this device (⌘S / Ctrl+S). The first save asks for a name.',
		openSaved: 'Open this song.',
		deleteSaved: 'Delete this song for good.'
	},

	drafts: {
		restore: 'Put last time’s unsaved changes back, so you can keep working and Save.',
		discard: 'Throw last time’s unsaved changes away.'
	},

	recording: {
		tile: 'Record yourself along with the band: a voice, or a real instrument in place of one of the band’s.',
		track: 'The track to record on. Each track has its own strip in the mixer.',
		record:
			'Start recording: the count-in clicks, then the band plays the song once. Press again (or Stop) to finish early.',
		countIn:
			'How many bars of clicks before the song starts. With a pickup, the clicks stop where it starts, unless the metronome is on.',
		use: 'Play this take on its track. The other takes on the track are kept, but not played.',
		earlier: 'Move the take a little earlier, if it sounds behind the band.',
		later: 'Move the take a little later, if it sounds ahead of the band.',
		download:
			'Save this take as a WAV file to send to someone. It starts one bar before bar 1, so it lines up when they add it to the same song.',
		delete: 'Delete this take for good.',
		addFile:
			'Add a take from a WAV file someone sent you (one made with Download here), onto the chosen track.'
	},
	player: {
		play: 'Play the arrangement from the start, looping. Changes you make while it plays are picked up.',
		stop: 'Stop playing.',
		metronome:
			'Start or stop a steady click to play along with, with or without the music. While the song plays, it follows the song’s bars.',
		metronomeSound: 'The sound of the click: woodblock, cowbell, beep or tick.',
		metronomeMeter:
			'Beats in a bar, and the note that gets one beat (4 = quarters, 8 = eighths). Used when the click plays on its own.',
		metronomeLevel: 'How loud the click is.',
		tempo:
			'The speed, and a metronome to play along with. Tap to change the speed or start the click.',
		slower: 'Slower. Hold it down to keep going.',
		faster: 'Faster. Hold it down to keep going.',
		tempoNumber: 'The speed, in beats per minute. Tap to type a number.',
		capo: 'Where the guitar’s capo sits. With a melody, it asks whether the song moves up or keeps its key.',
		key: 'Move the whole song to another key. The guitar keeps its shapes and moves the capo to get there.',
		mixer: 'Open the mixer: levels, pan, EQ, reverb and loudness for each instrument.',
		edit: 'Open the editor to write the chords and the melody. The chart changes as you type.',
		export: 'Download the song: the full mix or stems as WAV files, or a MIDI file.',
		musicView: {
			chords: 'Show the chords scrolling past as the band plays.',
			sheet: 'Show the tune as sheet music, with the chords over it.'
		},
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
		help: 'How to write an arrangement: bars, chords, sections, repeats and time signatures.',
		close: 'Close the editor. Your changes stay.',
		tabs: {
			chords: 'Write the arrangement: sections, bars and chords.',
			melody: 'Write the tune in ABC notation, drawn as sheet music under the chart.'
		}
	},

	chart: {
		open: 'The song as a chart for the band: chords and words with barlines, on paper you can print.',
		back: 'Back to the arranger. The song and the band come with you.',
		smaller: 'Smaller text on the chart.',
		larger: 'Larger text on the chart.',
		fit: 'Let the chart pick the largest text that fits the song on one page.'
	},

	tracks: {
		open: 'The song as tracks, like a recording studio: each part of the band and each recorded take on its own lane.',
		back: 'Back to the arranger. The song and the band come with you.',
		clip: 'Drag the take sideways to line it up with the band.',
		clipTakes:
			'Drag the take sideways to line it up with the band. Tap it to play the track’s next take instead.'
	},

	fullScreen: {
		open: 'Fill the screen with the chart, for reading on a stand. Tap the sides or use the arrow keys to turn pages.',
		close: 'Leave full screen (or press Esc).',
		play: 'Start or stop the band.'
	},

	paper: {
		print: 'Print the chart, or save it as a PDF.',
		previous: 'The page before.',
		next: 'The next page. On a touch screen you can swipe.'
	},

	myChords: {
		open: 'Your own guitar shapes: a chord the guitar doesn’t know yet, or a second shape like G:high.',
		pick: 'Change or delete this shape.',
		name: 'The chord name, as you’ll write it in the chart: like Cadd9, or G:high for a second G.',
		frets: 'Six frets, low E to high e, x for a muted string: 3,x,0,0,3,3 (or 3x0033).',
		save: 'Save this shape on this device. Every song that uses the name plays it.',
		new: 'Start a new shape.',
		delete:
			'Delete this shape from this device. Songs that use its name won’t play until it’s back.'
	},

	export: {
		mix: 'One WAV of the whole song as you hear it, ready to listen to or share.',
		stems: 'One WAV per instrument, in a zip, all lined up, to mix in a DAW like Logic.',
		midi: 'The notes as a MIDI file, a track per instrument, for Logic or another DAW.',
		processed:
			'On: each stem with your levels, pan, EQ and reverb (plus a reverb stem). Off: dry stems.',
		withMix: 'Also put the full mix in the zip.'
	},

	melody: {
		views: {
			draw: 'Draw the tune and its harmony lines on a grid of notes.',
			abc: 'The same tune as ABC notation, to read, paste or type.'
		},
		harmonyOptions: {
			styles: {
				stack:
					'The classic bluegrass sound: the next note of the chord up or down from the melody.',
				smooth: 'Moves as little as it can from note to note, staying on notes of the chord.',
				holds:
					'Like the classic sound, but holds its note while the melody passes between chord notes.',
				fewest: 'Stays on one note as long as it still fits the chord: the easiest line to sing.',
				parallel: 'A third or a sixth from the melody all the way, like twin fiddles.'
			},
			line: 'Options change the whole harmony line.',
			bar: 'Options change only the bar of the picked note, so you can mix styles bar by bar.',
			singers:
				'Hear only the melody and the harmony parts (solos them in the mixer). Tap again for the whole band.',
			putBack: 'Go back to the harmony line as it was before you tried any options.'
		},
		voices:
			"Pick which line to change: the melody, a harmony part or the bass. The tune's other lines show faintly behind it.",
		bassFromChart:
			"Throw away your changes to the bass line and go back to the band's own, written from the chart's chords.",
		roll: {
			grids: {
				eighth: 'Notes snap to eighth notes: two to a beat.',
				sixteenth: 'Notes snap to sixteenth notes: four to a beat, for fast fiddle runs.',
				triplet: 'Notes snap to triplets: three to a beat, as in Irish tunes.'
			},
			key: 'The key the song is in. It’s guessed from the first chord; pick it here if the guess is wrong. With a capo, it says which shapes you play.',
			delete: 'Delete the picked note (or press Delete).'
		},
		abcLink: 'Learn ABC notation, a simple way to write a tune as text.',
		startFromChart:
			'Write the tune’s header (title, key, time) and a rest for every bar of the chart, with its chords above, ready for notes.',
		pickupLength:
			'Notes sung or played before the first full bar. The tune starts with a short bar this long.',
		arrangementFromChords:
			'Replace the arrangement with one written from the melody’s chord symbols.',
		chordsIntoMelody:
			'Write the arrangement’s chords into the melody, as chord symbols above the notes.',
		wordsIntoMelody:
			'Write the chart’s words under the melody’s notes, bar by bar. Replaces any words the melody had.',
		harmony: {
			tenor: 'Add or remove a harmony line just above the melody: the next note of the chord up.',
			'high-baritone': 'Add or remove a high harmony line, two chord notes above the melody.',
			baritone:
				'Add or remove a harmony line just below the melody: the next note of the chord down.',
			'low-tenor': 'Add or remove a low harmony line, two chord notes below the melody.',
			rewrite:
				'Write the harmony lines again from the melody as it is now. Changes made to them by hand are replaced.'
		},
		sheetView: {
			concert: 'The sheet music as the song sounds, for anyone without a capo.',
			shapes: 'The sheet music in the key of the guitar’s chord shapes, to read with the capo on.'
		}
	},

	capoChoice: {
		raise: 'Keep the chord shapes and move the whole song, melody too.',
		keep: 'Keep the song where it sounds: the chart changes to new chord shapes for this capo.'
	},

	mixer: {
		close: 'Close the mixer. Playback carries on.',
		listening:
			'What you’re listening on. Save the EQs for each speaker or pair of headphones, and this device uses them on every song.',
		stripEq: 'Open this strip’s EQ: shape its tone, from deep bass to bright treble.',
		part: {
			bass: 'How loud the guitar’s bass notes (the “boom”) are.',
			strum: 'How loud the guitar’s strums (the “chuck”) are.'
		},
		instrument: 'What this part of the tune plays on. Tap to choose another.',
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
