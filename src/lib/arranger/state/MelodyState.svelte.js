/**
 * The optional melody: ABC notation, and everything read from it. The
 * notation is parsed once per change, here (`#read`); the band, the piano
 * roll, harmony and the chord conversions all take what they need from it.
 */
import { readTune } from '../melody/readTune.js';
import { readMelody } from '../melody/readMelody.js';
import { readVoices } from '../melody/roll/drawnMelody.js';
import { hasChords } from '../melody/abcChords.js';
import { STARTER_SONG } from '../starterSong.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';

export class MelodyState {
	/** The tune in ABC notation, as typed. */
	notation = $state(STARTER_SONG.abc);

	/** How the sheet music is drawn: as it sounds, or in the key of the guitar's shapes (for reading with a capo). */
	sheetView = $state(/** @type {'concert' | 'shapes'} */ ('concert'));

	hasNotation = $derived(this.notation.trim() !== '');

	#read = $derived(readTune(abcjsIfLoaded(), this.notation));
	/** The notation as abcjs parsed it (null: no music, or abcjs still loading). */
	tune = $derived(this.#read.tune);
	/** The tune as played, repeats played out (for its chord symbols and bars). */
	sequence = $derived(this.#read.sequence);
	warnings = $derived(this.#read.warnings);

	/** The melody's notes, timed from bar 1, or why it can't be played. */
	#melody = $derived(readMelody(this.tune));
	line = $derived(this.#melody.line);
	/** Quarters before bar 1, known even when the tune is only rests. */
	pickup = $derived(this.#melody.pickup);
	error = $derived(this.#melody.error);

	/** Every voice as a score of bars and notes, for the piano roll (null: nothing to draw). */
	voices = $derived(this.tune ? readVoices(this.notation, this.tune) : null);

	title = $derived(this.tune?.metaText?.title ?? '');

	/** The tune has chord symbols (so the arrangement can be written from them). */
	hasChordSymbols = $derived(this.sequence ? hasChords(this.sequence) : false);
}
