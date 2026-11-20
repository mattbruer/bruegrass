<script>
	/**
	 * The tempo panel, opened from the tempo badge on the metronome key: big −
	 * and + for the tempo (hold to keep going), the swing, and the click's
	 * sound and level. A native popover: a tap outside or Escape closes it, and
	 * it sits just above the bar.
	 */
	import { useArranger } from '../../state/context.js';
	import { TEMPO_MAX, TEMPO_MIN } from '../../chart/tempo.js';
	import { SWING_MAX, SWING_STRAIGHT, validSwing } from '../../chart/swing.js';
	import { CLICK_SOUNDS } from '../../playback/metronome/sounds.js';
	import { LEVEL_MAX_DB, LEVEL_MIN_DB } from '../../state/MetronomeState.svelte.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import Slider from '../mixer/Slider.svelte';
	import { repeatWhileHeld } from './repeatWhileHeld.js';

	/** @type {{ id: string }} */
	let { id } = $props();

	const { arrangement, player, layout } = useArranger();
	const { metronome } = player;
	const prefs = metronome.prefs;

	/** @param {number} change beats per minute */
	function nudgeTempo(change) {
		arrangement.tempo = arrangement.bpm + change;
		settleTempo();
	}

	/** Tidy the tempo into range and let a running click follow it. */
	function settleTempo() {
		arrangement.tidyTempo();
		metronome.sync();
	}

	// Keep the audio in step with the level as it's dragged (no restart)
	$effect(() => {
		void prefs.level;
		metronome.applyLevel();
	});

	/** Let a playing band pick up the swing once the fader has rested a moment. */
	const SWING_SETTLE_MS = 400;
	let swingPlayed = arrangement.swing;
	$effect(() => {
		const swing = arrangement.swing;
		if (swing === swingPlayed) return;
		const timer = setTimeout(() => {
			swingPlayed = swing;
			player.restartIfPlaying();
		}, SWING_SETTLE_MS);
		return () => clearTimeout(timer);
	});

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
		<div class="tempo">
			<button
				type="button"
				class="step ui-button"
				use:repeatWhileHeld={() => nudgeTempo(-1)}
				use:tooltip={TIPS.player.slower}
			>
				<span aria-hidden="true">−</span><span class="sr-only">Slower</span>
			</button>
			<label class="number" use:tooltip={TIPS.player.tempoNumber}>
				<input
					type="number"
					inputmode="numeric"
					min={TEMPO_MIN}
					max={TEMPO_MAX}
					bind:value={arrangement.tempo}
					onchange={settleTempo}
					aria-label="Tempo"
				/>
				<span class="caption">beats per minute</span>
			</label>
			<button
				type="button"
				class="step ui-button"
				use:repeatWhileHeld={() => nudgeTempo(1)}
				use:tooltip={TIPS.player.faster}
			>
				<span aria-hidden="true">+</span><span class="sr-only">Faster</span>
			</button>
		</div>

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

	.tempo {
		display: grid;
		grid-template-columns: 4rem 1fr 4rem;
		align-items: center;
		gap: 0.75rem;
	}

	.step {
		height: 4rem;
		font-size: 2.25rem;
		line-height: 1;
		touch-action: manipulation; /* no double-tap zoom while tapping fast */
		user-select: none;
		-webkit-user-select: none;
	}

	.number {
		display: grid;
		justify-items: center;
		gap: 0.15rem;
	}

	.number input {
		width: 100%;
		text-align: center;
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1.1;
		background: transparent;
		border: none;
		color: var(--color-ink);
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.number input::-webkit-inner-spin-button,
	.number input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.caption {
		font-size: 0.8rem;
		color: var(--color-ink-soft);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-weight: 600;
	}
</style>
