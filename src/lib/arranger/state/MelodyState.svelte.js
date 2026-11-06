/**
 * The optional melody: ABC notation, the tune abcjs drew from it, and what
 * the rest of the arranger needs from that tune.
 */
import { NOTHING_DRAWN } from '../melody/drawSheetMusic.js';
import { readMelody } from '../melody/readMelody.js';
import { hasChords } from '../melody/abcChords.js';
import { playedQuarters, sheetEvents } from '../melody/follow.js';
import { STARTER_SONG } from '../starterSong.js';

export class MelodyState {
	/** The tune in ABC notation, as typed. */
	notation = $state(STARTER_SONG.abc);

	/**
	 * What abcjs drew from the notation (set by the SheetMusic component,
	 * which owns the drawing).
	 * @type {import('../melody/drawSheetMusic.js').DrawnTune}
	 */
	drawn = $state.raw(NOTHING_DRAWN);

	/** How the sheet music is drawn: as it sounds, or in the key of the guitar's shapes (for reading with a capo). */
	sheetView = $state(/** @type {'concert' | 'shapes'} */ ('concert'));

	hasNotation = $derived(this.notation.trim() !== '');

	/** The melody's notes, timed from bar 1, or why it can't be played. */
	#read = $derived(readMelody(this.drawn.tune));
	line = $derived(this.#read.line);
	error = $derived(this.#read.error);

	title = $derived(this.drawn.tune?.metaText?.title ?? '');
	warnings = $derived(this.drawn.warnings);

	/** The tune has chord symbols (so the arrangement can be written from them). */
	hasChordSymbols = $derived(this.drawn.sequence ? hasChords(this.drawn.sequence) : false);

	/** Every drawn note on the melody's clock, for following the sheet music. */
	notesOnPage = $derived(
		this.drawn.timings && this.drawn.sequence && this.line
			? sheetEvents(this.drawn.timings, playedQuarters(this.drawn.sequence), this.line.pickup)
			: []
	);

	/** Forget the drawn tune (when the notation is cleared). */
	clearDrawing() {
		this.drawn = NOTHING_DRAWN;
	}
}
