<script>
	/**
	 * What tapping a chord opens, wherever the chord is shown (the scrolling
	 * strip, a Tracks chord lane): its edit box, and from there the chord
	 * tutor. The host only sets `place` to the chord tapped.
	 */
	import ChordEditDialog from './ChordEditDialog.svelte';
	import ChordTutorDialog from '../chordTutor/ChordTutorDialog.svelte';

	/** @typedef {import('../../chart/chartAnalysis.js').ChordPlace} ChordPlace */

	/** @type {{ place: ChordPlace | null }} */
	let { place = $bindable() } = $props();

	/** @type {ChordPlace | null} */
	let tutorOn = $state(null);

	/** @param {ChordPlace} chord */
	function learnAbout(chord) {
		place = null;
		tutorOn = chord;
	}
</script>

<ChordEditDialog bind:place onLearn={learnAbout} />
<ChordTutorDialog bind:place={tutorOn} />
