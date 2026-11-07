<script>
	/**
	 * The tempo panel, opened from the tempo tile on the bar: big − and + for
	 * the tempo (hold to keep going), the metronome's on/off, and, while it
	 * clicks, its sound, beats and level. A native popover: a tap outside or
	 * Escape closes it, and it sits just above the bar.
	 */
	import { useArranger } from '../../state/context.js';
	import { TEMPO_MAX, TEMPO_MIN } from '../../chart/tempo.js';
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

		<button
			type="button"
			class="click-toggle ui-button"
			class:ui-button-on={metronome.on}
			aria-pressed={metronome.on}
			onclick={() => metronome.toggle()}
			use:tooltip={TIPS.player.metronome}
		>
			{metronome.on ? 'Stop the click' : 'Start the click'}
		</button>

		{#if metronome.on}
			<label class="row" use:tooltip={TIPS.player.metronomeSound}>
				<span>Sound</span>
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

			<div class="row" use:tooltip={TIPS.player.metronomeMeter}>
				<span>Beats</span>
				<span class="flex items-center gap-2">
					<input
						type="number"
						inputmode="numeric"
						min="1"
						max="12"
						class="w-16 ui-field px-3 py-2"
						value={prefs.beats}
						aria-label="Beats per bar"
						onchange={(event) => metronome.setMeter(Number(event.currentTarget.value), prefs.unit)}
					/>
					<span>/</span>
					<select
						class="ui-field px-3 py-2"
						value={prefs.unit}
						aria-label="Beat note"
						onchange={(event) => metronome.setMeter(prefs.beats, Number(event.currentTarget.value))}
					>
						<option value={4}>4</option>
						<option value={8}>8</option>
					</select>
				</span>
			</div>

			<Slider
				label="Level"
				name="Level"
				bind:value={prefs.level}
				toPosition={levelPosition}
				fromPosition={levelFromPosition}
				format={formatLevel}
				reset={-14}
				tip={TIPS.player.metronomeLevel}
			/>
			<p class="hint">With the song playing, the click follows its bars.</p>
		{/if}
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

	.click-toggle {
		height: 3.5rem;
		font-size: 1.15rem;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-weight: 600;
	}

	.hint {
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}
</style>
