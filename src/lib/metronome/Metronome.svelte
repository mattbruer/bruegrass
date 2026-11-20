<script>
	/**
	 * The Metronome page: just a click. A really big metronome you tap to
	 * start and stop (or Space), its pendulum swinging on the beat; big − and +
	 * for the tempo; the sound and level under it. A straight click: no bars.
	 */
	import { onMount } from 'svelte';
	import { onEveryFrame } from '$lib/audio/analysis/frameLoop.js';
	import { swingAngle } from '$lib/arranger/playback/metronome/swing.js';
	import { CLICK_SOUNDS } from '$lib/arranger/playback/metronome/sounds.js';
	import { LEVEL_MAX_DB, LEVEL_MIN_DB } from '$lib/arranger/playback/metronome/clickClock.js';
	import { TEMPO_MAX, TEMPO_MIN } from '$lib/arranger/chart/tempo.js';
	import { repeatWhileHeld } from '$lib/arranger/components/player/repeatWhileHeld.js';
	import Slider from '$lib/arranger/components/mixer/Slider.svelte';
	import MetronomeIcon, {
		PENDULUM_REST_DEGREES,
		tiltPendulum
	} from '$lib/arranger/components/icons/MetronomeIcon.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { SoloClick } from './SoloClick.svelte.js';

	const click = new SoloClick();
	const prefs = click.prefs;

	/** @type {SVGGElement | undefined} */
	let pendulum = $state();

	// Swing the rod with the click (not for people who've asked for less motion)
	$effect(() => {
		const rod = pendulum;
		if (!click.on || !rod || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const stop = onEveryFrame(() => {
			const beats = click.beatsNow();
			tiltPendulum(rod, beats === null ? PENDULUM_REST_DEGREES : swingAngle(beats));
		});
		return () => {
			stop();
			tiltPendulum(rod, PENDULUM_REST_DEGREES);
		};
	});

	$effect(() => {
		void prefs.level;
		click.applyLevel();
	});

	/** @param {KeyboardEvent} event */
	function onKey(event) {
		const typing = event.target instanceof HTMLElement && event.target.closest('input, select');
		if (event.code !== 'Space' || typing) return;
		event.preventDefault();
		click.toggle();
	}

	onMount(() => {
		addEventListener('keydown', onKey);
		return () => {
			removeEventListener('keydown', onKey);
			click.stop();
		};
	});

	/** @param {number} db */
	const levelPosition = (db) => (db - LEVEL_MIN_DB) / (LEVEL_MAX_DB - LEVEL_MIN_DB);
	/** @param {number} position */
	const levelFromPosition = (position) => LEVEL_MIN_DB + position * (LEVEL_MAX_DB - LEVEL_MIN_DB);
	/** @param {number} db */
	const formatLevel = (db) => `${Math.round(db)} dB`;
</script>

<div class="page">
	<button
		type="button"
		class="big ui-button"
		class:ui-button-on={click.on}
		aria-pressed={click.on}
		onclick={() => click.toggle()}
		use:tooltip={TIPS.metronome.startStop}
	>
		<MetronomeIcon tempo={prefs.tempo} bind:pendulum />
		<span class="sr-only">{click.on ? 'Stop the click' : 'Start the click'}</span>
	</button>

	<div class="tempo">
		<button
			type="button"
			class="step ui-button"
			use:repeatWhileHeld={() => click.setTempo(prefs.tempo - 1)}
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
				value={prefs.tempo}
				onchange={(event) => click.setTempo(Number(event.currentTarget.value))}
				aria-label="Tempo"
			/>
			<span class="caption">beats per minute</span>
		</label>
		<button
			type="button"
			class="step ui-button"
			use:repeatWhileHeld={() => click.setTempo(prefs.tempo + 1)}
			use:tooltip={TIPS.player.faster}
		>
			<span aria-hidden="true">+</span><span class="sr-only">Faster</span>
		</button>
	</div>

	<div class="settings ui-card">
		<label class="row" use:tooltip={TIPS.player.metronomeSound}>
			<span>Sound</span>
			<select
				class="ui-field px-3 py-2"
				value={prefs.sound}
				onchange={(event) => click.setSound(event.currentTarget.value)}
			>
				{#each CLICK_SOUNDS as sound (sound.id)}
					<option value={sound.id}>{sound.name}</option>
				{/each}
			</select>
		</label>

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
	</div>
</div>

<style>
	.page {
		display: grid;
		justify-items: center;
		gap: 1.5rem;
		padding-block: 1.5rem 3rem;
	}

	/* The metronome itself is the button: as big as the screen allows */
	.big {
		padding: 1.5rem 2.5rem;
		touch-action: manipulation;
	}

	.big :global(svg) {
		display: block;
		height: min(55vh, 28rem);
		width: auto;
		max-width: 70vw;
	}

	.tempo {
		display: grid;
		grid-template-columns: 4.5rem 1fr 4.5rem;
		align-items: center;
		gap: 1rem;
		width: min(24rem, 100%);
	}

	.step {
		height: 4.5rem;
		font-size: 2.5rem;
		line-height: 1;
		touch-action: manipulation;
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
		font-size: 3.25rem;
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
		font-size: 0.85rem;
		color: var(--color-ink-soft);
	}

	.settings {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		width: min(24rem, 100%);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-weight: 600;
	}
</style>
