<script>
	/**
	 * The song's tempo: − and + either side of the number, which can be typed
	 * (hold − or + to keep going). A playing band restarts at the new tempo
	 * once it has rested. On the player bar and in the Tracks controls.
	 */
	import { useArranger } from '../../state/context.js';
	import { TEMPO_MAX, TEMPO_MIN } from '../../chart/tempo.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { repeatWhileHeld } from './repeatWhileHeld.js';
	import { restartWhenSettled } from './restartWhenSettled.svelte.js';

	const { arrangement, player } = useArranger();
	const { metronome } = player;

	restartWhenSettled(() => arrangement.bpm, player);

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
</script>

<span class="stepper">
	<button
		type="button"
		class="step"
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
		<span class="caption">BPM</span>
	</label>
	<button
		type="button"
		class="step"
		use:repeatWhileHeld={() => nudgeTempo(1)}
		use:tooltip={TIPS.player.faster}
	>
		<span aria-hidden="true">+</span><span class="sr-only">Faster</span>
	</button>
</span>

<style>
	.stepper {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
	}

	.step {
		display: grid;
		place-items: center;
		height: 2.75rem;
		width: 2.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
		color: var(--color-ink);
		background: transparent;
		border: none;
		border-radius: var(--corner-control);
		cursor: pointer;
		touch-action: manipulation; /* no double-tap zoom while tapping fast */
		user-select: none;
		-webkit-user-select: none;
	}

	@media (hover: hover) {
		.step:hover {
			color: var(--color-accent);
		}
	}

	.number {
		display: grid;
		justify-items: center;
	}

	.number input {
		width: 3.2ch;
		padding: 0;
		text-align: center;
		font-size: 1.6rem;
		font-weight: 800;
		line-height: 1.1;
		background: transparent;
		border: none;
		color: var(--color-ink);
		font-variant-numeric: tabular-nums;
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.number input::-webkit-inner-spin-button,
	.number input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.caption {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--color-ink-soft);
	}

	/* Phones upright: narrower − and + (still a finger tall) and number */
	@media (max-width: 639px) {
		.step {
			width: 1.6rem;
		}
		.number input {
			width: 3ch;
			font-size: 1.4rem;
		}
	}
</style>
