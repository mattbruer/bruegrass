<script>
	/**
	 * Draw the melody, its harmony parts and the bass line on a piano roll,
	 * over the chart's bars and chords. It reads and writes the tune's ABC,
	 * so the sheet music, the ABC tab and the roll always show the same tune;
	 * the bass is kept apart, in the song's bass field.
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

	const arranger = useArranger();
	const { arrangement, melody, bass, player } = arranger;
	const drawing = new MelodyDrawing(arranger);

	$effect(() => {
		// Read again whenever the tune or the chart it's drawn over changes
		void melody.notation;
		void bass.notation;
		void arrangement.sections;
		void arrangement.capoFret;
		void arranger.melodyKey;
		untrack(() => drawing.load());
	});

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
		<VoicePicker {drawing} />
		<HarmonyOptions {drawing} />
		<RollToolbar {drawing} />
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
			playing={player.isPlaying}
			playhead={() => drawing.tickAt(player.melodyTimeNow())}
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
