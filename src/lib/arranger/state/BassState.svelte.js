/**
 * The song's bass line once it's been edited, as ABC (one voice, bass
 * clef, concert pitch, one bar per chart bar in play order). Empty while
 * the band writes it from the chart, which is what it does until the bass
 * is first changed in the piano roll. Parsed here, once per change.
 */
import { readBassScore, writtenBassNotes } from '../bass/readBass.js';
import { abcjsIfLoaded } from './abcjsLoaded.svelte.js';

export class BassState {
	notation = $state('');

	isWritten = $derived(this.notation.trim() !== '');

	/** The edited line read as a score, once per change (null: not edited, or abcjs still loading). */
	read = $derived(readBassScore(this.notation, abcjsIfLoaded()));

	/** The edited line's notes for the band to play (null: the band plays its own). */
	written = $derived(writtenBassNotes(this.read));

	/** Go back to the band's own bass line, written from the chart. */
	rewriteFromChart() {
		this.notation = '';
	}
}
