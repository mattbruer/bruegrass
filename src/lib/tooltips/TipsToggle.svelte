<script>
	/**
	 * The ? in the top bar: turns tooltips on and off in one tap (the same
	 * setting as Settings → General → Tips). Lit while tips are on. Only
	 * shown where there's hover: tips don't exist on touch-only devices.
	 */
	import { settings } from '$lib/settings/settings.svelte.js';
	import { tooltip } from './tooltip.js';
	import { TIPS } from './tips.js';
</script>

<button
	type="button"
	class="flex ui-hover-only h-9 w-9 items-center justify-center ui-button rounded-full font-bold"
	class:ui-button-on={settings.showTips}
	class:text-accent={settings.showTips}
	aria-label="Tips"
	aria-pressed={settings.showTips}
	onclick={() => (settings.showTips = !settings.showTips)}
	use:tooltip={TIPS.app.tipsToggle}
>
	?
</button>
