<script>
	/**
	 * Draw the melody, its harmony parts and the bass line on a piano roll,
	 * over the chart's bars and chords. It reads and writes the tune's ABC,
	 * so the sheet music, the ABC tab and the roll always show the same tune;
	 * the bass is kept apart, in the song's bass field.
	 *
	 * On its own (the Melody tab) it picks its voice and follows the band.
	 * A page can instead say which voice to edit (`voice`: the transcription
	 * grid's picked lane) and what to follow (`clock`: a recording's place in
	 * the song, in quarters; with `seek`, a click on the roll's ruler plays
	 * from there), a `zoom`, and have an unedited bass start empty
	 * (`bassStartsEmpty`, to write by ear) instead of showing the band's own,
	 * and leave out the Key menu when it has its own (`keyMenu`).
	 *
	 * `view`: the notes on the piano roll, or the same part as TAB (fix
	 * where each note is played; the bass has no TAB yet).
	 */
	import { untrack } from 'svelte';
	import { useArranger } from '../../state/context.js';
	import { MelodyDrawing } from '../../melody/roll/MelodyDrawing.svelte.js';
	import { auditionBassNote, auditionNote } from '../../playback/auditionNote.js';
	import PianoRoll from './PianoRoll.svelte';
	import RollToolbar from './RollToolbar.svelte';
	import VoicePicker from './VoicePicker.svelte';
	import HarmonyOptions from './HarmonyOptions.svelte';
	import { voiceColour } from '../../melody/roll/MelodyDrawing.svelte.js';
	import BassLineNote from './BassLineNote.svelte';
	import { songBassStyle } from '../../bass/songBassStyle.svelte.js';
	import { abcjsIfLoaded } from '../../state/abcjsLoaded.svelte.js';
	import TabView from './TabView.svelte';
	import TabChoice from './TabChoice.svelte';
	import TuningChoice from './TuningChoice.svelte';
	import TabFretBar from './TabFretBar.svelte';
	import { changeNote } from '../../melody/roll/editNotes.js';
	import { chooseString, setTabInstrument, songTab } from '../../tab/songTab.svelte.js';
	import { fretboard } from '../../tab/fretboards.js';
	import { tunedBoard } from '../../tab/tunings.js';
	import { ownNote } from '../../melody/roll/pickupEcho.js';
	import { noteKey, pitchAt, stringToward, tabNotes } from '../../tab/fingering.js';

	/**
	 * @type {{
	 *   voice?: string,
	 *   clock?: { playing: boolean, quarters: () => number, seek?: (quarters: number) => void },
	 *   bassStartsEmpty?: boolean,
	 *   pickupQuarters?: number,
	 *   keyMenu?: boolean,
	 *   zoom?: { across: number, down: number },
	 *   lanes?: import('../../transcription/extraLanes.js').LaneStore,
	 *   view?: 'roll' | 'tab'
	 * }}
	 */
	let {
		voice,
		clock,
		bassStartsEmpty = false,
		pickupQuarters = 0,
		keyMenu = true,
		zoom,
		lanes,
		view = 'roll'
	} = $props();

	/** @param {number} ticks a click on the roll's ruler: play from there */
	function seek(ticks) {
		const quarters = drawing.timeAt(ticks);
		if (quarters !== null) clock?.seek?.(quarters);
	}

	const arranger = useArranger();
	const { arrangement, melody, bass, player } = arranger;
	const drawing = new MelodyDrawing(arranger);
	$effect.pre(() => {
		drawing.bassStartsEmpty = bassStartsEmpty;
		drawing.pickupQuarters = pickupQuarters;
		drawing.lanes = lanes ?? null;
	});

	$effect(() => {
		// Read again whenever the tune, the bass (or its style) or the chart it's drawn over changes
		void melody.voices;
		void bass.read;
		void abcjsIfLoaded();
		void songBassStyle.id;
		void arrangement.sections;
		void arrangement.capoFret;
		void arranger.melodyKey;
		void lanes?.extraLanes;
		void pickupQuarters;
		untrack(() => drawing.load());
	});

	// The page's voice, once the tune that has it is read
	$effect(() => {
		if (voice && drawing.voice !== voice && drawing.voices.some((each) => each.id === voice))
			drawing.editVoice(voice);
	});

	const playing = $derived(clock ? clock.playing : player.isPlaying);
	const timeNow = $derived(clock ? clock.quarters : player.melodyTimeNow);

	/**
	 * @param {import('../../melody/roll/editNotes.js').DrawnNote[]} notes
	 * @param {number} [length]
	 */
	function commit(notes, length) {
		if (length) drawing.drawLength = length;
		drawing.commit(notes);
	}

	/* TAB: the part being edited, for the instrument chosen for it (not the bass yet) */
	const DEFAULT_TAB_INSTRUMENT = 'guitar';
	const tabVoice = $derived(
		view === 'tab' && !drawing.isBass ? (drawing.current?.id ?? null) : null
	);
	const partTab = $derived(tabVoice ? (songTab.parts[tabVoice] ?? null) : null);
	const tabInstrument = $derived(partTab?.instrument ?? DEFAULT_TAB_INSTRUMENT);
	const standardBoard = $derived(tabVoice ? fretboard(tabInstrument) : null);
	const board = $derived(standardBoard ? tunedBoard(standardBoard, partTab?.tuning) : null);
	/** The strings you chose, for the notes as shown: an echoed pickup note takes its pickup note's. */
	const chosenStrings = $derived.by(() => {
		const strings = partTab?.strings ?? {};
		return Object.fromEntries(
			drawing.notes.flatMap((note) => {
				const string = strings[stringKey(note)];
				return string === undefined ? [] : [[noteKey(note), string]];
			})
		);
	});
	const tab = $derived(board ? tabNotes(drawing.notes, board, chosenStrings) : []);

	/**
	 * The key a note's string is saved under: its own, or for an echo its pickup note's.
	 * @param {import('../../melody/roll/pickupEcho.js').RollNote} note
	 */
	function stringKey(note) {
		return noteKey(ownNote(note, drawing.echo));
	}
	const unplayable = $derived(tab.filter((tabNote) => !tabNote.place).length);

	/** The picked note (the roll's selection) in the TAB, when it's on a string. */
	const pickedTab = $derived(
		tab.find((tabNote) => tabNote.note === drawing.notes[drawing.selected] && tabNote.place) ?? null
	);

	/** @param {import('../../tab/fingering.js').TabNote} tabNote */
	function selectTab(tabNote) {
		drawing.selected = drawing.notes.indexOf(tabNote.note);
		sound(tabNote.note.midi);
	}

	/**
	 * Change the note to the pitch this fret plays, on the string it's on.
	 * @param {import('../../tab/fingering.js').TabNote} tabNote
	 * @param {number} fret
	 */
	function setFret({ note, place }, fret) {
		if (!board || !place || !tabVoice || drawing.problem) return;
		const midi = pitchAt(board.strings[place.string], fret, board.frets);
		const index = drawing.notes.indexOf(note);
		if (midi === null || index < 0) return;
		const notes = changeNote(drawing.notes, index, { midi }, drawing.end);
		const changed = notes.find((each) => each.start === note.start && each.midi === midi);
		setTabInstrument(tabVoice, tabInstrument);
		chooseString(tabVoice, stringKey({ ...note, midi }), place.string, notes.map(stringKey));
		drawing.commit(notes);
		drawing.selected = changed ? notes.indexOf(changed) : -1;
		sound(midi);
	}

	/**
	 * @param {import('../../tab/fingering.js').TabNote} tabNote
	 * @param {-1 | 1} direction
	 */
	function moveString(tabNote, direction) {
		const string = stringToward(tabNote, direction);
		if (string === null || !tabVoice) return;
		setTabInstrument(tabVoice, tabInstrument);
		chooseString(tabVoice, stringKey(tabNote.note), string, drawing.notes.map(stringKey));
	}

	/** @param {import('../../tab/fingering.js').TabNote} tabNote */
	function deleteTab({ note }) {
		if (drawing.problem) return;
		drawing.selected = -1;
		drawing.commit(drawing.notes.filter((each) => each !== note));
	}

	/** @param {number} midi */
	function sound(midi) {
		const heard = drawing.isBass
			? auditionBassNote(midi, arrangement.transpose)
			: auditionNote(midi, arrangement.transpose, drawing.isLane ? undefined : drawing.current?.id);
		heard.catch(console.error);
	}
