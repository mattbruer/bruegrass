<!--
	Everything a checklist asks you to record, on one screen: the total, each
	group's sum, and a table of every note (with its pitch) and how many takes
	it needs. With a session open, each cell also shows how many are kept and
	turns into a tick when done. Read-only: the progress grid is for moving
	around the session.
-->
<script>
	import Dialog from '$lib/components/Dialog.svelte';
	import { listTargets, targetGrid } from '../../checklists/targets.js';
	import { summariseChecklist } from '../../checklists/summariseChecklist.js';
	import { shortNoteName } from '../../session/describeTarget.js';

	/**
	 * @type {{
	 *   open: boolean,
	 *   checklist: import('../../checklists/guitar.js').Checklist,
	 *   session?: import('../../session/RecordingSession.svelte.js').RecordingSession | null
	 * }}
	 */
	let { open = $bindable(false), checklist, session = null } = $props();

	const summary = $derived(summariseChecklist(checklist));
	const targets = $derived(listTargets(checklist));

	/** @param {import('../../checklists/targets.js').Target[]} cellTargets */
	const keptIn = (cellTargets) =>
		session ? cellTargets.filter((target) => session.takesFor(target.id).kept).length : 0;
</script>

<Dialog bind:open title="{checklist.name}: what to record">
	<div class="max-w-2xl space-y-6">
		<p>
			<span class="text-2xl font-bold">{summary.total}</span> takes in all, roughly
			{summary.minutes} minutes of recording.
			{#if session}
				<span class="text-ink-soft">{session.keptCount} kept so far.</span>
			{/if}
		</p>

		{#each summary.groups as group (group.id)}
			{@const grid = targetGrid(targets, group.id)}
			<section>
				<h3 class="font-bold">
					{group.name} <span class="font-normal text-ink-soft">· {group.count}</span>
				</h3>
				<p class="text-sm font-semibold text-ink-soft tabular-nums">{group.sum}</p>
				<p class="mb-2 text-sm text-ink-soft">{group.how}</p>
				<div class="overflow-x-auto">
					<table class="text-xs">
						<thead>
							<tr>
								<th></th>
								{#each grid.columns as column (column)}
									<th class="px-1 pb-1 font-semibold text-ink-soft">{column}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each grid.rows as row (row.label)}
								<tr>
									<th class="pr-2 text-right font-semibold whitespace-nowrap text-ink-soft">
										{row.label}
									</th>
									{#each row.cells as cell (cell.column)}
										{@const first = cell.targets[0]}
										{@const kept = keptIn(cell.targets)}
										{@const done = session !== null && kept === cell.targets.length}
										<td class="p-0.5">
											<div class="cell" class:done>
												{#if first?.midi != null}
													<span class="note">{shortNoteName(first.midi)}</span>
												{/if}
												<span>
													{#if done}✓{:else if session}{kept}/{cell.targets.length}{:else}×{cell
															.targets.length}{/if}
												</span>
											</div>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
</Dialog>

<style>
	.cell {
		display: flex;
		justify-content: space-between;
		gap: 0.4rem;
		min-width: 3.75rem;
		padding: 0.3rem 0.45rem;
		border-radius: var(--corner-small);
		box-shadow: var(--shadow-inset-small);
		color: var(--color-ink-soft);
		font-variant-numeric: tabular-nums;
	}

	.note {
		color: var(--color-ink);
		font-weight: 600;
	}

	.cell.done {
		background: var(--color-accent-soft);
		color: var(--color-ink);
	}
</style>
