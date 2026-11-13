<script>
	/**
	 * Slow a song down to learn its parts, without changing its pitch.
	 * Pick a song from the list; its player shows above the list.
	 */
	import { songs } from '$lib/playlist/songs.js';
	import TranscribePlayer from '$lib/slowDowner/TranscribePlayer.svelte';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	const tracks = songs.toSorted((a, b) => a.title.localeCompare(b.title));

	let chosen = $state(tracks[0]);
</script>

<svelte:head>
	<title>Transcribe · Bruegrass</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
	<h1 class="text-3xl font-bold">Transcribe</h1>

	<TranscribePlayer src={chosen.src} />

	<ul class="flex flex-col gap-3">
		{#each tracks as track (track.src)}
			<li>
				<button
					type="button"
					class="w-full ui-button px-4 py-3 text-left"
					class:ui-button-on={track.src === chosen.src}
					aria-current={track.src === chosen.src ? 'true' : undefined}
					onclick={() => (chosen = track)}
					use:tooltip={TIPS.transcribe.track}
				>
					{track.src === chosen.src ? '♪ ' : ''}{track.title}
				</button>
			</li>
		{/each}
	</ul>
</main>
