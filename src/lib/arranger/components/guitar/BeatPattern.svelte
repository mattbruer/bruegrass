<script>
	/**
	 * A chord's beats as the guitarist counts them, one card each: a boom
	 * (the one note picked low, what it is in the chord) or a chuck (the
	 * strings strummed). Tap a card to pick that beat; the host shows what
	 * can change on it.
	 */
	import { writtenNote } from '../../chart/key.js';
	import { tooltip } from '$lib/tooltips/tooltip.js';
	import { TIPS } from '$lib/tooltips/tips.js';

	/**
	 * @typedef {{
	 *   beat: import('../../instruments/guitarPlan.js').ChordBeat,
	 *   notes: import('../../voicings/fretNotes.js').FretNote[],
	 *   yours: boolean
	 * }} BeatCard
	 *   notes: what the beat plays (one for a boom); yours: you changed it
	 */

	/**
	 * @type {{ cards: BeatCard[], selected: number, onSelect: (index: number) => void }}
	 */
	let { cards, selected, onSelect } = $props();
</script>

<div class="cards" role="radiogroup" aria-label="The chord's beats">
	{#each cards as card, i (i)}
		{@const boom = card.beat.role === 'boom'}
		<button
			type="button"
			role="radio"
			aria-checked={selected === i}
			class="card"
			class:on={selected === i}
			class:boom
			onclick={() => onSelect(i)}
			use:tooltip={boom ? TIPS.guitarEditor.boomBeat : TIPS.guitarEditor.chuckBeat}
		>
			<span class="beat">{card.beat.beatInBar + 1}</span>
			<span class="role">{boom ? 'Boom' : 'Chuck'}{card.yours ? ' · yours' : ''}</span>
			{#if card.notes.length === 0}
				<span class="what quiet">nothing</span>
			{:else if boom}
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

	.role {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-ink-soft);
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
