<script>
	/**
	 * Accent a beat: played a little louder (the score's > mark). A toggle.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ on: boolean, onChange: (on: boolean) => void }} */
	let { on, onChange } = $props();
</script>

<button
	type="button"
	class="ui-button px-3 py-1 text-sm font-semibold"
	class:ui-button-on={on}
	aria-pressed={on}
	onclick={() => onChange(!on)}
	use:tooltip={TIPS.guitarEditor.accent}
>
	<span aria-hidden="true">&gt;</span> Accent
</button>
