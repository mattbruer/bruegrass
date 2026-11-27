<!-- A padlock, shut (`open` false) or open. Drawn in the current text colour. -->
<script>
	/** @type {{ open?: boolean, size?: number }} */
	let { open = false, size = 12 } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<rect x="4" y="11" width="16" height="10" rx="2" fill={open ? 'none' : 'currentColor'} />
	<path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} />
</svg>
