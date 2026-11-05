<script>
	/**
	 * One setting: its name and a short description on the left, the control
	 * (a switch, a colour, a slider) on the right. Every setting uses this, so
	 * they all line up the same way.
	 *
	 * Usage:
	 *   <SettingRow id="setting-x" label="Name" description="What it does">
	 *     <ToggleSwitch labelledBy="setting-x" ... />
	 *   </SettingRow>
	 *
	 * `id` goes on the label, so the control can name itself after it
	 * (aria-labelledby) for screen readers.
	 */

	/**
	 * @type {{
	 *   id: string,
	 *   label: string,
	 *   description?: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { id, label, description = '', children } = $props();
</script>

<div class="flex items-center justify-between gap-4 py-2">
	<div class="min-w-0">
		<p {id} class="font-semibold">{label}</p>
		{#if description}
			<p class="text-sm text-ink-soft">{description}</p>
		{/if}
	</div>
	<div class="flex-shrink-0">
		{@render children()}
	</div>
</div>
