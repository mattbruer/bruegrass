<script>
	/**
	 * The metronome key on the bar. Tap it to arm the click: lit, it plays
	 * along with the band when Play is pressed, its pendulum swinging on the
	 * beat (hovering swings it at the tempo). The tempo is the tile beside it.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { onEveryFrame } from '../../../audio/analysis/frameLoop.js';
	import { swingAngle } from '../../playback/metronome/swing.js';
	import MetronomeIcon, {
		PENDULUM_REST_DEGREES,
		tiltPendulum
	} from '../icons/MetronomeIcon.svelte';

	const { arrangement, player } = useArranger();
	const { metronome } = player;

	/** @type {SVGGElement | undefined} */
	let pendulum = $state();

	// Swing the rod with the click (not for people who've asked for less motion)
	$effect(() => {
		const rod = pendulum;
		if (!metronome.on || !rod || prefersLessMotion()) return;

		const stop = onEveryFrame(() => {
			const beats = metronome.beatsNow();
			tiltPendulum(rod, beats === null ? PENDULUM_REST_DEGREES : swingAngle(beats));
		});
		return () => {
			stop();
			tiltPendulum(rod, PENDULUM_REST_DEGREES);
		};
	});

	function prefersLessMotion() {
		return matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
</script>

<button
	type="button"
	class="bar-tile ui-button"
	class:ui-button-on={metronome.on}
	style:--beat="{60 / arrangement.bpm}s"
	aria-pressed={metronome.on}
	onclick={() => metronome.toggle()}
	use:tooltip={TIPS.player.metronome}
>
	<MetronomeIcon tempo={arrangement.bpm} bind:pendulum />
	<span class="tile-label">Click with the band</span>
</button>
