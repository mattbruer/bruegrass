<script>
	/**
	 * Count along (a click on every beat, higher on ONE) as the metronome: lit
	 * while it's on, and while the recording plays its rod swings on the
	 * clicks themselves, reaching an end on every beat.
	 */
	import { onEveryFrame } from '../../../audio/analysis/frameLoop.js';
	import { swingAngle } from '../../playback/metronome/swing.js';
	import MetronomeIcon, {
		PENDULUM_REST_DEGREES,
		tiltPendulum
	} from '../icons/MetronomeIcon.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ transcription: import('../../transcription/TranscriptionState.svelte.js').TranscriptionState, class?: string }} */
	let { transcription, class: className = '' } = $props();

	/** @type {SVGGElement | undefined} */
	let pendulum = $state();

	const swinging = $derived(transcription.clicksOn && transcription.player.playing);

	$effect(() => {
		const rod = pendulum;
		if (!swinging || !rod || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const stop = onEveryFrame(() => tiltPendulum(rod, swingAngle(transcription.quartersNow)));
		return () => {
			stop();
			tiltPendulum(rod, PENDULUM_REST_DEGREES);
		};
	});
</script>

<button
	type="button"
	class="count-along ui-button {className}"
	class:ui-button-on={transcription.clicksOn}
	aria-pressed={transcription.clicksOn}
	aria-label="Count along"
	onclick={() => (transcription.clicksOn = !transcription.clicksOn)}
	use:tooltip={TIPS.transcription.countAlong}
>
	<MetronomeIcon tempo={transcription.tempo} bind:pendulum />
</button>

<style>
	.count-along {
		display: grid;
		place-items: center;
		padding: 0.15rem 0;
	}
	.count-along :global(svg) {
		height: 100%;
	}
</style>
