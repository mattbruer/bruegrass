<script>
	/**
	 * What tapping a chord opens, wherever the chord is shown (the scrolling
	 * strip, a Tracks chord lane): its edit box, and from there the chord
	 * tutor. The host only sets `place` to the chord tapped, or `spot` to a
	 * bar and beat with no chord written there.
	 */
	import ChordEditDialog from './ChordEditDialog.svelte';
	import ChordTutorDialog from '../chordTutor/ChordTutorDialog.svelte';
	import ChordSpotDialog from './ChordSpotDialog.svelte';

	/** @typedef {import('../../chart/chartAnalysis.js').ChordPlace} ChordPlace */

	/** @type {{ place: ChordPlace | null, spot?: import('../../chart/chordSpot.js').ChordSpot | null }} */
	let { place = $bindable(), spot = $bindable(null) } = $props();

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
<ChordSpotDialog bind:spot />
