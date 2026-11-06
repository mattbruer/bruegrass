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
	 * First the input (choose the interface, set levels) and a test take.
	 * Then the guided session, which records the set target by target and
	 * keeps every take on this computer as it goes.
	 */
	import { onMount, untrack } from 'svelte';
	import { watchTouchScreen } from '$lib/utils/touchScreen.js';
	import { InputCheck } from '$lib/sampler/InputCheck.svelte.js';
	import { TestTake } from '$lib/sampler/TestTake.svelte.js';
	import { RecordingSession } from '$lib/sampler/session/RecordingSession.svelte.js';
	import { guardLeaving } from '$lib/sampler/guardLeaving.svelte.js';
	import InputPicker from '$lib/sampler/components/InputPicker.svelte';
	import InputMeters from '$lib/sampler/components/InputMeters.svelte';
	import TakePanel from '$lib/sampler/components/TakePanel.svelte';
	import SessionPicker from '$lib/sampler/components/session/SessionPicker.svelte';
	import SessionPanel from '$lib/sampler/components/session/SessionPanel.svelte';

	const input = new InputCheck();
	const test = new TestTake(input);

	/** The open session, or null for the test take and the session list. */
	/** @type {RecordingSession | null} */
	let session = $state(null);
	let sessionProblem = $state('');

	guardLeaving(() => {
		if (input.status === 'recording') return 'A take is still recording. Leave without it?';
		if (test.unsaved) return 'Your test take hasn’t been downloaded. Leave without it?';
		return null;
	});

	/** @param {import('$lib/storage/samplingSessions.js').SamplingSession} saved */
	async function openSession(saved) {
		sessionProblem = '';
		try {
			test.take = null; // its keys and the session's are the same; the session takes over
			session = await RecordingSession.open(input, saved);
		} catch (error) {
			sessionProblem = `The session didn’t open: ${error instanceof Error ? error.message : error}`;
		}
	}

	function closeSession() {
		session?.stopPlaying();
		session = null;
	}

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
			set the gain so your hardest hits peak around −6 dB, and listen back to a test take. Then
			start a session.
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

		{#if session}
			<section class="ui-card p-6" aria-label="Recording session">
				<SessionPanel {session} onclose={closeSession} />
			</section>
		{:else}
			<section class="mb-6 ui-card p-6" aria-labelledby="take-heading">
				<h2 id="take-heading" class="mb-4 text-lg font-bold">Test take</h2>
				<TakePanel {test} />
			</section>

			<section class="ui-card p-6" aria-labelledby="sessions-heading">
				<h2 id="sessions-heading" class="mb-2 text-lg font-bold">Sessions</h2>
				<p class="mb-4 text-sm text-ink-soft">
					A session walks you through every note and strum to record, checks each take, and keeps it
					on this computer as you go: stop any time and continue later.
				</p>
				<SessionPicker onopen={openSession} />
				{#if sessionProblem}
					<p class="mt-3 text-sm text-danger" role="alert">{sessionProblem}</p>
				{/if}
			</section>
		{/if}
	{/if}
</main>
