<script>
	/**
	 * A panel over the page, with a title and a close button. Every dialog
	 * in the app (Settings, Save, Open) uses this, so they look and behave
	 * the same.
	 *
	 * It's a native <dialog>: Esc closes it, keyboard focus stays inside
	 * while it's open, and tapping the dimmed backdrop closes it too.
	 *
	 * Usage:
	 *   <Dialog bind:open title="Settings">...content...</Dialog>
	 */

	/**
	 * @type {{
	 *   open: boolean,
	 *   title: string,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let { open = $bindable(false), title, children } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let dialog = $state();

	const titleId = `dialog-title-${Math.random().toString(36).slice(2, 8)}`;

	// Keep the dialog in step with `open`
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});

	/** A click on the backdrop (outside the panel itself) closes it. */
	function closeIfBackdropClicked(/** @type {MouseEvent} */ event) {
		if (event.target === dialog) open = false;
	}
</script>

<dialog
	bind:this={dialog}
	class="panel"
	aria-labelledby={titleId}
	onclose={() => (open = false)}
	onclick={closeIfBackdropClicked}
>
	<header class="flex items-center justify-between px-6 pt-6">
		<h2 id={titleId} class="text-xl font-bold">{title}</h2>
		<button
			type="button"
			class="h-9 w-9 ui-button rounded-full"
			aria-label="Close"
			onclick={() => (open = false)}
		>
			✕
		</button>
	</header>

	{@render children()}
</dialog>

<style>
	.panel {
		margin: auto;
		width: min(30rem, calc(100% - 2rem));
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		border: none;
		border-radius: var(--corner-panel);
		background: var(--color-surface);
		color: var(--color-ink);
		box-shadow: var(--shadow-raised);
		padding: 0;
	}

	/* The page behind is dimmed (in the text colour, so it suits any theme) and blurred */
	.panel::backdrop {
		background: color-mix(in oklab, var(--color-ink) 35%, transparent);
		backdrop-filter: blur(3px);
	}
</style>
