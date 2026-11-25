<script>
	/**
	 * A few notes drawn together on a staff, as a chord (black on paper, like
	 * the sheet music). The host spells them.
	 */
	import { loadAbcjs } from '../../melody/abcjs.js';
	import { chordAbc } from '../../melody/chordOnStaff.js';

	/**
	 * @type {{ notes: import('../../melody/chordOnStaff.js').SpelledNote[], label: string }}
	 *   label: what the drawing shows, for screen readers
	 */
	let { notes, label } = $props();

	/** @type {HTMLDivElement | undefined} */
	let paper = $state();

	$effect(() => {
		const target = paper;
		const abc = chordAbc(notes);
		if (!target) return;
		let current = true;
		loadAbcjs().then((abcjs) => {
			if (current)
				abcjs.renderAbc(target, abc, {
					staffwidth: 90,
					paddingtop: 0,
					paddingbottom: 0,
					scale: 1.3
				});
		});
		return () => (current = false);
	});
</script>

<div class="paper" role="img" aria-label={label} bind:this={paper}></div>

<style>
	.paper {
		width: max-content;
		padding: 0 0.25rem;
		border-radius: var(--corner-card);
		background: var(--sheet-music-paper);
		color: var(--sheet-music-ink);
		box-shadow: var(--shadow-inset-small);
	}
</style>
