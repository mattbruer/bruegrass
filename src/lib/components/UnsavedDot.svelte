<!--
	Unsaved changes: a small dot in the accent colour, like an editor's tab.
	Used wherever something can have changes you haven't saved yet (the song,
	a listening setup). Put a visible "Unsaved changes" message next to it
	too: the dot is only decoration for screen readers.
-->
<span class="unsaved-dot" aria-hidden="true"></span>

<style>
	.unsaved-dot {
		display: inline-block;
		flex-shrink: 0;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 9999px;
		background: var(--color-accent);
	}
</style>
