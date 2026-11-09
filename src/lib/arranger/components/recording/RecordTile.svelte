<script>
	/**
	 * Record, on the bar: opens the record panel. Lit, and its light blinks,
	 * while recording. (Play/Stop also stops a recording, keeping the take.)
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import RecordIcon from '../icons/RecordIcon.svelte';
	import RecordPanel from './RecordPanel.svelte';

	const { recording } = useArranger();
	const PANEL_ID = 'record-panel';
</script>

<button
	type="button"
	class="bar-tile ui-button"
	class:ui-button-on={recording.isRecording}
	popovertarget={PANEL_ID}
	use:tooltip={TIPS.recording.tile}
>
	<RecordIcon recording={recording.isRecording} />
	<span class="tile-label">Record</span>
</button>
<RecordPanel id={PANEL_ID} />
