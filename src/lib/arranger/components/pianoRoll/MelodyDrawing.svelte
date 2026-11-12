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
	 * the song, in quarters), and have an unedited bass start empty
	 * (`bassStartsEmpty`, to write by ear) instead of showing the band's own,
	 * and leave out the Key menu when it has its own (`keyMenu`).
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

	/**
	 * @type {{
	 *   voice?: string,
	 *   clock?: { playing: boolean, quarters: () => number },
	 *   bassStartsEmpty?: boolean,
	 *   keyMenu?: boolean
	 * }}
	 */
	let { voice, clock, bassStartsEmpty = false, keyMenu = true } = $props();

	const arranger = useArranger();
	const { arrangement, melody, bass, player } = arranger;
	const drawing = new MelodyDrawing(arranger);
	$effect.pre(() => {
		drawing.bassStartsEmpty = bassStartsEmpty;
	});

	$effect(() => {
		// Read again whenever the tune, the bass (or its style) or the chart it's drawn over changes
		void melody.notation;
		void bass.notation;
		void songBassStyle.id;
		void arrangement.sections;
		void arrangement.capoFret;
		void arranger.melodyKey;
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

	/** @param {number} midi */
	function sound(midi) {
		const heard = drawing.isBass
			? auditionBassNote(midi, arrangement.transpose)
			: auditionNote(midi, arrangement.transpose, drawing.current?.id);
		heard.catch(console.error);
	}
</script>

<div class="mb-4">
	{#if drawing.score}
		{#if !voice}
			<VoicePicker {drawing} />
		{/if}
		<HarmonyOptions {drawing} />
		<RollToolbar {drawing} {keyMenu} />
		<PianoRoll
			score={drawing.score}
			notes={drawing.notes}
			chordsUnder={drawing.chordsUnder}
			chordName={arrangement.chordName}
			spelling={arranger.melodyKey.spelling}
			tonic={arranger.melodyKey.tonic}
			range={drawing.range}
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
