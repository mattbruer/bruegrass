<script>
	/**
	 * A chord's beats as the guitarist counts them, one card each: a boom
	 * (the one note picked low, what it is in the chord), a chuck (the
	 * strings strummed) or a note of your own (part of a run). Tap a card to pick that beat; the host shows what
	 * can change on it.
	 */
	import { writtenNote } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @typedef {{
	 *   kind: 'boom' | 'chuck' | 'note',
	 *   beatInBar: number,
	 *   accent: boolean,
	 *   notes: import('../../voicings/fretNotes.js').FretNote[],
	 *   yours: boolean
	 * }} BeatCard
	 *   beatInBar: from 0; accent: played louder; notes: what the beat plays (one for a boom or a note); yours: you changed it
	 */

	/**
	 * @type {{ cards: BeatCard[], selected: number, onSelect: (index: number) => void }}
	 */
	let { cards, selected, onSelect } = $props();

	const ROLE_NAMES = { boom: 'Boom', chuck: 'Chuck', note: 'Note' };
</script>

<div class="cards" role="radiogroup" aria-label="The chord's beats">
	{#each cards as card, i (i)}
		{@const single = card.kind !== 'chuck'}
		<button
			type="button"
			role="radio"
			aria-checked={selected === i}
			class="card"
			class:on={selected === i}
			class:note={card.kind === 'note'}
			onclick={() => onSelect(i)}
			use:tooltip={TIPS.guitarEditor.beats[card.kind]}
		>
			<span class="beat"
				>{card.beatInBar + 1}{#if card.accent}<span class="accent" aria-label="accented">&gt;</span
					>{/if}</span
			>
			<span class="role">{ROLE_NAMES[card.kind]}{card.yours ? ' · yours' : ''}</span>
			{#if card.notes.length === 0}
				<span class="what quiet">nothing</span>
			{:else if single}
				<span class="what">{writtenNote(card.notes[0])}</span>
				<span class="degree">{card.notes[0].words}</span>
			{:else}
				<span class="what chord">{card.notes.map((note) => writtenNote(note)).join(' ')}</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 0.4rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.1rem;
		padding: 0.4rem 0.55rem 0.5rem;
		text-align: left;
		border: 1px solid var(--color-line);
		border-radius: var(--corner-small);
		background: var(--face-3d), var(--color-raised);
		box-shadow: var(--shadow-bevel);
		cursor: pointer;
	}

	.card.on {
		border-color: var(--color-accent);
		background: color-mix(in oklab, var(--color-accent) 16%, var(--color-raised));
		box-shadow: var(--shadow-sunk);
	}

	.card:focus-visible {
		outline: 2px solid var(--color-accent);
	}

	.beat {
		font-size: 1.1rem;
		font-weight: 800;
		line-height: 1;
	}

	.accent {
		margin-left: 0.3rem;
		color: var(--color-accent);
	}

	.role {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
	}

	.card.note {
		border-style: dashed;
		border-color: var(--color-accent);
	}

	.card.on .role {
		color: var(--color-accent);
	}

	.what {
		font-weight: 700;
	}

	.what.chord {
		font-size: 0.85rem;
	}

	.quiet,
	.degree {
		font-size: 0.75rem;
		color: var(--color-ink-soft);
	}
</style>
