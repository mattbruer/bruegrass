<script>
    import Song from './Song.svelte';
    import { songs } from '$lib/songs.js';

    let sortedSongs = songs.toSorted((a, b) =>
        a.title.localeCompare(b.title)
    );

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

<button class='m-4 shadow shadow-black pl-8 pr-8 pt-2 pb-2' onclick={playAll}>Play All</button>

<div class='flex flex-col items-start mt-8'>
    {#each sortedSongs as song, index (song.src)}
        <Song
            isPlaying={index === selectedIndex}
            title={song.title}
            onclick={() => playSong(index)}
        />
    {/each}
</div>

<div class='mt-12'>
    <audio bind:this={audio} controls onended={nextSong}></audio>

    {#if selectedIndex !== null}
        <p>{sortedSongs[selectedIndex].title}</p>
    {/if}
</div>