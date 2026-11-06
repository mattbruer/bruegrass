<script>
	/*
	 * How to write an arrangement. Plain language, one idea per section, and
	 * every example drawn as a chart the same way the arranger shows it.
	 * When the syntax grows, add a section to TOPICS.
	 */
	import { parseArrangement } from '$lib/arranger/chart/parseArrangement.js';
	import { barQuarters, meterText, slotPositions } from '$lib/arranger/chart/timeline.js';
	import chords from '$lib/arranger/instruments/guitar-chords.json';

	const QUALITIES = [
		{ suffix: '', label: 'Major' },
		{ suffix: 'm', label: 'Minor' },
		{ suffix: '7', label: 'Seventh' },
		{ suffix: 'dim', label: 'Diminished' }
	];
	const roots = Object.keys(chords).filter((name) => /^[A-G][#b]?$/.test(name));

	/**
	 * Bars of an example, for drawing it as a little chart.
	 * @param {string} text
	 */
	function chart(text) {
		/** @type {{ key: string, name: string | null, meter: string | null, beats: number, chords: { name: string, length: number }[] }[]} */
		const bars = [];
		let previousMeter = '';
		let previousSection = -1;
		for (const slot of slotPositions(parseArrangement(text))) {
			let bar = bars.at(-1);
			const key = `${slot.section}:${slot.measure}`;
			if (!bar || bar.key !== key) {
				const meter = meterText(slot.meter);
				bar = {
					key,
					name: slot.section !== previousSection ? slot.sectionName : null,
					meter: meter !== previousMeter ? meter : null,
					beats: barQuarters(slot.meter),
					chords: []
				};
				bars.push(bar);
				previousMeter = meter;
				previousSection = slot.section;
			}
			bar.chords.push({ name: slot.name, length: slot.length });
		}
		return bars;
	}
</script>

<svelte:head>
	<title>How to write an arrangement · Bluegrass Arranger</title>
</svelte:head>

{#snippet example(/** @type {string} */ text)}
	<div class="example">
		<pre class="code">{text}</pre>
		<div class="chart" aria-label="How it looks">
			{#each chart(text) as bar (bar.key)}
				<div class="bar" class:new-part={bar.name !== null} style="width: {bar.beats * 2.25}rem">
					{#if bar.name !== null || bar.meter}
						<span class="bar-label">
							{#if bar.name !== null}<span class="part">{bar.name}</span>{/if}
							{#if bar.meter}<span class="meter">{bar.meter}</span>{/if}
						</span>
					{/if}
					{#each bar.chords as chord, i (i)}
						<div class="chord" style="width: {chord.length * 2.25}rem">
							<strong>{chord.name}</strong>
							<span class="beats">{'/ '.repeat(chord.length)}</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/snippet}

<main class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
	<p class="mb-2 text-sm text-ink-soft">Bluegrass Arranger · Help</p>
	<h1 class="mb-3 text-3xl font-bold">How to write an arrangement</h1>
	<p class="mb-10 text-lg text-ink-soft">
		You type your song into the box, and the arranger plays it. Here's everything you can type, one
		step at a time. Each example shows what you type, and underneath, what it turns into.
	</p>

	<nav class="mb-12 ui-card p-4">
		<p class="mb-2 font-semibold">On this page</p>
		<ol class="list-inside list-decimal space-y-1 text-accent">
			<li><a href="#parts" class="hover:underline">Parts of the song</a></li>
			<li><a href="#bars" class="hover:underline">Bars</a></li>
			<li><a href="#two-chords" class="hover:underline">Two chords in one bar</a></li>
			<li><a href="#repeat" class="hover:underline">Playing a part again</a></li>
			<li><a href="#waltz" class="hover:underline">Waltzes (3 beats)</a></li>
			<li><a href="#crooked" class="hover:underline">Crooked tunes (odd bars)</a></li>
			<li><a href="#chords" class="hover:underline">Which chords can I use?</a></li>
			<li><a href="#phone" class="hover:underline">Writing on a phone</a></li>
			<li><a href="#mistakes" class="hover:underline">If something goes wrong</a></li>
			<li><a href="#everything" class="hover:underline">Putting it all together</a></li>
		</ol>
	</nav>

	<section id="parts">
		<h2>1. Parts of the song</h2>
		<p>
			Every line is one part of the song, like a verse or a chorus. Start the line with the part's
			name <b>inside double quotes</b>.
		</p>
		{@render example(`"Chorus"|G|C|G|D|`)}
		<p class="tip">
			The name can be anything: <code>"Verse 1"</code>, <code>"Banjo Break"</code>,
			<code>"Ending"</code>. Lines without a name in quotes are ignored, so you can leave blank
			lines between parts.
		</p>
	</section>

	<section id="bars">
		<h2>2. Bars</h2>
		<p>
			A bar (also called a measure) is one count of <b>“1, 2, 3, 4”</b>. Put a straight line
			<code>|</code> between bars, like the lines in sheet music. A chord on its own in a bar lasts the
			whole bar.
		</p>
		{@render example(`"Verse"|G|G|C|C|`)}
		<p class="tip">
			That's G for two bars, then C for two bars. The <code>|</code> key is above Enter on most keyboards
			(hold Shift).
		</p>
	</section>

	<section id="two-chords">
		<h2>3. Two chords in one bar</h2>
		<p>
			Put a <b>comma</b> between them. The bar is split in half: the first chord gets beats 1 and 2, the
			second chord gets beats 3 and 4.
		</p>
		{@render example(`"Verse"|G|C,D|G|`)}
		<p class="tip">
			<code>|G,G|</code> is the same as <code>|G|</code>: G for the whole bar. Four chords in a bar
			(<code>|G,C,D,G|</code>) gets one beat each.
		</p>
	</section>

	<section id="repeat">
		<h2>4. Playing a part again</h2>
		<p>
			No need to type a part twice. Give the new part a name, then write <b>as</b> and the name of the
			part to copy.
		</p>
		{@render example(`"Chorus"|G|C|G|D|\n"Fiddle Break" as Chorus`)}
		<p class="tip">
			The name after <code>as</code> must match exactly, capital letters too. The bass player will change
			things up a little when a part comes around again, like a real player.
		</p>
	</section>

	<section id="waltz">
		<h2>5. Waltzes (3 beats)</h2>
		<p>
			Songs are counted in 4 unless you say otherwise. For a waltz, counted
			<b>“1, 2, 3”</b>, put <code>[M:3/4]</code> before the bars. The guitar plays
			<b>boom-chuck-chuck</b>.
		</p>
		{@render example(`"Waltz" [M:3/4] |G|G|C|D|`)}
		<p class="tip">
			It stays in 3 for the rest of the song, even in the next parts, until you change it back with
			<code>[M:4/4]</code>. You can put it in front of any bar, even in the middle of a line.
		</p>
	</section>

	<section id="crooked">
		<h2>6. Crooked tunes (odd bars)</h2>
		<p>
			Some tunes have a bar with extra or missing beats. Put the count for <b>just that one bar</b>
			in square brackets right before it, with no <code>M:</code>. The next bar goes back to normal
			on its own.
		</p>
		{@render example(`"Crooked"|G|C|[2/4]D|G|`)}
		<p class="tip">
			<code>[2/4]</code> is a short bar of 2 beats. <code>[3/4]</code> is 3 beats,
			<code>[5/4]</code> is 5 beats (one extra), and so on.
		</p>

		<h3>The difference, in one line</h3>
		<ul class="mb-4 list-disc space-y-1 pl-6">
			<li><code>[M:3/4]</code> with <b>M:</b> = “from now on”</li>
			<li><code>[3/4]</code> without <b>M:</b> = “just this bar”</li>
		</ul>
		<p class="tip">
			Musicians who like counting in 2 can write <code>[M:2/2]</code> (or <code>[M:C|]</code>). It
			sounds the same as 4.
		</p>
	</section>

	<section id="chords">
		<h2>7. Which chords can I use?</h2>
		<p>
			Major, minor, seventh and diminished chords in every key. Put the letter first, then # or b if
			it has one, then the kind of chord:
		</p>
		<dl class="mb-4 space-y-2">
			{#each QUALITIES as quality (quality.suffix)}
				<div>
					<dt class="text-ink-soft">{quality.label}</dt>
					<dd class="flex flex-wrap gap-1.5">
						{#each roots as root (root)}
							<span class="ui-button px-2 py-0.5 font-mono text-sm">{root + quality.suffix}</span>
						{/each}
					</dd>
				</div>
			{/each}
		</dl>
		<p class="tip">
			Type them exactly like that, with a capital letter. Want the song in a different key? Don't
			rewrite it. Use the <b>Capo</b> box, or the <b>Key</b> menu above the chart.
		</p>
		<h3>A different bass note</h3>
		<p>
			Put <code>/</code> and a note after a chord to choose its bass note. <code>G/F#</code> is a G chord
			with F# in the bass. The guitar strums the chord as usual and plays that note on its bass strings,
			so you can walk the bass down from G to Em:
		</p>
		{@render example(`"Walk"|G,G/F#|Em,Em/D|C|D|`)}
	</section>

	<section id="phone">
		<h2>8. Writing on a phone</h2>
		<p>
			On a phone, tapping the box opens a <b>music keypad</b> instead of the normal keyboard. It has
			only the keys you need, so no hunting for <code>|</code>.
		</p>
		<ul class="mb-4 list-disc space-y-2 pl-6">
			<li>
				<b>A to G, #, b, m, 7, /</b>: tap out chords. Tap two chords in a row and the comma goes in
				for you.
			</li>
			<li>
				<b>New part</b>: starts a new line and lets you type the part's name with normal letters.
			</li>
			<li>
				<b>♪ Music keys</b>: when the name is done, tap this. The closing quote and the first
				<code>|</code> go in for you.
			</li>
			<li><b>Time</b>: waltz and crooked-bar settings, one tap each.</li>
			<li><b>as</b>: to play a part again.</li>
			<li><b>abc</b>: the normal keyboard, for anything else. <b>Done</b> closes the keypad.</li>
		</ul>
		<p class="tip">
			Prefer your phone's own keyboard? Tick <b>Use phone keyboard</b> above the box.
		</p>
	</section>

	<section id="mistakes">
		<h2>9. If something goes wrong</h2>
		<p>A red message appears under the box. The usual causes:</p>
		<ul class="mb-4 list-disc space-y-2 pl-6">
			<li>
				<b>Unknown chord</b>: a chord the guitar doesn't know yet, or a small letter (<code>g</code>
				instead of <code>G</code>).
			</li>
			<li>
				<b>Unknown section</b>: the name after <code>as</code> doesn't match a part above. Check the spelling
				and capitals.
			</li>
			<li>
				<b>More chords than beats</b>: too many chords for one bar, like 4 chords in a 3-beat bar.
			</li>
			<li>
				<b>Nothing plays</b>: the part name needs <b>double quotes</b> <code>"like this"</code>, not
				single ones.
			</li>
		</ul>
	</section>

	<section id="everything">
		<h2>10. Putting it all together</h2>
		{@render example(
			`"Verse"|G|G|C|G|\n"Chorus"|C|G|D,C|G|\n"Banjo Break" as Verse\n"Waltz Tag" [M:3/4] |C|G|[2/4]D|G|`
		)}
		<p class="tip">Copy any example on this page into the box and press Play to hear it.</p>
	</section>
</main>

<style>
	section {
		margin-bottom: 3rem;
		scroll-margin-top: 1.5rem;
	}

	h2 {
		margin-bottom: 0.75rem;
		font-size: 1.5rem;
		font-weight: 700;
	}

	h3 {
		margin: 1.5rem 0 0.5rem;
		font-weight: 700;
	}

	p {
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	code {
		border-radius: var(--corner-small);
		background: var(--color-surface);
		box-shadow: var(--shadow-inset-small);
		padding: 0.1rem 0.35rem;
		font-family: ui-monospace, monospace;
		font-size: 0.95em;
	}

	.tip {
		border-left: 4px solid var(--color-accent);
		border-radius: var(--corner-control);
		background: var(--color-surface);
		box-shadow: var(--shadow-raised-small);
		padding: 0.6rem 0.9rem;
		color: var(--color-ink-soft);
	}

	.example {
		margin-bottom: 1rem;
		overflow: hidden;
		border-radius: var(--corner-card);
		background: var(--color-surface);
		box-shadow: var(--shadow-raised);
	}

	.code {
		margin: 0;
		overflow-x: auto;
		background: var(--color-ink);
		padding: 0.75rem 1rem;
		font-family: ui-monospace, monospace;
		color: var(--color-surface);
	}

	.chart {
		display: flex;
		overflow-x: auto;
		padding: 1.75rem 1rem 0.75rem;
	}

	.bar {
		position: relative;
		display: flex;
		flex-shrink: 0;
		border-left: 2px solid var(--color-ink);
	}

	.bar.new-part {
		border-left: 6px double var(--color-ink);
	}

	.bar-label {
		position: absolute;
		top: -1.5rem;
		left: 0.25rem;
		display: flex;
		gap: 0.4rem;
		white-space: nowrap;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.part {
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-accent);
	}

	.meter {
		border-radius: var(--corner-small);
		background: var(--color-ink);
		padding: 0 0.3rem;
		font-family: ui-monospace, monospace;
		color: var(--color-surface);
	}

	.chord {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.25rem 0.4rem;
		white-space: nowrap;
	}

	.beats {
		font-family: ui-monospace, monospace;
		font-weight: 700;
		color: var(--color-ink-faint);
	}
</style>
