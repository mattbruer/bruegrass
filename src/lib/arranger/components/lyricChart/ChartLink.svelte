<script>
	/** Opens the song as a lyric chart to read or print. The song and the band come too. */
	import { resolve } from '$app/paths';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';
</script>

<a
	href={resolve('/arranger/chart')}
	class="ui-button px-4 py-2 text-sm"
	use:tooltip={TIPS.chart.open}
>
	Chart
</a>
