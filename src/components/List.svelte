<script>
import Song from './Song.svelte';
    import { songs } from '$lib/songs.js';

    let sortedSongs = songs.toSorted((a, b) =>
        a.title.localeCompare(b.title)
    );

    let selectedSong = $state(null);
    let audio;

    function playSong(song) {
        selectedSong = song;
        audio.src = song.src;
        audio.play();
    }

    function playAll() {
        playSong(sortedSongs[0]);
    }

    function nextSong() {
        const currentIndex = sortedSongs.indexOf(selectedSong);
        const nextIndex = currentIndex + 1;

        if (nextIndex < sortedSongs.length) {
            playSong(sortedSongs[nextIndex]);
        }
    }
</script>

<button class='m-4 shadow shadow-black pl-8 pr-8 pt-2 pb-2' onclick={playAll}>Play All</button>

<div class='flex flex-col items-start mt-8'>
    {#each sortedSongs as song (song.src)}
        <Song
            isPlaying={song.title == selectedSong?.title}
            title={song.title}
            onclick={() => playSong(song)}
        />
    {/each}
</div>

<div class='mt-12'>
    <audio bind:this={audio} controls onended={nextSong}></audio>

    {#if selectedSong}
        <p>{selectedSong.title}</p>
    {/if}
</div>