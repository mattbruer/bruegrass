<!--
	How far the session has got: one grid per group (strings × frets, or
	direction × intensity), each cell filling as its takes are kept. A chord's
	notes leave gaps (no open B in G), shown as empty cells. The
	cell you're on is outlined; click a cell to go to its first missing take.
-->
<script>
	import { targetGrid } from '../../checklists/targets.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/** @type {{ session: import('../../session/RecordingSession.svelte.js').RecordingSession }} */
	let { session } = $props();

	const grids = $derived(
		session.checklist.groups.map((group) => ({
			group,
			grid: targetGrid(session.targets, group.id)
		}))
	);

	/** @param {import('../../checklists/targets.js').Target[]} targets */
	const keptIn = (targets) => targets.filter((target) => session.takesFor(target.id).kept).length;

	/** @param {import('../../checklists/targets.js').Target[]} targets */
	function goTo(targets) {
		const missing = targets.find((target) => !session.takesFor(target.id).kept) ?? targets[0];
		if (missing) session.go(session.targets.indexOf(missing));
	}
</script>

<div class="space-y-5">
	{#each grids as { group, grid } (group.id)}
		{@const all = grid.rows.flatMap((row) => row.cells.flatMap((cell) => cell.targets))}
		<div>
			<h3 class="mb-2 text-sm font-bold">
				{group.name}
				<span class="font-normal text-ink-soft">{keptIn(all)} of {all.length}</span>
			</h3>
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
									{@const kept = keptIn(cell.targets)}
									{@const here = cell.targets.includes(session.target)}
									<td class="p-0.5">
										{#if cell.targets.length > 0}
											<button
												type="button"
												class="cell"
												class:here
												class:done={kept === cell.targets.length}
												style:--filled="{(kept / cell.targets.length) * 100}%"
												disabled={session.recording || session.busy}
												onclick={() => goTo(cell.targets)}
												use:tooltip={TIPS.sampler.gridCell}
												aria-label="{row.label}, {cell.column}: {kept} of {cell.targets
													.length} kept"
											>
												{kept}/{cell.targets.length}
											</button>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/each}
</div>

<style>
	.cell {
		display: block;
		min-width: 3.25rem;
		padding: 0.3rem 0.4rem;
		border-radius: var(--corner-small);
		box-shadow: var(--shadow-inset-small);
		/* The fill: kept takes from the left */
		background: linear-gradient(
			to right,
			var(--color-accent-soft) var(--filled),
			transparent var(--filled)
		);
		color: var(--color-ink-soft);
		font-variant-numeric: tabular-nums;
	}

	.cell.done {
		color: var(--color-ink);
	}

	.cell.here {
		outline: 2px solid var(--color-accent);
		outline-offset: 1px;
	}

	.cell:focus-visible {
		outline: 2px solid var(--color-accent);
	}
</style>
