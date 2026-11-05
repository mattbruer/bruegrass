<script>
	/**
	 * On-screen music keypad for writing arrangements on a phone: only the
	 * keys an arrangement needs, with a one-tap switch to the normal keyboard
	 * for typing part names. Text rules live in keypad.js.
	 */
	import { onMount } from 'svelte';
	import { KEYS, TIME_KEYS, applyKey } from './keypad.js';

	/**
	 * @type {{
	 *   textarea: HTMLTextAreaElement | undefined,
	 *   mode?: 'music' | 'text',
	 *   height?: number
	 * }}
	 */
	let { textarea, mode = $bindable('music'), height = $bindable(0) } = $props();

	let timeOpen = $state(false);
	/** Distance from the bottom of the layout to the top of the system keyboard. */
	let keyboardOffset = $state(0);
	/**
	 * The part of the page on screen (CSS px). When Safari is zoomed in, the
	 * page is wider than the screen, so the keypad follows what's visible
	 * instead of spanning the whole page.
	 */
	/** @type {{ left: number, width: number } | null} */
	let visible = $state(null);

	onMount(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		const update = () => {
			keyboardOffset = Math.max(0, window.innerHeight - (viewport.offsetTop + viewport.height));
			visible = { left: viewport.offsetLeft, width: viewport.width };
		};
		update();
		viewport.addEventListener('resize', update);
		viewport.addEventListener('scroll', update);
		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
		};
	});

	/** Put an edit into the textarea, so bind:value (and the chart) update. */
	function apply(/** @type {string} */ key) {
		if (!textarea) return;
		const edit = applyKey(textarea.value, textarea.selectionStart, textarea.selectionEnd, key);
		textarea.value = edit.value;
		textarea.setSelectionRange(edit.caret, edit.caret);
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
	}

	/** iOS only re-reads inputmode when the field gains focus. */
	function refocus() {
		if (!textarea) return;
		const field = textarea;
		field.blur();
		requestAnimationFrame(() => field.focus());
	}

	function press(/** @type {string} */ id) {
		if (id === 'time') {
			timeOpen = !timeOpen;
			return;
		}
		apply(id);
		// A new part starts with its name: switch to letters for it
		if (id === 'part') {
			mode = 'text';
			refocus();
		}
	}

	function useLetters() {
		timeOpen = false;
		mode = 'text';
		refocus();
	}

	function useMusicKeys() {
		apply('leave-name');
		mode = 'music';
		refocus();
	}

	/** Keys must not take focus from the textarea, or the caret is lost. */
	const keepFocus = (/** @type {PointerEvent} */ event) => event.preventDefault();
</script>

<div
	class="keypad-dock"
	style:bottom="{keyboardOffset}px"
	style:left={visible ? `${visible.left}px` : null}
	style:width={visible ? `${visible.width}px` : null}
	bind:offsetHeight={height}
>
	{#if mode === 'text'}
		<!-- Above the phone's own keyboard while typing a name -->
		<div class="letters-bar">
			<span>Typing letters</span>
			<button type="button" tabindex="-1" onpointerdown={keepFocus} onclick={useMusicKeys}>
				♪ Music keys
			</button>
		</div>
	{:else}
		<div class="keypad" role="group" aria-label="Music keypad">
			{#if timeOpen}
				<div class="row time-row">
					{#each TIME_KEYS as time (time.text)}
						<button
							type="button"
							tabindex="-1"
							class="key time-key"
							onpointerdown={keepFocus}
							onclick={() => {
								apply(time.text);
								timeOpen = false;
							}}
						>
							<span>{time.label}</span>
							<small>{time.note}</small>
						</button>
					{/each}
				</div>
			{/if}

			{#each KEYS as row, r (r)}
				<div class="row">
					{#each row as key (key.id)}
						<button
							type="button"
							tabindex="-1"
							class="key"
							class:chord={key.kind === 'chord'}
							class:wide={key.wide}
							class:active={key.id === 'time' && timeOpen}
							aria-label={key.id === 'backspace' ? 'Delete' : key.id === 'space' ? 'Space' : key.id === 'newline' ? 'New line' : undefined}
							onpointerdown={keepFocus}
							onclick={() => press(key.id)}
						>
							{key.label}
						</button>
					{/each}
				</div>
			{/each}

			<div class="row">
				<button type="button" tabindex="-1" class="key wide" onpointerdown={keepFocus} onclick={useLetters}>
					abc
				</button>
				<span class="spacer"></span>
				<button type="button" tabindex="-1" class="key wide done" onpointerdown={keepFocus} onclick={() => textarea?.blur()}>
					Done
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.keypad-dock {
		position: fixed;
		inset-inline: 0;
		z-index: 30;
		background: rgb(31 41 55);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		box-shadow: 0 -4px 16px rgb(0 0 0 / 0.25);
		touch-action: manipulation; /* no double-tap zoom on fast taps */
		user-select: none;
		-webkit-user-select: none;
	}

	.keypad {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.5rem 0.375rem;
	}

	.row {
		display: flex;
		gap: 0.375rem;
	}

	.key {
		flex: 1 1 0;
		min-width: 0;
		min-height: 2.75rem;
		border-radius: 0.375rem;
		background: rgb(75 85 99);
		font-size: 1.05rem;
		font-weight: 600;
		color: white;
		box-shadow: 0 1px 0 rgb(0 0 0 / 0.4);
	}

	.key:active {
		background: rgb(107 114 128);
	}

	.key.chord {
		background: rgb(243 244 246);
		font-size: 1.2rem;
		font-weight: 700;
		color: rgb(17 24 39);
	}

	.key.chord:active {
		background: rgb(209 213 219);
	}

	.key.wide {
		flex-grow: 2;
	}

	.key.active,
	.key.done {
		background: rgb(245 158 11);
		color: rgb(17 24 39);
	}

	.spacer {
		flex: 3 1 0;
	}

	.time-row .time-key {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgb(55 65 81);
		line-height: 1.1;
	}

	.time-key small {
		font-size: 0.6rem;
		font-weight: 500;
		color: rgb(209 213 219);
	}

	.letters-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
		font-size: 0.85rem;
		color: rgb(209 213 219);
	}

	.letters-bar button {
		border-radius: 0.375rem;
		background: rgb(245 158 11);
		padding: 0.5rem 0.9rem;
		font-weight: 700;
		color: rgb(17 24 39);
	}
</style>
