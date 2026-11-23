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
			'/arranger': 'Write a chord chart and hear a bluegrass band play it.',
			'/arranger/transcribe':
				'Write a song down from a recording: its bars are found for you, then you write the chords and parts on them.',
			'/metronome': 'A metronome: just a click, at any tempo.'
		},
		settings: 'Settings: tips, the music keypad, the bass line, colours and shape.',
		storage: 'What the app keeps on this device: see it, and delete what you don’t want.',
		tipsToggle: 'Tips are on: rest on any control to see what it does. Tap to turn them off.'
	},

	storage: {
		look: 'Show what’s stored in it.',
		deleteOne: 'Delete this from the browser, for good.',
		deleteAll: 'Delete everything the app keeps in this browser, for good.',
		protect: 'Ask the browser not to clear the app’s data when the device runs low on space.'
	},

	transcribe: {
		sounds: {
			crisp: 'Keeps fast picking sharp and separate. Held notes and bass can get a little grainy.',
			balanced: 'A middle ground that suits most songs.',
			smooth: 'Keeps held notes and bass smooth. Fast notes blur a little.'
		}
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
		new: 'Start an empty song. The song open now is already saved.',
		examples:
			'Start a new song from an example, or from a recording you write down in Transcribe. The song open now is already saved.',
		open: 'Open one of your saved songs.',
		rename: 'Give this song a name of your own. Songs save themselves as you work.',
		openSaved: 'Open this song.',
		openFile: 'Open a song file someone sent you from this app.',
		deleteSaved: 'Delete this song for good.'
	},

	recording: {
		countIn:
			'How many bars of clicks before the song starts. A pickup comes in over the last of them.',
		use: 'Play this take on its lane. The other takes on the lane are kept, but not played.',
		earlier: 'Move the take a little earlier, if it sounds behind the band.',
		later: 'Move the take a little later, if it sounds ahead of the band.',
		download:
			'Save this take as a WAV file to send to someone. It starts one bar before bar 1, so it lines up when they add it to the same song.',
		delete: 'Delete this take for good.',
		addFile:
			'Add a take from a WAV file someone sent you (one made with Download here), onto this lane.'
	},
	metronome: {
		startStop: 'Start or stop the click. Space does the same.'
	},
	player: {
		play: 'Play the arrangement from the start (round and round while Loop is on). Changes you make while it plays are picked up.',
		stop: 'Stop playing. With Loop off, Play carries on from here.',
		toStart: 'Back to the start: the next Play begins at the top (or the first bar you chose).',
		metronome:
			'Click along with the band: tap to have the click play with the song when you press Play (it follows the song’s bars). Tap again to turn it off.',
		metronomeSound: 'The sound of the click: woodblock, cowbell, beep or tick.',
		metronomeLevel: 'How loud the click is.',
		swing:
			'How long-short the eighth notes are: straight at the left, a triplet feel at 66%, dotted at 75%. Tap the number for straight again.',
		tempoMore: 'Swing, and the click’s sound and level.',
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
			roll: 'Show the tune on a piano roll, to draw and change its notes.',
			sheet: 'Show the tune as sheet music, with the chords over it.'
		},
		loopSwitch:
			'Loop on: the song (or the part you chose) goes round and round. Off: it plays once and stops, for an ending.',
		loopSection: 'Choose which part of the song plays.',
		loopFrom: 'The first bar of the loop.',
		loopTo: 'The last bar of the loop.',
		loopEverything: 'Go back to looping the whole arrangement.',
		chordDisplay: {
			shapes: 'Show chords as the guitar shapes you play (with the capo on).',
			concert: 'Show chords as they actually sound.',
			roman:
				'Show what each chord does, the way a jazz school analyses it: V7/V for a chord leading to the V, subV7 for a tritone sub.',
			nashville: 'Show chords as Nashville numbers (1, 4, 5), the same in any key.'
		},
		editChord: 'Change this chord. Learn about it from inside the box.'
	},

	chordEdit: {
		name: 'The chord as the chart writes it. Change it, then tap Change.',
		save: 'Write the new chord into the chart. Its own reading is cleared.',
		learn: 'Open the chord tutor on this chord: what to play over it, and what it does.'
	},

	chordTutor: {
		hearScale: 'Play the scale that fits this chord, from its root up.'
	},

	chordFunction: {
		workedOut: 'The reading worked out from where the chord goes.',
		option: 'Another way to read this chord. Tap to use it.',
		useTyped: 'Use your own reading for this chord.',
		reset: 'Forget your reading and go back to the worked-out one.'
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

	tuner: {
		open: 'A tuner: play a string and tune it until the line runs down the green middle.',
		looks: {
			trace:
				'The last few seconds of pitch as a glowing line: green in tune, amber close, red far.',
			meter: 'A needle over ±50 cents, with a strobe band that stands still when you’re in tune.'
		}
	},
	transcription: {
		sectionPickup:
			'Where this section’s tune starts: on the bar, or a beat or more before it, when the singer comes in early (“I was…”). Only the tune: the chords stay on the bar.',
		changeReference: 'Work out a different recording.',
		markHere:
			'Put a marker where the playhead is (on the nearest bar line), and type the part’s name.',
		sectionEnd:
			'The section before ends at the start of this bar, and this bar starts no new one: put it after a part you want on its own, like a mando break.',
		send: 'Take the sections you named to the arranger: one part to practise, or several to build an arrangement from.',
		song: 'Pick a recording to transcribe. It becomes the open song’s recording.',
		file: 'Open a recording from this device: an MP3, WAV or any song file.',
		backToArranger: 'Go back to the song you came from, in the arranger.',
		startSong:
			'A new song on this recording’s bars, at its tempo, to write the chords and tune on.',
		play: 'Play or pause the recording (Space).',
		startOver: 'Back to the start of the song (Home).',
		barBack: 'Back to the start of this bar, or the one before if it’s only just started (comma).',
		barForward: 'On to the start of the next bar (full stop).',
		barHere:
			'The bar the playhead is at: name a section starting here (a marker, like “Verse”), end one, change how many beats it has, or cycle it. Clicking a bar’s number above does the same for that bar.',
		marker:
			'The name of the section starting at this bar. It becomes a section of the chart. Clear it to take the marker away.',
		speed: 'How fast the recording plays: lower is slower. The pitch stays the same.',
		resetSpeed: 'Back to the recording’s own speed.',
		tuneDown:
			'Lower the recording a cent, for a band that tuned sharp. Play it with a chord in the band and nudge until they sound in tune.',
		tuneUp: 'Raise the recording a cent, for a band that tuned flat.',
		tuneReset: 'How far the recording’s pitch is moved, in cents. Tap for as recorded.',
		findTuning:
			'Measure how far the band is from A = 440 and tune the recording back by that much. Between two notes it goes the way that lands in a key string bands play in (G, not A♭). Then nudge by ear if it needs it.',
		tuneOtherWay:
			'Tune it the other way instead: to the note on the other side, a semitone away. Choose the one the band sounds in tune with. The chords are guessed again to match.',
		countAlong:
			'Click on every beat as the recording plays, higher on each ONE, so you can hear if the bars fit.',
		key: 'The song’s key: the tune’s notes are spelled in it. Needed before you send it to the arranger.',
		time: 'How the song is counted. It lays the bars out on the ruler; a bar here and there with more or fewer beats is fixed in its own menu.',
		slideReference:
			'Drag the recording along the ruler, a beat at a time, until its ONE sits on a bar line. A pickup goes in bar 1, with the first ONE on bar 2. ⌘Z undoes.',
		trimStart:
			'Drag to trim the start: an intro, a false start or talking you don’t want is never played.',
		trimEnd: 'Drag to trim the end: the song stops there, and no bars are written past it.',
		more: 'The recording’s menu: fixes for the whole song’s beats (counting faster or slower, finding them again) and how the slowed-down sound is made.',
		doubleBeats: 'For when the count is half the song’s speed: a beat between every two.',
		halveBeats: 'For when the count is twice the song’s speed: every other beat.',
		findAgain:
			'Find the beats again from the recording. Bar 1 stays where it is; your fixes to the beats are forgotten (⌘Z brings them back).',
		ruler:
			'Click anywhere to play from there. Click a bar’s number for its menu: a marker, its beats (a short or long bar), and Cycle.',
		beatDot:
			'A beat. If its hit sits off the line below, drag the dot onto the hit; it snaps. Tap it for more.',
		undoBeats: 'Put the beats back as they were before your last change to them (⌘Z).',
		doneFixingBeats: 'Hide the beats again, so they can’t move by accident.',
		referenceLane:
			'The reference recording, fitted to the bars. Tap to play from there. Drag its top strip to slide it, its ends to trim it.',
		waveformColour:
			"The waveform's colour. It's the same choice as Settings → Appearance → Waveform.",
		chordBar:
			'Tap to type this bar’s chords: a box on each beat a chord can change on (1 and 3 in 4/4), the chord where it changes.',
		partLane: 'Edit this part in the piano roll below. A click anywhere on its lane picks it too.',
		bandLane:
			'The band (guitar, mandolin, bass) plays these chords along with the recording. Tap a bar to type its chords. Each instrument’s own level is in the mixer.',
		guessChords:
			'Fill the bars with a guess from the recording. Then play it with the band and fix what sounds wrong.',
		clearChords:
			'Empty every bar’s chords, the ones you typed too, to guess again or work them out by ear.',
		addLane:
			'Add another line of the tune to write by ear: the vocal, a mandolin break, a fiddle part. You name it first. It has its own instrument and level, and goes to the arranger with the rest.',
		laneMenu: 'Name this part, and more.',
		laneName: 'Call this part what it is (Lead vocal, Mandolin break).',
		laneBass:
			'Make this lane the song’s bass line. The lane goes; the bass is written from its notes.',
		laneRemove: 'Take this lane away, with its notes.',
		bottomViews: {
			roll: 'Write and edit the picked part as notes on a grid.',
			sheet: 'See what you’ve written as a score.',
			tab: 'The picked part as TAB, for guitar, mandolin or banjo: pick a number to change its fret or string.'
		},
		clock: 'Where the playhead is: bar, beat and sixteenth, or the time. Click to switch.',
		laneVolume:
			'How loud this lane plays. Turn the recording down or a part up to hear the part over it. Double-click to put it back.',
		fewerBeats: 'This bar has a beat fewer. The bars after it move along.',
		moreBeats: 'This bar has a beat more. The bars after it move along.',
		loop: 'Play just this bar over and over (L). Drag across the strip at the top for more bars.',
		cycle: 'Turn the cycle on or off (C): play the stretch marked in the strip over and over.',
		cycleSections:
			'Play one of your named sections over and over: from its marker to the next marker or End.',
		cycleSection: 'Cycle this section, and turn the cycle on.',
		cycleStrip:
			'Drag across to play that stretch over and over (the cycle). Click to turn it on or off.',
		snapCycle: 'On: the cycle’s ends snap to sixteenth notes. Off: drag anywhere for a free cycle.',
		closeMenu: 'Close.',
		barStartsHere:
			'This beat is a ONE: the nearest bar line moves here, and the bars after it move along.',
		addBeat: 'Add a beat the finder missed, halfway after this one.',
		removeBeat: 'Take this beat away: one the finder heard that isn’t there.'
	},

	zoom: {
		across: {
			out: 'Zoom out across: more of the song fits.',
			in: 'Zoom in across: more room for each beat.',
			reset: 'Back to the usual width.'
		},
		down: {
			out: 'Zoom out down: shorter lanes or rows.',
			in: 'Zoom in down: taller lanes or rows.',
			reset: 'Back to the usual height.'
		}
	},

	tracks: {
		open: 'The song as tracks, like a recording studio: each part of the band on its own lane, and audio lanes to record on.',
		back: 'Back to the arranger. The song comes with you.',
		play: 'Play the band from the playhead, with your takes (Space). Press again to stop.',
		record:
			'Record on the lane whose record button is lit: the count-in clicks, then the band plays the song once. Press again (or Play) to finish early.',
		ruler: 'Click to move the playhead there: Play carries on from that spot.',
		arm: 'Record on this lane: Record puts the next take here.',
		addLane:
			'Add a lane to record on: a voice, or a real instrument along with the band. You name it first. Up to four.',
		laneMenu: 'This lane’s name and takes, and a take from a file.',
		laneName: 'Call this lane what’s on it (Lead vocal, Mandolin break).',
		laneRemove: 'Take this empty lane away.',
		chord: 'Change this chord: the chart changes too, everywhere this bar is played.',
		clip: 'Drag the take sideways to line it up with the band.',
		clipTakes:
			'Drag the take sideways to line it up with the band. Tap it to play the lane’s next take instead.'
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
		withMix: 'Also put the full mix in the zip.',
		song: 'Send the whole song to a bandmate (or your own other phone or computer) to open in this app.'
	},

	share: {
		link: 'A link with the whole song in it, to paste into a message. Recorded takes don’t fit.',
		file: 'One file with the whole song and its takes. They open it from Open → Open a song file.',
		send: 'Send it: the share sheet on a phone; on a computer, copy the link or save the file.'
	},

	receive: {
		open: 'Save this song among yours and open it.',
		update: 'Replace your copy with what was sent. Takes you recorded on it are kept.',
		keepBoth: 'Save what was sent as a new song, next to yours.'
	},

	melody: {
		tabFret:
			'Where this note is played: the fret, on its string. Pick it, then type a fret to change the note, or ↑ ↓ for another string.',
		tabFretField:
			'The fret this note is played at. Type another to change the note, on the same string.',
		tabStringUp: 'Play this note on the string above, at the fret that gives the same note.',
		tabStringDown: 'Play this note on the string below, at the fret that gives the same note.',
		tabInstrument: 'The instrument this part’s TAB is written for.',
		tabTuning:
			'How the instrument is tuned. The frets follow the tuning; the notes stay the same. Custom lets you pick each string’s note.',
		tabStringTuning: 'The note this string is tuned to, top line of the TAB first.',
		views: {
			draw: 'Draw the tune and its harmony lines on a grid of notes.',
			tab: 'The picked part as TAB, for guitar, mandolin or banjo: pick a number to change its fret or string.',
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
			tempoLane:
				'How fast the song goes, bar by bar. Click to add a point and drag it up or down to slow down or speed up there, for a ritard at the end. Double-click a point to remove it.',
			grids: {
				eighth: 'Notes snap to eighth notes: two to a beat.',
				sixteenth: 'Notes snap to sixteenth notes: four to a beat, for fast fiddle runs.',
				triplet: 'Notes snap to triplets: three to a beat, as in Irish tunes.'
			},
			key: 'The key the song is in. It’s guessed from the first chord; pick it here if the guess is wrong. With a capo, it says which shapes you play.',
			delete: 'Delete the picked note (or press Delete).',
			octaveUp:
				'Move every note of this part up an octave. The melody takes its harmony lines with it.',
			octaveDown:
				'Move every note of this part down an octave. The melody takes its harmony lines with it.'
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
		openSetups:
			'Save every strip’s EQ for what you’re listening on, so this device uses it on every song.'
	},

	listening: {
		choose: 'Use this setup on this device, for every song.',
		none: 'Use each song’s own EQ instead of a setup.',
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
		resetAppearance: 'Go back to the original colours and shape.',
		popOut: 'Settings in a window of its own, beside the app: every change shows straight away.',
		dropShadows:
			'Cards, buttons, menus and bars stand up off the page, and lanes and fields sink into it. Off, the whole app is flat.'
	}
});
