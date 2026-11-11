<script>
	/**
	 * The transcribe page's player: play/pause, a position bar and a speed
	 * slider for one song. Space plays and pauses on a computer.
	 */
	import { onDestroy } from 'svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
	import { MIN_SPEED, MAX_SPEED, SPEED_STEP } from './speed.js';
	import { StretchPlayer } from './StretchPlayer.svelte.js';
	import { SOUNDS, soundById } from './sounds.js';
	import TabSwitch from '$lib/components/TabSwitch.svelte';
	import { settings } from '$lib/settings/settings.svelte.js';

	/** @type {{ src: string }} */
	let { src } = $props();

	const player = new StretchPlayer();

	$effect(() => {
		player.load(src);
	});

	$effect(() => {
		player.setFrameSeconds(soundById(settings.transcribe.sound).frameSeconds);
	});

	onDestroy(() => player.dispose());

	function togglePlay() {
		if (player.playing) player.pause();
		else player.play();
	}

	/** @param {KeyboardEvent} event */
	function onKeydown(event) {
		const target = /** @type {HTMLElement} */ (event.target);
		if (event.code !== 'Space' || target.closest('textarea, input[type="text"], button')) return;
		event.preventDefault();
		togglePlay();
	}

	/** @param {number} seconds */
	function formatTime(seconds) {
		const whole = Math.floor(seconds || 0);
		const minutes = Math.floor(whole / 60);
		const rest = String(whole % 60).padStart(2, '0');
		return `${minutes}:${rest}`;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<section class="flex flex-col gap-4 ui-card p-4 sm:p-5" aria-label="Player">
	<div class="flex items-center gap-4">
		<button
			type="button"
			class="ui-button px-6 py-3 text-lg ui-button-primary"
			disabled={player.loading}
			onclick={togglePlay}
			use:tooltip={TIPS.transcribe.play}
		>
			{player.playing ? 'Pause' : 'Play'}
		</button>

		<p class="text-sm text-ink-soft tabular-nums">
			{#if player.loading}
				Loading…
			{:else}
				{formatTime(player.time)} / {formatTime(player.duration)}
			{/if}
		</p>
	</div>

	{#if player.error}
		<p class="text-sm text-ink-soft">{player.error}</p>
	{/if}

	<input
		type="range"
		min="0"
		max={player.duration || 0}
		step="0.1"
		value={player.time}
		oninput={(event) => player.seek(Number(event.currentTarget.value))}
		aria-label="Position in the song"
		class="w-full"
		use:tooltip={TIPS.transcribe.position}
	/>

	<div class="flex items-center gap-4">
		<label class="flex min-w-0 flex-1 flex-col gap-1">
			<span class="text-sm text-ink-soft">
				Speed <strong class="text-ink tabular-nums">{Math.round(player.speed * 100)}%</strong>
				<span class="text-ink-soft">(pitch stays the same)</span>
			</span>
			<input
				type="range"
				min={MIN_SPEED}
				max={MAX_SPEED}
				step={SPEED_STEP}
				value={player.speed}
				oninput={(event) => player.setSpeed(Number(event.currentTarget.value))}
				class="w-full"
				use:tooltip={TIPS.transcribe.speed}
			/>
		</label>

		<button
			type="button"
			class="ui-button px-3 py-2 text-sm"
			onclick={() => player.setSpeed(1)}
			use:tooltip={TIPS.transcribe.resetSpeed}
		>
			100%
		</button>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<span class="text-sm text-ink-soft">Sound</span>
		<TabSwitch
			tabs={SOUNDS}
			bind:value={settings.transcribe.sound}
			tips={TIPS.transcribe.sounds}
			label="Sound"
		/>
	</div>
</section>
