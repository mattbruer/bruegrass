<script>
	/**
	 * Download the arrangement (and melody) as a MIDI file. A MIDI file is for
	 * a computer DAW like Logic, so the button is hidden on touch screens.
	 */
	import { useArranger } from '../../state/context.js';
	import { downloadArrangementMidi } from '../../export/downloadMidi.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const { arrangement, melody, player } = useArranger();

	function download() {
		if (arrangement.error) {
			player.showProblem(arrangement.error);
			return;
		}
		try {
			downloadArrangementMidi({
				sections: arrangement.sections,
				capo: arrangement.capoFret,
				transpose: arrangement.transpose,
				bpm: arrangement.bpm,
				melody: melody.line
			});
		} catch (problem) {
			player.showProblem(problem);
		}
	}
</script>

<button
	type="button"
	class="ui-button px-4 py-2 pointer-coarse:hidden"
	onclick={download}
	use:tooltip={TIPS.player.midi}
>
	Download .mid
</button>
