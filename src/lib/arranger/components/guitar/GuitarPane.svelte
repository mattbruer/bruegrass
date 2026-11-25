<script>
	/**
	 * How the guitar plays one chord of the song, to see and change, in two
	 * parts: the shape the left hand holds (typed low E to high e, or tapped
	 * on the diagram), and what the right hand does on each beat (the boom's
	 * one low note, the chuck's strummed strings, or a note of your own
	 * instead, for a run between chords: never the band's own idea). Or
	 * the chord can be a fill: the guitar rests, and a part you write plays. Pick a beat and the
	 * diagram lights the strings it plays. The notes are named against the
	 * chord, listed and drawn on a staff. ‹ › step through the song's chords.
	 * A change is saved with the song for this chord at this place; Band's
	 * guitar forgets it. The host says where it sits.
	 */
	import { useArranger } from '../../state/context.js';
	import { MAX_FRET, OPEN_MIDI } from '../../instruments/guitar.js';
	import { GUITAR_NECK } from '../../voicings/typedFrets.js';
	import { dotsFor, fretNotes } from '../../voicings/fretNotes.js';
	import { writtenNote } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import VoicingHeader from '../voicings/VoicingHeader.svelte';
	import ChordDiagram from '../voicings/ChordDiagram.svelte';
	import FretsField from '../voicings/FretsField.svelte';
	import FretNotesList from '../voicings/FretNotesList.svelte';
	import NotesOnStaff from '../melody/NotesOnStaff.svelte';
	import BeatPattern from './BeatPattern.svelte';
	import BeatStrings from './BeatStrings.svelte';
	import NotePicker from './NotePicker.svelte';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import FillChoice from './FillChoice.svelte';
	import AccentButton from './AccentButton.svelte';
	import { FILL_PART_NAME } from '../../state/GuitarState.svelte.js';

	/**
	 * @type {{
	 *   name: string,
	 *   onPick: (start: number) => void,
	 *   onOpenPart?: (id: string) => void,
	 *   onClose?: () => void
	 * }}
	 *   name: the lane's name; onPick: a chord was stepped to (the host moves the playhead there);
	 *   onOpenPart: open a part's editor (a fill's)
	 */
	let { name, onPick, onOpenPart, onClose } = $props();

	const { guitar, parts } = useArranger();

	/** Leave the chord to a fill, and open the part to write it in. */
	async function writeFill() {
		const part = await guitar.writeFill();
		if (part) onOpenPart?.(part);
	}

	/** The strings' names, low E first. */
	const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

	const chord = $derived(guitar.picked);
	const shape = $derived(chord?.shape ?? []);
	const notes = $derived(chord ? fretNotes(shape, OPEN_MIDI, chord.name) : []);
	const dots = $derived(dotsFor(notes, STRING_NAMES.length));

	/** Which of the chord's beats is picked (its first, a boom, to begin with). */
	let selected = $state(0);
	const beat = $derived(chord?.beats[Math.min(selected, chord.beats.length - 1)] ?? null);

	/** Each beat's card: what it plays. */
	const cards = $derived(
		chord
			? chord.beats.map((each) => ({
					kind: each.note ? 'note' : each.role,
					beatInBar: each.beatInBar,
					accent: each.accent,
					notes: playedOn(each),
					yours:
						each.note !== null || (each.role === 'boom' ? chord.yours.booms : chord.yours.chucks)
				}))
			: []
	);
	/** The strings the picked beat plays, lit on the diagram. */
	const lit = $derived(beat ? stringsOf(beat) : null);

	/** @param {import('../../instruments/guitarPlan.js').ChordBeat} each */
	function stringsOf(each) {
		if (!chord) return [];
		if (each.note) return [each.note.string];
		return each.role === 'boom' ? [chord.booms[each.place].string] : chord.chucks[each.place];
	}

	/**
	 * What a beat plays, named against the chord. A boom may be off the
	 * shape (a slash chord's bass), so it's named from its own fret.
	 * @param {import('../../instruments/guitarPlan.js').ChordBeat} each
	 */
	function playedOn(each) {
		if (!chord) return [];
		if (each.note) return single(each.note);
		if (each.role === 'chuck') {
			return notes.filter((note) => chord.chucks[each.place].includes(note.string));
		}
		return single(chord.booms[each.place]);
	}

	/** @param {{ string: number, fret: number }} picked one note, named against the chord */
	function single(picked) {
		if (!chord) return [];
		const frets = STRING_NAMES.map((_, string) => (string === picked.string ? picked.fret : null));
		return fretNotes(frets, OPEN_MIDI, chord.name);
	}

	/** @param {import('../../instruments/guitarPlan.js').ChordBeat} each a beat with a note: its letter, for the diagram */
	function noteMark(each) {
		const [named] = playedOn(each);
		return named ? writtenNote(named) : '';
	}

	/** What the picked beat plays: the band's boom or chuck, or a note of yours. */
	const kinds = $derived(
		beat
			? [
					{ id: beat.role, name: beat.role === 'boom' ? 'Boom' : 'Chuck' },
					{ id: 'note', name: 'Note' }
				]
			: []
	);

	/** @param {import('../../instruments/guitarEdits.js').PickedNote | null} note the picked beat's own note (null: the band's) */
	function setNote(note) {
		if (!chord || !beat) return;
		const notes = chord.beats.map((each) => each.note);
		notes[chord.beats.indexOf(beat)] = note;
		guitar.change({ notes });
	}

	/** @param {boolean} on the picked beat accented (played louder) or not */
	function setAccent(on) {
		if (!chord || !beat) return;
		const accents = chord.beats.map((each) => each.accent);
		accents[chord.beats.indexOf(beat)] = on;
		guitar.change({ accents });
	}

	/** @param {string} kind turn the picked beat into a note (starting on the chord's boom) or back */
	function setKind(kind) {
		if (!chord || !beat) return;
		setNote(kind === 'note' ? (beat.note ?? { ...chord.booms[0] }) : null);
	}

	/** @param {number[]} strings what the picked beat now plays */
	function changeBeat(strings) {
		if (!chord || !beat) return;
		if (beat.role === 'boom') {
			const booms = chord.booms.map((boom) => boom.string);
			booms[beat.place] = strings[0];
			guitar.change({ booms });
		} else {
			const chucks = chord.chucks.map((each) => [...each]);
			chucks[beat.place] = strings;
			guitar.change({ chucks });
		}
	}