</script>

<div class="mb-4">
	{#if drawing.score}
		{#if !voice}
			<VoicePicker {drawing} />
		{/if}
		<HarmonyOptions {drawing} />
		{#if view === 'tab'}
			{#if drawing.isBass}
				<p class="text-sm text-ink-soft">There's no TAB for the bass yet.</p>
			{:else if tabVoice && board}
				<div class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
					<TabChoice voice={tabVoice} instrument={tabInstrument} />
					<TuningChoice voice={tabVoice} instrument={tabInstrument} steps={partTab?.tuning} />
				</div>
				<TabView
					tabNotes={tab}
					{board}
					score={drawing.score}
					chordsUnder={drawing.chordsUnder}
					chordName={arrangement.chordName}
					end={drawing.end}
					gridStep={drawing.gridStep}
					{zoom}
					selected={drawing.notes[drawing.selected] ?? null}
					{playing}
					playhead={() => drawing.tickAt(timeNow())}
					onSeek={clock?.seek ? seek : undefined}
					onSelect={selectTab}
					onFret={setFret}
					onString={moveString}
					onDelete={deleteTab}
				/>
				{#if pickedTab?.place}
					<TabFretBar tabNote={pickedTab} {board} onFret={setFret} onString={moveString} />
				{/if}
				{#if unplayable > 0}
					<p class="mt-2 text-sm text-ink-soft">
						{unplayable}
						{unplayable === 1 ? 'note is' : 'notes are'} out of the {board.name.toLowerCase()}'s
						range, so not in the TAB.
					</p>
				{/if}
				{#if drawing.notes.length === 0}
					<p class="mt-2 text-sm text-ink-soft">Nothing written yet. Draw it in the piano roll.</p>
				{:else if !drawing.problem}
					<p class="mt-2 text-sm text-ink-soft">
						Tap a number to pick its note, then change its fret, or move it to another string. Draw
						new notes in the piano roll.
					</p>
				{/if}
			{/if}
			{#if drawing.problem}
				<p class="mt-2 text-sm text-ink-soft">{drawing.problem}</p>
			{/if}
		{:else}
			<RollToolbar {drawing} {keyMenu} />
			<PianoRoll
				score={drawing.score}
				notes={drawing.notes}
				chordsUnder={drawing.chordsUnder}
				chordName={arrangement.chordName}
				spelling={arranger.melodyKey.spelling}
				tonic={arranger.melodyKey.tonic}
				usualRange={drawing.usualRange}
				end={drawing.end}
				gridStep={drawing.gridStep}
				drawLength={drawing.drawLength}
				readOnly={drawing.problem !== ''}
				bind:selected={drawing.selected}
				colour={voiceColour(drawing.current?.id ?? '')}
				others={drawing.others}
				options={drawing.options}
				{playing}
				playhead={() => drawing.tickAt(timeNow())}
				onCommit={commit}
				onSound={sound}
				onSeek={clock?.seek ? seek : undefined}
				{zoom}
			/>
			{#if drawing.problem}
				<p class="mt-2 text-sm text-ink-soft">{drawing.problem}</p>
			{:else}
				<p class="mt-2 ui-hover-only text-sm text-ink-soft">
					Drag to draw a note. Drag a note to move it, or its right end to change its length.
					Double-click to delete.
				</p>
				<p class="touch-hint mt-2 hidden text-sm text-ink-soft">
					Tap to add a note, swipe to scroll. Drag a note to move it, or its right end to change its
					length. Double-tap to delete.
				</p>
				{#if drawing.isBass}
					<BassLineNote />
				{:else if drawing.isHarmonyPart}
					<p class="mt-2 text-sm text-ink-soft">
						There's more than one good harmony. Pick a note, and dots show the chord's other notes
						near it: tap one to move the note there. When you change the melody, only the bars you
						changed get new harmony.
					</p>
				{/if}
			{/if}
		{/if}
	{:else}
		<p class="text-sm text-ink-soft">
			Write some chords in the chart first, and the bars to draw a melody on appear here.
		</p>
	{/if}
</div>

<style>
	@media (hover: none) {
		.touch-hint {
			display: block;
		}
	}
</style>
