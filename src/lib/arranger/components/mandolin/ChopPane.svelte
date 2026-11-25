<script>
	/**
	 * The mandolin's chop for one chord of the song, to see and change: its
	 * frets typed G to E (`5,3,2,x`), the chord diagram (tap it too), and
	 * the notes it sounds, as letters, as what each is in the chord (root,
	 * 3rd, ♭7th, 9th) and on a staff. ‹ › step through the song's chords.
	 * A change is saved with the song for this chord at this place; Band's
	 * chop puts the band's own back. The host says where it sits.
	 */
	import { useArranger } from '../../state/context.js';
	import { COURSES, MAX_FRET, OPEN_MIDI } from '../../instruments/mandolin.js';
	import { dotsFor, fretNotes } from '../../voicings/fretNotes.js';
	import { writtenNote } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import VoicingHeader from '../voicings/VoicingHeader.svelte';
	import ChordDiagram from '../voicings/ChordDiagram.svelte';
	import FretsField from '../voicings/FretsField.svelte';
	import FretNotesList from '../voicings/FretNotesList.svelte';
	import NotesOnStaff from '../melody/NotesOnStaff.svelte';

	/**
	 * @type {{ name: string, onPick: (start: number) => void, onClose?: () => void }}
	 *   name: the lane's name; onPick: a chord was stepped to (the host moves the playhead there)
	 */
	let { name, onPick, onClose } = $props();

	const { mandolin } = useArranger();

	/** @type {import('$lib/arranger/voicings/typedFrets.js').FrettedNeck} */
	const NECK = { strings: 4, maxFret: MAX_FRET, order: 'G to E', example: '5,3,2,x' };

	const chop = $derived(mandolin.picked);
	const frets = $derived(chop?.chop.frets ?? []);
	const notes = $derived(chop ? fretNotes(frets, OPEN_MIDI, chop.sounds) : []);
	const dots = $derived(dotsFor(notes, COURSES.length));
</script>

<section class="flex flex-col gap-3 ui-card p-3 sm:p-4" aria-label="The mandolin's chop">
	<VoicingHeader {name} chords={mandolin.chords} picked={chop} {onPick} {onClose} />

	{#if !chop}
		<p class="text-sm text-ink-soft">No chords to chop yet: write some in the chart.</p>
	{:else}
		<div class="flex flex-wrap items-start gap-x-6 gap-y-4">
			<ChordDiagram
				{frets}
				marks={dots.marks}
				inChord={dots.inChord}
				courses={COURSES}
				maxFret={MAX_FRET}
				instrument="Mandolin"
				onChange={(next) => mandolin.change(next)}
			/>

			<div class="flex min-w-56 flex-1 flex-col gap-3">
				<FretsField
					{frets}
					neck={NECK}
					tip={TIPS.chopEditor.frets}
					note={chop.edited
						? `Your chop for this ${chop.name}. The next chords lead on from it.`
						: 'The band’s chop. Change it here or on the diagram.'}
					onChange={(next) => mandolin.change(next)}
				/>
				<FretNotesList {notes} strings={COURSES} />
				<NotesOnStaff
					{notes}
					label="On the staff: {notes.map((note) => writtenNote(note)).join(', ')}"
				/>
				{#if chop.edited}
					<button
						type="button"
						class="self-start ui-button px-3 py-1.5 text-sm"
						onclick={() => mandolin.change(null)}
						use:tooltip={TIPS.chopEditor.bands}>Band’s chop</button
					>
				{/if}
			</div>
		</div>
	{/if}
</section>
