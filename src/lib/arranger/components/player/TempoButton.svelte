<script>
	/**
	 * The metronome key on the bar, with the tempo in a badge in its corner.
	 * Tap the key to arm the click: lit, it plays along with the band when
	 * Play is pressed, its pendulum swinging on the beat (hovering swings it
	 * at the tempo). Tap the badge for the tempo panel.
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

<span class="tile" class:on={metronome.on}>
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
	<button type="button" class="badge" popovertarget={PANEL_ID} use:tooltip={TIPS.player.tempoBadge}>
		{arrangement.bpm}<span class="sr-only"> beats per minute: change the tempo</span>
	</button>
</span>
<TempoPanel id={PANEL_ID} />

<style>
	.tile {
		position: relative;
		display: inline-flex;
	}

	/* The tempo, small in the corner: tap it for the tempo panel */
	.badge {
		position: absolute;
		right: 0.3rem;
		bottom: 0.3rem;
		padding: 0.15rem 0.45rem;
		cursor: pointer;
		border-radius: 999px;
		background: var(--color-surface-deep);
		border: 1px solid var(--color-line);
		color: var(--color-ink);
		font-size: 0.7rem;
		font-weight: 800;
		line-height: 1.3;
		font-variant-numeric: tabular-nums;
		box-shadow: var(--shadow-drop-small);
	}

	/* It sinks with the key when the key is lit */
	.tile.on .badge {
		transform: translateY(calc(var(--key-depth, 0px) - 2px * var(--depth-on)));
	}

	@media (hover: hover) {
		.badge:hover {
			border-color: var(--color-accent);
		}
	}

	/* A phone on its side: the key is small, so the badge is too */
	@media (max-height: 600px) {
		.badge {
			right: 0;
			bottom: 0;
			padding: 0 0.25rem;
			font-size: 0.6rem;
		}
	}
</style>
