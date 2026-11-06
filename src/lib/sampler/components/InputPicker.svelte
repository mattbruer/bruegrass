<script>
	/**
	 * Choose the input (the audio interface, by name) and turn it on or off.
	 * Warns if the browser kept any call-style processing on, because that
	 * would change the sound of every sample.
	 */
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ input: import('../InputCheck.svelte.js').InputCheck }} */
	let { input } = $props();

	/** How the browser's processing names read to a person. */
	const PROCESSING_NAMES = /** @type {Record<string, string>} */ ({
		echoCancellation: 'echo cancellation',
		autoGainControl: 'automatic gain',
		noiseSuppression: 'noise suppression'
	});

	/** Open and listening ('opening' still shows the turn-on button, waiting). */
	const isOn = $derived(input.status === 'on' || input.status === 'recording');
</script>

<div class="flex flex-wrap items-center gap-3">
	<label class="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
		Input
		<select
			class="min-w-0 flex-1 ui-field px-3 py-2 font-normal"
			value={input.chosenId ?? ''}
			disabled={input.status === 'opening' || input.status === 'recording'}
			onchange={(event) => input.chooseInput(event.currentTarget.value)}
			use:tooltip={TIPS.sampler.input}
		>
			<!-- No choice yet, or one the list doesn't name (before permission, names and ids are hidden) -->
			{#if !input.inputs.some((device) => device.id === input.chosenId)}
				<option value={input.chosenId ?? ''}>The computer’s default input</option>
			{/if}
			{#each input.inputs as device (device.id)}
				<option value={device.id}>{device.label}</option>
			{/each}
		</select>
	</label>

	{#if isOn}
		<button
			type="button"
			class="ui-button px-4 py-2"
			disabled={input.status === 'recording'}
			onclick={() => input.turnOff()}
			use:tooltip={TIPS.sampler.turnOff}
		>
			Turn off
		</button>
	{:else}
		<button
			type="button"
			class="ui-button px-4 py-2 ui-button-primary"
			disabled={input.status === 'opening'}
			onclick={() => input.turnOn()}
			use:tooltip={TIPS.sampler.turnOn}
		>
			{input.status === 'opening' ? 'Opening…' : 'Turn on input'}
		</button>
	{/if}
</div>

{#if input.status === 'off' && !input.inputs.some((device) => device.named)}
	<p class="mt-3 text-sm text-ink-soft">
		Your interface isn’t listed by name yet: the browser hides names until you allow the microphone.
		Press Turn on input and allow it, then choose your interface here.
	</p>
{/if}

{#if input.problem}
	<p class="mt-3 text-sm text-danger" role="alert">{input.problem}</p>
{/if}

{#if input.status === 'opening'}
	<p class="mt-3 text-sm text-ink-soft" aria-live="polite">
		Waiting for the input. If the browser asks to use the microphone, allow it.
	</p>
{/if}

{#if isOn}
	<p class="mt-3 text-sm text-ink-soft">
		{input.channelCount === 1 ? 'One channel' : `${input.channelCount} channels`} at 48 kHz.
		{#if input.channelCount === 1}
			For two mics, choose the interface itself (not one of its inputs), if it’s listed.
		{/if}
	</p>
	{#if input.processingLeftOn.length > 0}
		<p class="mt-2 text-sm text-danger" role="alert">
			The browser kept {input.processingLeftOn.map((name) => PROCESSING_NAMES[name]).join(' and ')}
			on, which changes the sound. Try another browser (Chrome lets you turn it off).
		</p>
	{/if}
{/if}
