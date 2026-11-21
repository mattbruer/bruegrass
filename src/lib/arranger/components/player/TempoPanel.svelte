<script>
	/**
	 * The panel opened from the tempo tile's ⋯ key: the swing, and the click's
	 * sound and level. (The tempo itself is on the bar.) A native popover: a
	 * tap outside or Escape closes it, and it sits just above the bar.
	 */
	import { useArranger } from '../../state/context.js';
	import { SWING_MAX, SWING_STRAIGHT, validSwing } from '../../chart/swing.js';
	import { CLICK_SOUNDS } from '../../playback/metronome/sounds.js';
	import { LEVEL_MAX_DB, LEVEL_MIN_DB } from '../../state/MetronomeState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import Slider from '../mixer/Slider.svelte';
	import { restartWhenSettled } from './restartWhenSettled.svelte.js';

	/** @type {{ id: string }} */
	let { id } = $props();

	const { arrangement, player, layout } = useArranger();
	const { metronome } = player;
	const prefs = metronome.prefs;

	// Keep the audio in step with the level as it's dragged (no restart)
	$effect(() => {
		void prefs.level;
		metronome.applyLevel();
	});

	/** A playing band picks up the swing once it has rested a moment. */
	restartWhenSettled(() => arrangement.swing, player);

	/** @param {number} swing */
	const swingPosition = (swing) => (swing - SWING_STRAIGHT) / (SWING_MAX - SWING_STRAIGHT);
	/** @param {number} position */
	const swingFromPosition = (position) =>
		validSwing(SWING_STRAIGHT + position * (SWING_MAX - SWING_STRAIGHT));
	/** @param {number} swing */
	const formatSwing = (swing) => (swing === SWING_STRAIGHT ? 'Straight' : `${swing}%`);

	/** @param {number} db */
	const levelPosition = (db) => (db - LEVEL_MIN_DB) / (LEVEL_MAX_DB - LEVEL_MIN_DB);
	/** @param {number} position */
	const levelFromPosition = (position) => LEVEL_MIN_DB + position * (LEVEL_MAX_DB - LEVEL_MIN_DB);
	/** @param {number} db */
	const formatLevel = (db) => `${Math.round(db)} dB`;
</script>

<div {id} popover="auto" class="panel" style="bottom: {layout.barHeight + 8}px">
	<div class="body ui-card">
		<Slider
			label="Swing"
			name="Swing"
			bind:value={arrangement.swing}
			toPosition={swingPosition}
			fromPosition={swingFromPosition}
			format={formatSwing}
			reset={SWING_STRAIGHT}
			tip={TIPS.player.swing}
		/>

		<label class="row" use:tooltip={TIPS.player.metronomeSound}>
			<span>Click</span>
			<select
				class="ui-field px-3 py-2"
				value={prefs.sound}
				onchange={(event) => metronome.setSound(event.currentTarget.value)}
			>
				{#each CLICK_SOUNDS as sound (sound.id)}
					<option value={sound.id}>{sound.name}</option>
				{/each}
			</select>
		</label>

		<Slider
			label="Click level"
			name="Click level"
			bind:value={prefs.level}
			toPosition={levelPosition}
			fromPosition={levelFromPosition}
			format={formatLevel}
			reset={-14}
			tip={TIPS.player.metronomeLevel}
		/>
	</div>
</div>

<style>
	.panel {
		position: fixed;
		inset: auto 0 0 0;
		margin: 0 auto;
		width: min(22rem, calc(100% - 2rem));
		padding: 0;
		border: none;
		background: transparent;
		overflow: visible;
	}

	.body {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-weight: 600;
	}
</style>
