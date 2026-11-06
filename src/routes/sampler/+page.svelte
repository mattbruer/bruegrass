<script>
	/**
	 * The sampling page: record your own instrument samples for the band.
	 * An outline of its parts; the pieces live in $lib/sampler, and the
	 * audio work in $lib/recording.
	 *
	 * A dev tool: only while running the dev server on this computer
	 * (+page.js gives a 404 anywhere else). Its samples ship with the app.
	 * Computer only: you record through an audio interface. A touch screen
	 * gets a short note instead, and nothing opens the microphone.
	 *
	 * Today: the input check (choose the interface, set levels, record and
	 * check a test take). Next: the guided session that records the set.
	 */
	import { onMount, untrack } from 'svelte';
	import { watchTouchScreen } from '$lib/utils/touchScreen.js';
	import { InputCheck } from '$lib/sampler/InputCheck.svelte.js';
	import { guardUnsavedTake } from '$lib/sampler/guardUnsavedTake.svelte.js';
	import InputPicker from '$lib/sampler/components/InputPicker.svelte';
	import InputMeters from '$lib/sampler/components/InputMeters.svelte';
	import TakePanel from '$lib/sampler/components/TakePanel.svelte';

	const input = new InputCheck();
	guardUnsavedTake(input);

	/** @type {boolean | null} null until we know (the server can't tell) */
	let touchScreen = $state(null);

	onMount(() => watchTouchScreen((isTouch) => (touchScreen = isTouch)));

	// Only on a computer: watch for inputs, and let go of the input on leaving
	$effect(() => {
		if (touchScreen !== false) return;
		const stopWatching = untrack(() => input.watch());
		return () => {
			stopWatching();
			input.close();
		};
	});
</script>

<svelte:head>
	<title>Sampling session</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8 sm:px-8">
	<h1 class="mb-2 text-3xl font-bold">Sampling session</h1>

	{#if touchScreen}
		<p class="ui-card p-6 text-ink-soft">
			Samples are recorded on a computer, through an audio interface. Open this page there.
		</p>
	{:else if touchScreen === false}
		<p class="mb-6 text-ink-soft">
			Record your own guitar for the band to play. First, check your input: choose the interface,
			set the gain so your hardest hits peak around −6 dB, and listen back to a test take.
		</p>

		<section class="mb-6 ui-card p-6" aria-labelledby="input-heading">
			<h2 id="input-heading" class="mb-4 text-lg font-bold">Input</h2>
			<InputPicker {input} />
			{#if input.channelCount > 0}
				<div class="mt-4">
					<InputMeters channelCount={input.channelCount} read={() => input.readLevels()} />
				</div>
			{/if}
		</section>

		<section class="ui-card p-6" aria-labelledby="take-heading">
			<h2 id="take-heading" class="mb-4 text-lg font-bold">Test take</h2>
			<TakePanel {input} />
		</section>
	{/if}
</main>
