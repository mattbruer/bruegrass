<script>
	let { title, onclick, isPlaying } = $props();
</script>

<!-- A raised row; the song that's playing is pressed in and lit -->
<button
	type="button"
	class="w-full ui-button px-4 py-3 text-left"
	class:ui-button-on={isPlaying}
	aria-current={isPlaying ? 'true' : undefined}
	{onclick}
>
	{isPlaying ? '♪ ' : ''}{title}
</button>
