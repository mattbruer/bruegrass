/**
 * Everything the arranger page knows, in one object, built from small
 * pieces. The page creates one and shares it with its components through
 * context (see context.js), so any component can reach what it needs
 * without passing props down through layers.
 *
 *   arranger.arrangement   the chord chart, tempo, capo, key
 *   arranger.loop          which bars play
 *   arranger.melody        the ABC melody
 *   arranger.player        play/stop, and problems to show
 *   arranger.layout        mixer drawer and phone keypad (what covers the screen)
 *   arranger.song          which song is open; New, Open, Save
 *   arranger.chordReport   what the last chord conversion wants you to know
 */
import { ArrangementState } from './ArrangementState.svelte.js';
import { LoopState } from './LoopState.svelte.js';
import { MelodyState } from './MelodyState.svelte.js';
import { PlayerState } from './PlayerState.svelte.js';
import { PageLayoutState } from './PageLayoutState.svelte.js';
import { SongState } from './SongState.svelte.js';
import { abcWithChords, arrangementFromAbc } from '../melody/abcChords.js';

export class Arranger {
	arrangement = new ArrangementState();
	loop = new LoopState(this.arrangement);
	melody = new MelodyState();
	player = new PlayerState(this.arrangement, this.loop, this.melody);
	layout = new PageLayoutState();
	/** Which song is open, and saving it (created last: it reads all of the above). */
	song = new SongState(this);

	/** @type {{ title: string, notes: string[] } | null} */
	chordReport = $state(null);

	/** A name for the work: the tune's title, else the first section's name. */
	title = $derived(this.melody.title || this.arrangement.sections[0]?.name || '');

	/**
	 * Replace the arrangement with one written from the melody's chord
	 * symbols (sections from its repeats, a capo that suits the guitar).
	 * Asks first if there's an arrangement to lose.
	 */
	writeArrangementFromMelodyChords() {
		const sequence = this.melody.drawn.sequence;
		const written = sequence ? arrangementFromAbc(sequence) : null;
		if (!written) return;

		const hasArrangement = this.arrangement.text.trim() !== '';
		if (hasArrangement && !confirm('Replace the arrangement with the chords from the melody?'))
			return;

		this.player.stop();
		this.arrangement.text = `\n${written.text}\n`;
		this.arrangement.capo = written.capo;
		this.arrangement.transpose = 0;
		this.loop.loopEverything();

		const withCapo = written.capo ? `, with capo ${written.capo}` : '';
		this.chordReport = {
			title: `Arrangement written from the melody's chords${withCapo}.`,
			notes: written.notes
		};
	}

	/** Write the arrangement's chords (at concert pitch) into a melody that has none. */
	writeChordsIntoMelody() {
		const sequence = this.melody.drawn.sequence;
		if (!sequence || !this.arrangement.isPlayable) return;

		const result = abcWithChords(this.melody.notation, sequence, this.arrangement.sections, {
			capo: this.arrangement.capoFret
		});
		this.melody.notation = result.abc;
		this.chordReport = {
			title: "The arrangement's chords are written into the melody.",
			notes: result.notes
		};
	}
}
