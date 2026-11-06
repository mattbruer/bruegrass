<!--
	Start a new sampling session, or carry on with one saved on this
	computer. Sessions are listed latest first.
-->
<script>
	import { onMount } from 'svelte';
	import { CHECKLISTS } from '../../checklists/targets.js';
	import { createSession, deleteSession, listSessions } from '$lib/storage/samplingSessions.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @type {{ onopen: (session: import('$lib/storage/samplingSessions.js').SamplingSession) => void }}
	 */
	let { onopen } = $props();

	/** @type {import('$lib/storage/samplingSessions.js').SamplingSession[] | null} null while loading */
	let sessions = $state(null);
	let problem = $state('');

	onMount(() => {
		refresh();
	});

	async function refresh() {
		try {
			sessions = await listSessions();
		} catch (error) {
			sessions = [];
			problem = `Couldn’t read the saved sessions: ${error instanceof Error ? error.message : error}`;
		}
	}

	/** @param {import('../../checklists/guitar.js').Checklist} checklist */
	async function start(checklist) {
		const date = new Date().toLocaleDateString(undefined, { dateStyle: 'medium' });
		onopen(await createSession(checklist.id, `${checklist.name}, ${date}`));
	}

	/** @param {import('$lib/storage/samplingSessions.js').SamplingSession} session */
	async function remove(session) {
		if (!confirm(`Delete “${session.name}” and all its recordings from this computer?`)) return;
		await deleteSession(session.id);
		await refresh();
	}

	/** @param {string} iso */
	const when = (iso) =>
		new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="flex flex-wrap gap-3">
	{#each CHECKLISTS as checklist (checklist.id)}
		<button
			type="button"
			class="ui-button px-4 py-2 ui-button-primary"
			onclick={() => start(checklist)}
			use:tooltip={TIPS.sampler.newSession}
		>
			New {checklist.name.toLowerCase()} session
		</button>
	{/each}
</div>

{#if problem}
	<p class="mt-3 text-sm text-danger" role="alert">{problem}</p>
{/if}

{#if sessions && sessions.length > 0}
	<ul class="mt-5 space-y-2">
		{#each sessions as session (session.id)}
			<li class="flex flex-wrap items-center gap-3 ui-well px-4 py-3">
				<div class="min-w-0 flex-1">
					<p class="font-semibold">{session.name}</p>
					<p class="text-sm text-ink-soft">Last recorded {when(session.updatedAt)}</p>
				</div>
				<button
					type="button"
					class="ui-button px-3 py-1.5 text-sm"
					onclick={() => onopen(session)}
					use:tooltip={TIPS.sampler.continueSession}
				>
					Continue
				</button>
				<button
					type="button"
					class="ui-button px-3 py-1.5 text-sm"
					onclick={() => remove(session)}
					use:tooltip={TIPS.sampler.deleteSession}
				>
					Delete
				</button>
			</li>
		{/each}
	</ul>
{:else if sessions}
	<p class="mt-3 text-sm text-ink-soft">No sessions yet.</p>
{/if}
