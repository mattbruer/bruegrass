<script>
	import SongButton from './SongButton.svelte';
	import { songs } from '$lib/songs/songs.js';

	let sortedSongs = songs.toSorted((a, b) => a.title.localeCompare(b.title));

	let selectedIndex = $state(null);
	let audio;

	function playSong(index) {
		selectedIndex = index;
		audio.src = sortedSongs[index].src;
		audio.play();
	}

	function playAll() {
		playSong(0);
	}

	function nextSong() {
		const nextIndex = selectedIndex + 1;

		if (nextIndex < sortedSongs.length) {
			playSong(nextIndex);
		}
	}
</script>

<!-- Now playing, with the player -->
<section class="mb-8 ui-card p-4 sm:p-5" aria-label="Player">
	<div class="mb-3 flex items-center gap-4">
		<button type="button" class="ui-button px-6 py-2 ui-button-primary" onclick={playAll}
			>Play All</button
		>
		<p class="min-w-0 truncate text-sm text-ink-soft">
			{#if selectedIndex !== null}
				Now playing: <strong class="text-ink">{sortedSongs[selectedIndex].title}</strong>
			{:else}
				Pick a song, or play them all.
			{/if}
		</p>
	</div>
	<audio bind:this={audio} controls onended={nextSong} class="w-full"></audio>
</section>

<ul class="flex flex-col gap-3">
	{#each sortedSongs as song, index (song.src)}
		<li>
			<SongButton
				isPlaying={index === selectedIndex}
				title={song.title}
				onclick={() => playSong(index)}
			/>
		</li>
	{/each}
</ul>
