<script>
	import { parseArrangement } from '$lib/arranger/parseArrangement.js';
	import { rhythm, slotPositions } from '$lib/arranger/timeline.js';
	import { melodyEvents, melodyFit, melodyFromTune } from '$lib/arranger/melody.js';
	import { MAX_CAPO, abcWithChords, arrangementFromAbc, hasChords } from '$lib/arranger/abcChords.js';
	import { eventAt, melodyTime, playedQuarters, sheetEvents } from '$lib/arranger/follow.js';
	import { resolve } from '$app/paths';
	import { playArrangement } from '$lib/arranger/guitar.js';
	import Mixer from '$lib/arranger/Mixer.svelte';
	import ArrangementStrip from '$lib/arranger/ArrangementStrip.svelte';
	import { arrangementToMidi } from '$lib/arranger/midi.js';
	import { mixer, FADER_MIN } from '$lib/arranger/mixer.svelte.js';
	import { chordLabel, keyName, mod12, songKey } from '$lib/arranger/key.js';
	import { loopOffset, loopRegion, loopScope } from '$lib/arranger/loop.js';
	import ArrangementKeypad from '$lib/arranger/ArrangementKeypad.svelte';
	import { onMount } from 'svelte';

	let arrangement = $state(`

"Chorus"|G|G|G|G|C|C|G|G|G|G|G|G|G|G,D|G|G|


`);

	let parsed = $derived.by(() => {
		try {
			const sections = parseArrangement(arrangement);
			slotPositions(sections); // checks every bar fits its time signature
			return { sections, error: '' };
		} catch (err) {
			return { sections: [], error: err instanceof Error ? err.message : String(err) };
		}
	});
	let sections = $derived(parsed.sections);

	let capo = $state(0);
	/** Frets a capo can go on (0 = no capo). */
	const CAPO_CHOICES = Array.from({ length: MAX_CAPO + 1 }, (_, fret) => fret);
	let tempo = $state(120);
	const TEMPO_MIN = 40;
	const TEMPO_MAX = 300;
	const TEMPO_DEFAULT = 120;

	/** Whatever was typed becomes a whole BPM in range (Safari allows letters in number fields). */
	function tidyTempo() {
		const bpm = Math.round(Number(tempo));
		tempo = Number.isFinite(bpm) && bpm > 0 ? Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, bpm)) : TEMPO_DEFAULT;
	}

	/** Semitones on top of the capo, for every instrument (a new key for a singer). */
	let transpose = $state(0);
	/** @type {import('$lib/arranger/key.js').ChordDisplay} */
	let chordDisplay = $state('shapes');

	const DISPLAYS = /** @type {const} */ ([
		{ id: 'shapes', name: 'Guitar shapes' },
		{ id: 'concert', name: 'Concert' },
		{ id: 'roman', name: 'Roman' },
		{ id: 'nashville', name: 'Nashville' }
	]);

	let key = $derived(songKey(sections));
	let capoFrets = $derived(Number(capo) || 0);
	/** Sounding pitch relative to the chords as written. */
	let shift = $derived(capoFrets + transpose);
	// Keys a singer can pick: up to 5 semitones down or 6 up from the current one
	let keyChoices = $derived(
		key
			? Array.from({ length: 12 }, (_, i) => i - 5).map((t) => ({
					transpose: t,
					name: keyName(key, capoFrets + t) + (t === 0 ? ' (original)' : '')
				}))
			: []
	);
	let label = $derived.by(() => {
		const options = { key, shift, mode: chordDisplay };
		return (/** @type {string} */ chord) => chordLabel(chord, options);
	});
	let strumError = $state('');
	let mixerOpen = $state(false);
	/** The mixer drawer's height, so the page can scroll its content clear of it. */
	let mixerHeight = $state(0);

	/*
	 * Optional melody in ABC notation: drawn as sheet music with abcjs, and
	 * played on the guitar samples along with the band (see melody.js; abcjs's
	 * own playback isn't used). abcjs needs the browser, so it's loaded on demand.
	 */
	let abcNotation = $state('');
	/** @type {HTMLDivElement | undefined} */
	let abcTarget = $state();
	/** @type {string[]} */
	let abcWarnings = $state([]);
	/** The drawn tune, for its notes. */
	/** @type {import('abcjs').TuneObject | null} */
	let abcTune = $state.raw(null);
	/** The tune as abcjs plays it (repeats played out), for its chords. */
	/** @type {any[][] | null} */
	let abcSequence = $state.raw(null);
	/** Every drawn note as played, with where it's drawn (abcjs TimingCallbacks). */
	/** @type {import('abcjs').NoteTimingEvent[] | null} */
	let abcTimings = $state.raw(null);
	const ABC_DEBOUNCE = 200; // ms; redraw once typing pauses
	const ABC_PLACEHOLDER = ['X:1', 'T:Tune name', 'M:4/4', 'L:1/8', 'K:G', 'GABc dedB|dedB dedB|'].join('\n');

	$effect(() => {
		const notation = abcNotation;
		const target = abcTarget;
		if (notation.trim() === '') {
			abcTune = null;
			abcSequence = null;
			abcTimings = null;
		}
		if (!target || notation.trim() === '') return;
		let cancelled = false;
		const timer = setTimeout(async () => {
			const { default: abcjs } = await import('abcjs');
			if (cancelled) return;
			const [tune] = abcjs.renderAbc(target, notation, { responsive: 'resize', add_classes: true });
			// Warnings come as HTML snippets; show them as plain text
			abcWarnings = (tune?.warnings ?? []).map((warning) => warning.replace(/<[^>]*>/g, ''));
			abcTune = tune ?? null;
			try {
				abcSequence = tune ? abcjs.synth.sequence(tune, {}) : null;
				abcTimings = tune ? new abcjs.TimingCallbacks(tune, {}).noteTimings : null;
			} catch {
				abcSequence = null;
				abcTimings = null;
			}
		}, ABC_DEBOUNCE);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});

	/** The melody's notes, timed from bar 1, or null when there's no (playable) tune. */
	let melody = $derived.by(() => {
		if (!abcTune) return { line: null, error: '' };
		try {
			const line = melodyFromTune(abcTune);
			return { line: line.notes.length > 0 ? line : null, error: '' };
		} catch (err) {
			return { line: null, error: err instanceof Error ? err.message : String(err) };
		}
	});
	/** How the melody's length compares with one pass of the arrangement. */
	let melodyMatch = $derived.by(() => {
		if (!melody.line || parsed.error || sections.length === 0) return null;
		const quarters = rhythm(sections).quarters;
		return { quarters, ...melodyFit(melody.line, quarters) };
	});
	/** Shorter than this (in beats) is just the last bar's held note or rest. */
	const MELODY_SHORT_WARNING = 4;

	/*
	 * Chords both ways: an arrangement from the melody's chord symbols, or
	 * the arrangement's chords written into a melody that has none.
	 */
	let melodyHasChords = $derived(abcSequence ? hasChords(abcSequence) : false);
	/** What the last chord conversion wants the reader to know. */
	/** @type {{ title: string, notes: string[] } | null} */
	let chordReport = $state(null);

	function arrangementFromMelody() {
		if (!abcSequence) return;
		const result = arrangementFromAbc(abcSequence);
		if (!result) return;
		if (
			arrangement.trim() !== '' &&
			!confirm('Replace the arrangement with the chords from the melody?')
		) {
			return;
		}
		stop();
		arrangement = `\n${result.text}\n`;
		capo = result.capo;
		transpose = 0;
		loopSection = -1;
		loopFrom = 1;
		loopTo = Infinity;
		chordReport = {
			title: `Arrangement written from the melody's chords${result.capo ? `, with capo ${result.capo}` : ''}.`,
			notes: result.notes
		};
	}

	function chordsIntoMelody() {
		if (!abcSequence || parsed.error || sections.length === 0) return;
		const result = abcWithChords(abcNotation, abcSequence, sections, { capo: capoFrets });
		abcNotation = result.abc;
		chordReport = { title: "The arrangement's chords are written into the melody.", notes: result.notes };
	}

	/** @param {number} beats */
	const beatsText = (beats) => {
		const rounded = Math.round(beats * 100) / 100;
		return `${rounded} beat${rounded === 1 ? '' : 's'}`;
	};

	/*
	 * Phone keypad: on touch screens the arrangement box uses a music keypad
	 * (only the keys an arrangement needs) instead of the phone's keyboard.
	 */
	const KEYPAD_SETTING = 'arranger.phoneKeyboard';
	/** @type {HTMLTextAreaElement | undefined} */
	let textarea = $state();
	let touch = $state(false);
	let keypadOn = $state(true);
	/** @type {'music' | 'text'} */
	let keypadMode = $state('music');
	let keypadHeight = $state(0);
	let editing = $state(false);
	let useKeypad = $derived(touch && keypadOn);
	let keypadShown = $derived(useKeypad && editing);

	onMount(() => {
		const coarse = window.matchMedia('(pointer: coarse)');
		touch = coarse.matches;
		const update = () => (touch = coarse.matches);
		coarse.addEventListener('change', update);
		try {
			keypadOn = localStorage.getItem(KEYPAD_SETTING) !== 'off';
		} catch {
			// storage unavailable: keep the default
		}
		return () => coarse.removeEventListener('change', update);
	});

	/** @param {boolean} on */
	function setKeypadOn(on) {
		keypadOn = on;
		keypadMode = 'music';
		try {
			localStorage.setItem(KEYPAD_SETTING, on ? 'on' : 'off');
		} catch {
			// storage unavailable: the choice lasts for this visit
		}
	}

	/*
	 * Loop: the whole arrangement, one section, or a range of bars within
	 * either. Bars are numbered within the chosen scope, from 1.
	 */
	let loopSection = $state(-1); // section index, -1 = whole arrangement
	let loopFrom = $state(1);
	let loopTo = $state(Infinity);
	let loopBars = $derived(loopScope(sections, loopSection).length);
	/** Only part of the arrangement is chosen. */
	let looping = $derived(
		loopBars > 0 &&
			(loopSection !== -1 || (Number(loopFrom) || 1) > 1 || Math.min(loopTo, loopBars) < loopBars)
	);
	/** What actually plays (and scrolls): the loop region, or everything. */
	let playSections = $derived(
		looping ? loopRegion(sections, { section: loopSection, from: loopFrom, to: loopTo }) : sections
	);

	/** New scope: start with all of its bars. */
	function chooseLoopSection() {
		loopFrom = 1;
		loopTo = loopScope(sections, loopSection).length;
		loopChanged();
	}

	/** Changing the loop while playing jumps straight to the new region. */
	function loopChanged() {
		if (playback) play();
	}

	/** @typedef {Awaited<ReturnType<typeof playArrangement>>} Playback */
	/** @typedef {ReturnType<Playback['position']>} Position */

	/** @type {Playback | null} */
	let playback = $state(null);
	/** @type {Position} */
	let position = $state(null);

	// Follow the audio clock while playing
	$effect(() => {
		if (!playback) return;
		const current = playback;
		let frame = requestAnimationFrame(function tick() {
			const next = current.position();
			if (
				next?.section !== position?.section ||
				next?.measure !== position?.measure ||
				next?.chord !== position?.chord ||
				next?.beat !== position?.beat
			) {
				position = next;
			}
			frame = requestAnimationFrame(tick);
		});
		return () => {
			cancelAnimationFrame(frame);
			position = null;
		};
	});

	function stop() {
		playback?.stop();
		playback = null;
	}

	/*
	 * Follow the sheet music while playing: the sounding note is highlighted,
	 * a cursor glides across the staff, and when it moves to a new line that's
	 * out of view the page scrolls to it (only while the sheet music is on
	 * screen, so it never pulls you away from the chart).
	 */
	/** Which bars of the melody this playback is on (set by play()). */
	let follow = { offset: 0, pickup: 0 };
	let sheet = $derived(
		abcTimings && abcSequence && melody.line
			? sheetEvents(abcTimings, playedQuarters(abcSequence), melody.line.pickup)
			: []
	);
	const CURSOR_WIDTH = 2; // SVG units
	const PLAYING_CLASS = 'abcjs-playing';

	$effect(() => {
		const current = playback;
		const events = sheet;
		const svg = abcTarget?.querySelector('svg');
		if (!current || !svg || events.length === 0) return;

		const cursor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		cursor.setAttribute('class', 'abcjs-cursor');
		cursor.setAttribute('width', String(CURSOR_WIDTH));
		cursor.style.display = 'none';
		svg.appendChild(cursor);

		/** @type {Element[]} */
		let lit = [];
		let shown = -1;
		let line = -1;

		/** @param {number} index */
		const highlight = (index) => {
			for (const element of lit) element.classList.remove(PLAYING_CLASS);
			lit = index >= 0 ? events[index].elements : [];
			for (const element of lit) element.classList.add(PLAYING_CLASS);
			shown = index;
		};

		let frame = requestAnimationFrame(function tick() {
			const clock = current.beats();
			const time = clock ? melodyTime(clock, follow) : NaN;
			const index = Number.isFinite(time) ? eventAt(events, time) : -1;
			if (index !== shown) highlight(index);

			if (index < 0) {
				cursor.style.display = 'none';
			} else {
				const event = events[index];
				const progress = Math.min(1, Math.max(0, (time - event.t) / (event.end - event.t)));
				cursor.setAttribute('x', String(event.left + (event.endX - event.left) * progress));
				cursor.setAttribute('y', String(event.top));
				cursor.setAttribute('height', String(event.height));
				cursor.style.display = '';
				if (event.line !== line) {
					line = event.line;
					followLine(cursor);
				}
			}
			frame = requestAnimationFrame(tick);
		});

		return () => {
			cancelAnimationFrame(frame);
			highlight(-1);
			cursor.remove();
		};
	});

	/**
	 * Scroll a new line of music into view, if the sheet music is on screen
	 * but that line isn't.
	 * @param {Element} cursor
	 */
	function followLine(cursor) {
		const sheetBox = abcTarget?.getBoundingClientRect();
		if (!sheetBox || sheetBox.bottom < 0 || sheetBox.top > window.innerHeight) return;
		const box = cursor.getBoundingClientRect();
		if (box.top >= 0 && box.bottom <= window.innerHeight) return;
		cursor.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	function downloadMidi() {
		strumError = '';
		try {
			if (parsed.error) throw new Error(parsed.error);
			const bpm = Number(tempo) || 120;
			const parts = mixer.channels.find((channel) => channel.id === 'guitar')?.parts ?? [];
			const level = (/** @type {string} */ id) => {
				const db = parts.find((part) => part.id === id)?.volume ?? 0;
				return db <= FADER_MIN ? -Infinity : db;
			};
			const channelLevel = (/** @type {string} */ id) => {
				const db = mixer.channels.find((channel) => channel.id === id)?.volume ?? 0;
				return db <= FADER_MIN ? -Infinity : db;
			};

			const bytes = arrangementToMidi(sections, {
				capo: capoFrets,
				transpose,
				bpm,
				bassDb: level('bass'),
				strumDb: level('strum'),
				melody: melody.line,
				melodyDb: channelLevel('melody')
			});

			const title = sections[0]?.name || 'arrangement';
			const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = `${slug || 'arrangement'}-${bpm}bpm.mid`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (err) {
			strumError = err instanceof Error ? err.message : String(err);
		}
	}

	async function play() {
		stop();
		strumError = '';
		try {
			if (parsed.error) throw new Error(parsed.error);
			const bpm = Number(tempo) || 120;
			// The melody plays the same bars as the band (all of them, or the loop region)
			const offset = looping
				? loopOffset(sections, { section: loopSection, from: loopFrom, to: loopTo })
				: 0;
			follow = { offset, pickup: offset === 0 ? (melody.line?.pickup ?? 0) : 0 };
			playback = await playArrangement(playSections, {
				capo: capoFrets,
				transpose,
				bpm,
				melody: melody.line
					? melodyEvents(melody.line, { sections: playSections, offset, bpm, shift: transpose })
					: null
			});
		} catch (err) {
			strumError = err instanceof Error ? err.message : String(err);
		}
	}
</script>

<svelte:head>
	<title>Bluegrass Arranger</title>
</svelte:head>

<!-- Extra room at the bottom while the mixer is open, so nothing is stuck under it -->
<main
	class="mx-auto max-w-5xl px-4 py-8 sm:px-8"
	style:padding-bottom={mixerOpen
		? `${mixerHeight + 32}px`
		: keypadShown
			? `${keypadHeight + 32}px`
			: null}
>
	<h1 class="mb-6 text-3xl font-bold">Bluegrass Arranger</h1>

	<!-- Player: transport and settings, with the scrolling chart right under them -->
	<section class="mb-10 rounded-xl border border-gray-200 bg-gray-50 p-4" aria-label="Player">
		<!-- Fixed areas (not free wrapping), so nothing jumps around at any width -->
		<div class="toolbar">
			<div class="transport">
				<button
					type="button"
					onclick={play}
					class="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-700"
				>
					Play
				</button>

				<button
					type="button"
					onclick={stop}
					disabled={!playback}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-100 disabled:opacity-40"
				>
					Stop
				</button>
			</div>

			<div class="settings">
				<label class="setting">
					Tempo
					<input
						type="number"
						inputmode="numeric"
						min={TEMPO_MIN}
						max={TEMPO_MAX}
						bind:value={tempo}
						onchange={tidyTempo}
						class="w-18 rounded-lg border border-gray-300 bg-white px-2 py-1"
					/>
					<span class="text-sm font-normal text-gray-500">BPM</span>
				</label>

				<label class="setting">
					Capo
					<select bind:value={capo} class="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1">
						{#each CAPO_CHOICES as fret (fret)}
							<option value={fret}>{fret === 0 ? 'None' : fret}</option>
						{/each}
					</select>
				</label>

				<label class="setting">
					Key
					<select
						bind:value={transpose}
						disabled={keyChoices.length === 0}
						class="w-36 rounded-lg border border-gray-300 bg-white px-2 py-1 disabled:opacity-40"
					>
						{#each keyChoices as choice (choice.transpose)}
							<option value={choice.transpose}>{choice.name}</option>
						{/each}
					</select>
				</label>
			</div>

			<div class="actions">
				<!-- Same label open or closed (the colour shows it's open), so its width never changes -->
				<button
					type="button"
					onclick={() => (mixerOpen = !mixerOpen)}
					aria-expanded={mixerOpen}
					aria-controls="mixer-drawer"
					class="flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-semibold {mixerOpen
						? 'border-amber-500 bg-amber-500 text-gray-900'
						: 'border-amber-500 bg-white text-gray-900 hover:bg-amber-50'}"
				>
					{@render slidersIcon()}
					Mixer
				</button>

				<!-- A MIDI file is for a computer DAW (Logic), so it's hidden on touch screens -->
				<button
					type="button"
					onclick={downloadMidi}
					class="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-100 pointer-coarse:hidden"
				>
					Download .mid
				</button>
			</div>
		</div>

		<!-- Loop: everything, a section, or just a few bars of it -->
		<div class="loopbar" class:looping>
			<span class="font-semibold">Loop</span>
			<select
				bind:value={loopSection}
				onchange={chooseLoopSection}
				disabled={sections.length === 0}
				aria-label="Loop which part"
				class="w-44 rounded-lg border border-gray-300 bg-white px-2 py-1"
			>
				<option value={-1}>Whole arrangement</option>
				{#each sections as section, s (s)}
					<option value={s}>{section.name}</option>
				{/each}
			</select>

			<label class="flex items-center gap-2">
				bars
				<input
					type="number"
					min="1"
					max={loopBars}
					bind:value={loopFrom}
					onchange={loopChanged}
					aria-label="First bar"
					class="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1"
				/>
			</label>
			<label class="flex items-center gap-2">
				to
				<input
					type="number"
					min="1"
					max={loopBars}
					value={Math.min(loopTo, loopBars)}
					onchange={(event) => {
						loopTo = Number(event.currentTarget.value);
						loopChanged();
					}}
					aria-label="Last bar"
					class="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1"
				/>
			</label>
			<span class="text-sm text-gray-500">of {loopBars}</span>

			{#if looping}
				<button
					type="button"
					onclick={() => {
						loopSection = -1;
						chooseLoopSection();
					}}
					class="rounded-lg px-2 py-1 text-sm font-semibold text-amber-800 hover:bg-amber-100"
				>
					Loop everything
				</button>
			{/if}
		</div>

		<div class="statusbar">
			<div class="flex overflow-hidden rounded-lg border border-gray-300 bg-white" role="group" aria-label="Show chords as">
				{#each DISPLAYS as display (display.id)}
					<button
						type="button"
						class="border-l border-gray-300 px-1.5 py-1 text-sm font-semibold first:border-l-0 sm:px-3 {chordDisplay ===
						display.id
							? 'bg-gray-900 text-white'
							: 'hover:bg-gray-100'}"
						aria-pressed={chordDisplay === display.id}
						onclick={() => (chordDisplay = display.id)}
					>
						{display.name}
					</button>
				{/each}
			</div>

			<!-- Always present, one line, so it never pushes anything around -->
			<p class="key-info">
				{#if key && shift !== 0}
					Sounds in <strong>{keyName(key, shift)}</strong> · guitar plays
					<strong>{keyName(key)}</strong> shapes, capo {mod12(shift)}
				{:else if key}
					Key of <strong>{keyName(key)}</strong>
				{/if}
			</p>

			<!-- Fixed-width cells: the text changes every beat, the box never moves -->
			<!-- <p class="position" class:playing={position} aria-live="off">
				{#if position}
					<span class="cell section-cell" title={position.sectionName}>{position.sectionName}</span>
					<span class="cell">bar {(playSections[position.section]?.barOffset ?? 0) + position.measure + 1}</span>
					<strong class="cell chord-cell">{label(position.name)}</strong>
					<span class="cell">beat {position.start - position.barStart + position.beat + 1}</span>
					<span class="cell role-cell">{position.role}</span>
				{:else}
					<span class="text-gray-400">Stopped</span>
				{/if}
			</p> -->
		</div>

		{#if sections.length > 0}
			<ArrangementStrip sections={playSections} {playback} {label} />
		{:else}
			<p class="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
				Write an arrangement below and it will show up here.
			</p>
		{/if}

		{#if strumError}
			<p class="mt-3 text-sm text-red-600">{strumError}</p>
		{/if}
	</section>

	<div class="mb-2 flex items-center gap-2">
		<label for="arrangement" class="font-semibold">Song Arrangement</label>
		<!-- Opens in a new tab so the arrangement being written (and playback) isn't lost -->
		<a
			href={resolve('/arranger/help')}
			target="_blank"
			rel="noopener"
			title="How to write an arrangement"
			aria-label="How to write an arrangement (opens in a new tab)"
			class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-gray-900 text-sm font-bold text-gray-900 hover:bg-gray-900 hover:text-white"
		>
			?
		</a>

		{#if touch}
			<label class="ml-auto flex items-center gap-2 text-sm text-gray-600">
				<input type="checkbox" checked={!keypadOn} onchange={(event) => setKeypadOn(!event.currentTarget.checked)} />
				Use phone keyboard
			</label>
		{/if}
	</div>

	<textarea
		id="arrangement"
		bind:this={textarea}
		bind:value={arrangement}
		class="min-h-96 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm pointer-coarse:text-base"
		spellcheck="false"
		autocapitalize="off"
		autocomplete="off"
		inputmode={useKeypad && keypadMode === 'music' ? 'none' : undefined}
		onfocus={() => {
			editing = true;
			// Keep what you're typing visible above the keypad
			setTimeout(() => textarea?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
		}}
		onblur={() => {
			// Switching keyboards blurs and refocuses at once; only close if focus really left
			setTimeout(() => (editing = document.activeElement === textarea), 150);
		}}
	></textarea>

	{#if parsed.error}
		<p class="mt-2 text-sm text-red-600">{parsed.error}</p>
	{/if}

	<!-- Optional sheet music, written in ABC notation -->
	<details class="mt-6 rounded-lg border border-gray-200 p-4" open={abcNotation.trim() !== ''}>
		<summary class="cursor-pointer font-semibold">
			Melody <span class="font-normal text-gray-500">(optional, ABC notation)</span>
		</summary>
		<p class="mt-3 mb-2 text-sm text-gray-600">
			Paste or write a tune in <a href="https://abcnotation.com/learn" target="_blank" rel="noopener" class="text-blue-700 underline">ABC notation</a>.
			It's drawn as sheet music at the bottom of the page, and the guitar plays it along with the band:
			the tune's first full bar starts with the arrangement's first bar, at the tempo above. The band
			always plays the arrangement: if the tune has chord symbols (like <code>"G"</code>), the
			arrangement can be written from them, and if it has none, the arrangement's chords can be added
			to it. Write the tune at its real (concert) pitch; the capo doesn't move it.
		</p>
		<textarea
			id="abc-notation"
			bind:value={abcNotation}
			aria-label="ABC notation"
			placeholder={ABC_PLACEHOLDER}
			class="min-h-48 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm pointer-coarse:text-base"
			spellcheck="false"
			autocapitalize="off"
			autocomplete="off"
		></textarea>

		{#if melody.error}
			<p class="mt-2 text-sm text-red-600">The melody can't be played: {melody.error}</p>
		{:else if melody.line && melodyMatch}
			<p class="mt-2 text-sm text-gray-600">
				Melody: {beatsText(melody.line.pickup + melody.line.length)}, arrangement: {beatsText(
					melodyMatch.quarters
				)}.
				{#if melody.line.pickup > 0}
					The melody's {beatsText(melody.line.pickup)} pickup plays before the band comes in, and again
					at the end of each time through, leading back to the top.{/if}
			</p>
			{#if melodyMatch.extra > 0}
				<p class="mt-1 text-sm text-amber-700">
					The arrangement ends first, so the melody's last {beatsText(melodyMatch.extra)} are cut off.
				</p>
			{:else if melodyMatch.missing >= MELODY_SHORT_WARNING}
				<p class="mt-1 text-sm text-amber-700">
					The melody ends {beatsText(melodyMatch.missing)} before the arrangement does.
				</p>
			{/if}
		{/if}

		{#if abcSequence}
			<div class="mt-3 flex flex-wrap items-center gap-3">
				{#if melodyHasChords}
					<button
						type="button"
						onclick={arrangementFromMelody}
						class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-100"
					>
						Write the arrangement from these chords
					</button>
				{:else if sections.length > 0 && !parsed.error}
					<button
						type="button"
						onclick={chordsIntoMelody}
						class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-gray-100"
					>
						Add the arrangement's chords to the melody
					</button>
				{/if}
			</div>
		{/if}

		{#if chordReport}
			<div class="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
				<p class="font-semibold">{chordReport.title}</p>
				{#if chordReport.notes.length > 0}
					<ul class="mt-1 list-disc pl-5 text-amber-700">
						{#each chordReport.notes as note, i (i)}
							<li>{note}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</details>

	{#if abcNotation.trim() !== ''}
		<section class="mt-10" aria-label="Sheet music">
			<h2 class="mb-3 text-xl font-semibold">Sheet music</h2>
			{#if abcWarnings.length > 0}
				<ul class="mb-3 list-disc pl-6 text-sm text-red-600">
					{#each abcWarnings as warning, i (i)}
						<li>{warning}</li>
					{/each}
				</ul>
			{/if}
			<div bind:this={abcTarget} class="overflow-x-auto rounded-lg border border-gray-200 bg-white p-2"></div>
		</section>
	{/if}
</main>

{#snippet slidersIcon()}
	<!-- Three faders -->
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
		<line x1="5" y1="3" x2="5" y2="21" />
		<line x1="12" y1="3" x2="12" y2="21" />
		<line x1="19" y1="3" x2="19" y2="21" />
		<rect x="2.5" y="13" width="5" height="3.5" rx="1" fill="currentColor" />
		<rect x="9.5" y="6" width="5" height="3.5" rx="1" fill="currentColor" />
		<rect x="16.5" y="10" width="5" height="3.5" rx="1" fill="currentColor" />
	</svg>
{/snippet}

{#if keypadShown}
	<ArrangementKeypad {textarea} bind:mode={keypadMode} bind:height={keypadHeight} />
{/if}

<!-- A handle on the bottom edge of the screen, so the tray is always findable -->
{#if !mixerOpen && !keypadShown}
	<button type="button" class="mixer-handle" onclick={() => (mixerOpen = true)} aria-controls="mixer-drawer">
		{@render slidersIcon()}
		Mixer ▲
	</button>
{/if}

<!--
	Mixer: a tray that slides up over the bottom of the page. It doesn't
	block anything, so the chart stays visible and playback keeps going
	while you mix.
-->
<div
	id="mixer-drawer"
	bind:offsetHeight={mixerHeight}
	class="mixer-drawer"
	class:open={mixerOpen}
	role="region"
	aria-label="Mixer"
	inert={!mixerOpen}
>
	<div class="mx-auto max-w-5xl px-4 pt-3 pb-5 sm:px-8">
		<div class="mb-2 flex items-center justify-between">
			<h2 class="font-semibold text-gray-100">Mixer</h2>
			<button
				type="button"
				onclick={() => (mixerOpen = false)}
				class="rounded-md px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
				aria-label="Close mixer"
			>
				Close ✕
			</button>
		</div>
		<Mixer />
	</div>
</div>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && mixerOpen) mixerOpen = false;
	}}
/>

<style>
	/* Following the sheet music (follow.js): the sounding note and the cursor */
	:global(.abcjs-playing) {
		fill: #d97706;
	}
	:global(.abcjs-cursor) {
		fill: #d97706;
		opacity: 0.6;
	}

	/*
	 * Player toolbar: three fixed areas instead of free wrapping.
	 *   wide:    [Play Stop] [Tempo Capo Key] [Mixer .mid]
	 *   medium:  [Play Stop]          [Mixer .mid]
	 *   (.mid is hidden on touch screens)
	 *            [Tempo Capo Key]
	 *   narrow:  each area on its own row
	 */
	.toolbar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-areas: 'transport settings actions';
		align-items: center;
		gap: 0.75rem 1.5rem;
		margin-bottom: 0.75rem;
	}

	.transport {
		grid-area: transport;
		display: flex;
		gap: 0.5rem;
	}

	.settings {
		grid-area: settings;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
	}

	.setting {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.actions {
		grid-area: actions;
		display: flex;
		gap: 0.5rem;
	}

	/* Loop row: same height whether or not a region is chosen */
	.loopbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		min-height: 2.75rem;
		margin-bottom: 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid transparent;
		padding: 0.25rem 0.5rem;
	}

	/* A partial loop is highlighted, so it's obvious only part of the song will play */
	.loopbar.looping {
		border-color: rgb(245 158 11);
		background: rgb(255 251 235);
	}

	/* Chord display, key, and where playback is */
	.statusbar {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem 1.25rem;
		margin-bottom: 0.75rem;
	}

	.key-info {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.875rem;
		color: rgb(75 85 99);
	}

	.position {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 27rem;
		height: 2rem;
		overflow: hidden;
		border-radius: 0.5rem;
		background: rgb(243 244 246);
		padding-inline: 0.75rem;
		font-family: ui-monospace, monospace;
		font-size: 0.875rem;
		white-space: nowrap;
	}

	.position.playing {
		background: rgb(254 243 199);
		color: rgb(120 53 15);
	}

	.cell {
		flex-shrink: 0;
	}

	.section-cell {
		width: 9ch;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chord-cell {
		width: 6ch;
	}

	.role-cell {
		width: 5ch;
	}

	@media (max-width: 900px) {
		.toolbar {
			grid-template-columns: auto auto;
			grid-template-areas:
				'transport actions'
				'settings settings';
			justify-content: space-between;
		}

		.statusbar {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.statusbar > :first-child {
			grid-column: 1 / -1;
			justify-self: start;
		}
	}

	@media (max-width: 560px) {
		.toolbar {
			grid-template-columns: 1fr;
			grid-template-areas: 'transport' 'actions' 'settings';
			justify-content: stretch;
		}

		.statusbar {
			grid-template-columns: minmax(0, 1fr);
		}

		.position {
			width: 100%;
		}
	}

	.mixer-handle {
		position: fixed;
		bottom: env(safe-area-inset-bottom, 0px);
		left: 50%;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transform: translateX(-50%);
		border-radius: 0.75rem 0.75rem 0 0;
		background: rgb(17 24 39);
		padding: 0.5rem 1.25rem;
		font-weight: 600;
		color: white;
		box-shadow: 0 -4px 12px rgb(0 0 0 / 0.2);
	}

	.mixer-handle:hover {
		background: rgb(55 65 81);
	}

	.mixer-drawer {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		z-index: 20;
		max-height: 80vh;
		overflow-y: auto;
		border-top: 1px solid rgb(55 65 81);
		background: rgb(17 24 39 / 0.97);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		box-shadow: 0 -8px 24px rgb(0 0 0 / 0.25);
		transform: translateY(100%);
		visibility: hidden;
		transition:
			transform 0.25s ease,
			visibility 0s linear 0.25s;
	}

	.mixer-drawer.open {
		transform: translateY(0);
		visibility: visible;
		transition: transform 0.25s ease;
	}
</style>