<script>
	/** A stored value as readable JSON, in a box that scrolls. */
	import { readableJson } from '../describeValue.js';

	/** @type {{ value: unknown }} */
	let { value } = $props();
</script>

<pre class="ui-well">{readableJson(value)}</pre>

<style>
	pre {
		margin-top: 0.5rem;
		max-height: 20rem;
		overflow: auto;
		padding: 0.75rem;
		font-size: 0.75rem;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
