<script>
	/**
	 * Stop: a ruby square standing off the key, with bevelled edges lit from
	 * the upper left, a gloss across its top, and a soft shadow.
	 */
	const id = $props.id();
</script>

<svg viewBox="0 0 64 64" aria-hidden="true">
	<defs>
		<linearGradient id="{id}-body" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#fca5a5" />
			<stop offset="0.35" stop-color="#dc2626" />
			<stop offset="1" stop-color="#6f1414" />
		</linearGradient>
		<linearGradient id="{id}-gloss" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#fff" stop-opacity="0.65" />
			<stop offset="1" stop-color="#fff" stop-opacity="0" />
		</linearGradient>
		<filter id="{id}-blur" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur stdDeviation="2.2" />
		</filter>
		<clipPath id="{id}-shape"><rect x="13" y="13" width="38" height="38" rx="7" /></clipPath>
	</defs>

	<rect
		x="14.5"
		y="17"
		width="38"
		height="38"
		rx="7"
		fill="#000"
		opacity="0.32"
		filter="url(#{id}-blur)"
	/>
	<rect x="13" y="13" width="38" height="38" rx="7" fill="url(#{id}-body)" />
	<g clip-path="url(#{id}-shape)" fill="none" stroke-linecap="round">
		<path d="M13 44V20Q13 13 20 13H44" stroke="#fff" stroke-opacity="0.55" stroke-width="4" />
		<path d="M20 51H44Q51 51 51 44V20" stroke="#3f0808" stroke-opacity="0.5" stroke-width="4" />
		<path
			d="M13 20Q13 13 20 13H44Q51 13 51 20V28Q32 34 13 30Z"
			fill="url(#{id}-gloss)"
			stroke="none"
		/>
	</g>
	<ellipse cx="19.5" cy="18" rx="3" ry="1.3" fill="#fff" opacity="0.7" />
</svg>