</script>

<section class="flex flex-col gap-3 ui-card p-3 sm:p-4" aria-label="The guitar's chord">
	<VoicingHeader {name} chords={guitar.chords} picked={chord} {onPick} {onClose} />

	{#if !chord}
		<p class="text-sm text-ink-soft">No chords to play yet: write some in the chart.</p>
	{:else}
		<div class="flex flex-wrap items-start gap-x-6 gap-y-4">
			<ChordDiagram
				frets={shape}
				marks={dots.marks}
				inChord={dots.inChord}
				courses={STRING_NAMES}
				maxFret={MAX_FRET}
				instrument="Guitar"
				{lit}
				picked={beat?.note ? { ...beat.note, mark: noteMark(beat) } : null}
				onChange={(next) => guitar.change({ shape: next })}
			/>

			<div class="flex min-w-64 flex-1 flex-col gap-4">
				<div class="flex flex-col gap-2">
					<h3 class="heading">The right hand, beat by beat</h3>
					{#if chord.fill}
						<FillChoice
							fill={chord.fill}
							partName={guitar.fillPart ? parts.name(guitar.fillPart) : FILL_PART_NAME}
							canWrite={guitar.fillPart !== null || parts.canAdd}
							onWrite={writeFill}
							onOpen={() => chord?.fill && onOpenPart?.(chord.fill)}
							onEnd={() => guitar.endFill()}
						/>
					{:else}
						<BeatPattern
							{cards}
							selected={Math.min(selected, cards.length - 1)}
							onSelect={(i) => (selected = i)}
						/>
						{#if beat}
							<div class="flex flex-wrap items-center gap-2">
								<TabSwitch
									bind:value={() => (beat.note ? 'note' : beat.role), setKind}
									tabs={kinds}
									tips={TIPS.guitarEditor.kinds}
									label="What this beat plays"
								/>
								<AccentButton on={beat.accent} onChange={setAccent} />
							</div>
						{/if}
						{#if beat?.note}
							<NotePicker
								note={beat.note}
								strings={STRING_NAMES}
								open={OPEN_MIDI}
								maxFret={MAX_FRET}
								chordName={chord.name}
								onChange={setNote}
							/>
						{:else if beat}
							<BeatStrings
								role={beat.role}
								chosen={stringsOf(beat)}
								{notes}
								strings={STRING_NAMES}
								onChange={changeBeat}
							/>
						{/if}
						<FillChoice
							fill={chord.fill}
							partName={guitar.fillPart ? parts.name(guitar.fillPart) : FILL_PART_NAME}
							canWrite={guitar.fillPart !== null || parts.canAdd}
							onWrite={writeFill}
							onOpen={() => chord?.fill && onOpenPart?.(chord.fill)}
							onEnd={() => guitar.endFill()}
						/>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<h3 class="heading">The left hand: the shape</h3>
					<FretsField
						frets={shape}
						neck={GUITAR_NECK}
						tip={TIPS.guitarEditor.frets}
						note={chord.yours.shape
							? `Your shape for this ${chord.name}.`
							: 'The band’s shape. Change it here or on the diagram.'}
						onChange={(next) => guitar.change({ shape: next })}
					/>
					<FretNotesList {notes} strings={STRING_NAMES} />
					<NotesOnStaff
						{notes}
						clef="treble-8"
						label="On the staff: {notes.map((note) => writtenNote(note)).join(', ')}"
					/>
				</div>

				{#if chord.edited}
					<button
						type="button"
						class="self-start ui-button px-3 py-1.5 text-sm"
						onclick={() => guitar.reset()}
						use:tooltip={TIPS.guitarEditor.bands}>Band’s guitar</button
					>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.heading {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}
</style>
