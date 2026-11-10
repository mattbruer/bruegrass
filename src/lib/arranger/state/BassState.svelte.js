/**
 * The song's bass line once it's been edited, as ABC (one voice, bass
 * clef, concert pitch, one bar per chart bar in play order). Empty while
 * the band writes it from the chart, which is what it does until the bass
 * is first changed in the piano roll.
 */
export class BassState {
	notation = $state('');

	isWritten = $derived(this.notation.trim() !== '');

	/** Go back to the band's own bass line, written from the chart. */
	rewriteFromChart() {
		this.notation = '';
	}
}
