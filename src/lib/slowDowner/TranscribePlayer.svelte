<script>
	/** The transcribe page's player: one song, slowed down with its pitch kept. */
	import { onDestroy } from 'svelte';
	import { StretchPlayer } from './StretchPlayer.svelte.js';
	import PlayerControls from './PlayerControls.svelte';

	/** @type {{ src: string }} */
	let { src } = $props();

	const player = new StretchPlayer();

	$effect(() => {
		player.load(src);
	});

	onDestroy(() => player.dispose());
</script>

<PlayerControls {player} />
