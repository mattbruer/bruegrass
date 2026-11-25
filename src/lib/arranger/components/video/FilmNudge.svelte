<script>
	/**
	 * Earlier / Later for an A/V take's picture, by eye: the sound lines it
	 * up exactly, but a camera can be late on its own (an iPhone over
	 * Continuity Camera). Moves the picture only; the sound stays.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ take: import('$lib/storage/songTakes.js').TakeDocument }} */
	let { take } = $props();

	const { recording } = useArranger();

	/** One tap: about a frame at 60 fps (ms). */
	const STEP_MS = 17;

	const nudgeMs = $derived(take.video?.nudgeMs ?? 0);
</script>

<div class="row">
	<button
		type="button"
		class="ui-button px-3 py-1"
		onclick={() => recording.nudgeFilm(take, -STEP_MS)}
		use:tooltip={TIPS.video.earlier}
	>
		Picture earlier
	</button>
	<span class="details">
		{nudgeMs === 0
			? 'Picture lined up'
			: `Picture ${Math.abs(nudgeMs)} ms ${nudgeMs < 0 ? 'earlier' : 'later'}`}
	</span>
	<button
		type="button"
		class="ui-button px-3 py-1"
		onclick={() => recording.nudgeFilm(take, STEP_MS)}
		use:tooltip={TIPS.video.later}
	>
		Later
	</button>
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.details {
		flex: 1;
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
</style>
