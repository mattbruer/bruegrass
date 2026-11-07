<script>
	/**
	 * Tempo and metronome in one tile on the bar: the metronome, with the
	 * tempo in a badge in the corner. While the click plays, the tile is lit
	 * and the pendulum swings on the beat; hovering it swings at the tempo.
	 * Tap it for the tempo panel.
	 */
	import { useArranger } from '../../state/context.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { onEveryFrame } from '../../playback/analysis/frameLoop.js';
	import { swingAngle } from '../../playback/metronome/swing.js';
	import MetronomeIcon, {
		PENDULUM_REST_DEGREES,
		tiltPendulum
	} from '../icons/MetronomeIcon.svelte';
	import TempoPanel from './TempoPanel.svelte';

	const { arrangement, player } = useArranger();
	const { metronome } = player;
	const PANEL_ID = 'tempo-panel';

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
	popovertarget={PANEL_ID}
	use:tooltip={TIPS.player.tempo}
>
	<MetronomeIcon tempo={arrangement.bpm} bind:pendulum />
	<span class="tile-label">Tempo and metronome</span>
	<span class="badge">{arrangement.bpm}<span class="sr-only"> beats per minute</span></span>
</button>
<TempoPanel id={PANEL_ID} />

<style>
	button {
		position: relative;
	}

	/* The tempo, small in the corner: information, not a label */
	.badge {
		position: absolute;
		right: 0.3rem;
		bottom: 0.3rem;
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
		background: var(--color-surface-deep);
		border: 1px solid var(--color-line);
		color: var(--color-ink);
		font-size: 0.7rem;
		font-weight: 800;
		line-height: 1.3;
		font-variant-numeric: tabular-nums;
	}

	/* A phone on its side: the tile is too small for a badge */
	@media (max-height: 600px) {
		.badge {
			display: none;
		}
	}
</style>
