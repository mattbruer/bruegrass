/**
 * Chords between an ABC tune and the arrangement, both ways.
 *
 * Both work from the tune as abcjs plays it (abcjs.synth.sequence): every
 * note and rest in play order, with repeats and 1st/2nd endings played out,
 * its place in the written score (`timing`) and its source element. Time is
 * in quarter notes from bar 1's downbeat, as in melody.js and timeline.js.
 *
 * - ABC → arrangement: read the chord symbols ("G", "Am7", …) bar by bar,
 *   cut the tune into sections where it repeats (A part, B part), and pick a
 *   capo so the chords fall on the guitar's shapes, the way a bluegrass
 *   player would (a tune in A is G shapes with capo 2).
 * - Arrangement → ABC: write the arrangement's chords (at concert pitch)
 *   into a tune that has none, on the note where each change lands. Repeated
 *   bars share one place in the score, so they can only show one chord.
 */
import shapes from './guitar-chords.json';
import { chordLabel, songKey } from './key.js';
import { barQuarters, slotPositions } from './timeline.js';

const EPSILON = 1e-6;
/** Capo positions tried when fitting chords to shapes. */
const MAX_CAPO = 7;
/** Shape keys a bluegrass guitarist reaches for first (with a capo). */
const HOME_SHAPES = ['G', 'C', 'D', 'Am', 'Em'];
/* Capo choice: a missing shape matters most, then a simplified chord, then playing out of a home shape, then a higher capo */
const COST_MISSING = 100;
const COST_SIMPLIFIED = 3;
const COST_AWAY_FROM_HOME = 10;
const COST_PER_FRET = 1;

/**
 * @typedef {{ t: number, src: number, length: number, startChar: number | undefined, chord: string | null }} Item
 *   one note or rest as played: t/src/length in quarters; chord: its chord symbol
 * @typedef {{ num: number, den: number }} AbcMeter
 * @typedef {{ start: number, length: number, meter: AbcMeter }} Measure
 */

/**
 * Walk one voice of abcjs's sequence.
 * @param {any[]} voice one entry of abcjs.synth.sequence(tune)
 */
function walk(voice) {
	/** @type {Item[]} */
	const items = [];
	/** @type {number[]} */
	const bars = [];
	/** @type {{ t: number, meter: AbcMeter }[]} */
	const meters = [{ t: 0, meter: { num: 4, den: 4 } }];
	let t = 0;

	for (const element of voice) {
		if (element.el_type === 'meter') {
			const meter = { num: Number(element.num), den: Number(element.den) };
			if (meters.at(-1)?.t === t) meters.pop();
			meters.push({ t, meter });
		} else if (element.el_type === 'bar') {
			bars.push(t);
		} else if (element.el_type === 'note') {
			const length = element.duration * 4;
			const chord = (element.chord ?? []).find(
				(/** @type {{ name: string, position?: string }} */ c) =>
					(!c.position || c.position === 'default') && isChordName(c.name)
			);
			items.push({
				t,
				src: element.timing * 4,
				length,
				startChar: element.elem?.startChar,
				chord: chord ? chord.name.trim() : null
			});
			t += length;
		}
	}

	// A pickup: music before the first bar line, less than a full bar
	const firstBar = bars.find((bar) => bar > EPSILON);
	const pickup =
		firstBar !== undefined && firstBar < quarters(meters[0].meter) - EPSILON ? firstBar : 0;
	return { items, bars, meters, end: t, pickup };
}

/** @param {string} name */
function isChordName(name) {
	return /^[A-G][#b]?[^\s"]*$/.test(name.trim());
}

/** @param {AbcMeter} meter */
function quarters(meter) {
	return (meter.num * 4) / meter.den;
}

/**
 * The voice to read chords from: the first with any chord symbols.
 * @param {any[][]} voices abcjs.synth.sequence(tune)
 */
function chordVoice(voices) {
	return (
		voices.find((voice) =>
			voice.some((element) =>
				(element.chord ?? []).some(
					(/** @type {{ name: string, position?: string }} */ c) =>
						(!c.position || c.position === 'default') && isChordName(c.name)
				)
			)
		) ?? null
	);
}

/**
 * Does the tune have chord symbols the arrangement can use?
 * @param {any[][]} voices abcjs.synth.sequence(tune)
 */
export function hasChords(voices) {
	return chordVoice(voices) !== null;
}

/**
 * The bars as played, from bar 1: a pickup is left out, and a short bar at
 * the end of a repeat joins the pickup that follows it into one full bar.
 * @param {ReturnType<typeof walk>} walked
 * @returns {Measure[]}
 */
function measures({ bars, meters, end, pickup }) {
	const meterAt = (/** @type {number} */ time) =>
		meters.filter((m) => m.t <= time + EPSILON).at(-1)?.meter ?? meters[0].meter;
	const lines = [...new Set([0, ...bars.filter((b) => b > EPSILON && b < end - EPSILON), end])];

	/** @type {(Measure & { short: boolean })[]} */
	const result = [];
	for (let i = 0; i + 1 < lines.length; i++) {
		const start = lines[i];
		const length = lines[i + 1] - start;
		if (length < EPSILON || start < pickup - EPSILON) continue;
		const meter = meterAt(start);
		const full = quarters(meter);
		const last = result.at(-1);
		if (
			last?.short &&
			length < full - EPSILON &&
			Math.abs(last.length + length - quarters(last.meter)) < EPSILON
		) {
			last.length += length;
			last.short = false;
			continue;
		}
		result.push({ start, length, meter, short: length < full - EPSILON });
	}
	// The last bar is short by the pickup: the arrangement plays it in full
	const final = result.at(-1);
	if (final?.short && pickup > 0) final.length = quarters(final.meter);

	return result.map(({ start, length, meter }) => ({ start: start - pickup, length, meter }));
}

/**
 * Where the tune starts again (a repeat, or a new part): times, from bar 1.
 * A jump back in the score is a repeat; the bar it jumps back to starts a
 * part, and so does the end of a repeated block (unless a 2nd ending
 * follows it).
 * @param {Item[]} items
 * @param {number} pickup
 */
function partStarts(items, pickup) {
	/** @type {{ t: number, from: number, to: number }[]} */
	const jumps = [];
	for (let i = 1; i < items.length; i++) {
		const from = items[i - 1].src + items[i - 1].length;
		if (Math.abs(items[i].src - from) > EPSILON)
			jumps.push({ t: items[i].t, from, to: items[i].src });
	}
	const back = jumps.filter((jump) => jump.to < jump.from);
	const landings = jumps.filter((jump) => jump.to > jump.from).map((jump) => jump.to);
	const marks = [
		...back.map((jump) => jump.to),
		...back
			.map((jump) => jump.from)
			.filter((from) => !landings.some((to) => Math.abs(to - from) < EPSILON))
	];
	const times = [
		...back.map((jump) => jump.t),
		...items
			.filter((item) => marks.some((mark) => Math.abs(item.src - mark) < EPSILON))
			.map((item) => item.t)
	]
		.map((time) => time - pickup)
		.filter((time) => time > EPSILON);
	return [...new Set(times)].sort((a, b) => a - b);
}

/**
 * Split a bar's beats into the fewest even slots (the arrangement's rule:
 * odd beats go to the earlier chords) that put every chord change on a slot.
 * @param {number} beats quarters in the bar
 * @param {{ offset: number, name: string }[]} changes offset in quarters from the bar line, sorted, first at 0
 */
function barSlots(beats, changes) {
	for (let n = 1; n <= beats; n++) {
		const base = Math.floor(beats / n);
		const extra = beats % n;
		const starts = Array.from({ length: n }, (_, i) => i * base + Math.min(i, extra));
		if (changes.every((change) => starts.includes(change.offset))) {
			return starts.map(
				(start) => changes.filter((change) => change.offset <= start).at(-1)?.name ?? ''
			);
		}
	}
	return changes.map((change) => change.name);
}

/**
 * The arrangement's time signature for an ABC one, if it has one.
 * @param {AbcMeter} meter
 * @returns {{ beats: number, unit: number } | null}
 */
function arrangementMeter(meter) {
	if (meter.den === 4 || meter.den === 2) return { beats: meter.num, unit: meter.den };
	const q = quarters(meter);
	return Number.isInteger(q) ? { beats: q, unit: 4 } : null;
}

/**
 * Concert chord names as the guitar's shapes with a capo, simplified
 * (Cmaj7 → C, Am7 → Am, G/B → G) where there's no shape for the full chord.
 * @param {string[]} names concert pitch
 * @param {number} capo
 */
function fitShapes(names, capo) {
	const key = songKey([{ measures: [[names[0]]] }]);
	/** @type {Map<string, { shape: string, simplified: boolean, missing: boolean }>} */
	const fitted = new Map();
	for (const name of new Set(names)) {
		const written = chordLabel(name, { key, shift: -capo, mode: 'concert' });
		const match = written.match(/^([A-G][#b]?)(.*?)(?:\/.*)?$/);
		const root = match?.[1] ?? written;
		const rest = match?.[2] ?? '';
		const minor = /^(m(?!aj)|min)/.test(rest);
		const candidates = [
			written.split('/')[0],
			root + (minor ? 'm' : '') + (/^m?7$/.test(rest) ? '7' : ''),
			root + (minor ? 'm' : '')
		];
		const shape = candidates.find((candidate) => candidate in shapes);
		fitted.set(name, {
			shape: shape ?? written,
			simplified: shape !== undefined && shape !== written,
			missing: shape === undefined
		});
	}
	return fitted;
}

/**
 * The capo that puts the tune's chords on the guitar's shapes best.
 * @param {string[]} names concert pitch, in play order
 */
function chooseCapo(names) {
	let best = { capo: 0, cost: Infinity, fitted: fitShapes(names, 0) };
	for (let capo = 0; capo <= MAX_CAPO; capo++) {
		const fitted = fitShapes(names, capo);
		const all = [...fitted.values()];
		const tonic = fitted.get(names[0])?.shape ?? '';
		const cost =
			COST_MISSING * all.filter((f) => f.missing).length +
			COST_SIMPLIFIED * all.filter((f) => f.simplified).length +
			(HOME_SHAPES.includes(tonic) ? 0 : COST_AWAY_FROM_HOME) +
			COST_PER_FRET * capo;
		if (cost < best.cost) best = { capo, cost, fitted };
	}
	return best;
}

/** @param {{ beats: number, unit: number }} meter */
const meterText = (meter) => `${meter.beats}/${meter.unit}`;

/**
 * An arrangement written from the tune's chord symbols.
 * @param {any[][]} voices abcjs.synth.sequence(tune)
 * @returns {{ text: string, capo: number, notes: string[] } | null} null when the
 *   tune has no chord symbols; notes: what the reader should know (simplified
 *   or missing chords, moved changes, time signatures)
 */
export function arrangementFromAbc(voices) {
	const voice = chordVoice(voices);
	if (!voice) return null;
	const walked = walk(voice);
	const { items, pickup } = walked;
	/** @type {string[]} */
	const notes = [];

	const changes = items
		.filter((item) => item.chord)
		.map((item) => ({ t: item.t - pickup, name: /** @type {string} */ (item.chord) }));
	const bars = measures(walked);
	const sectionStarts = partStarts(items, pickup);

	// Each bar's chords, at concert pitch
	let current = changes.find((change) => change.t <= EPSILON)?.name ?? changes[0].name;
	/** @type {{ section: number, meter: { beats: number, unit: number }, chords: string[] }[]} */
	const written = [];
	bars.forEach((bar, b) => {
		const inBar = [];
		for (const change of changes) {
			if (change.t < bar.start - EPSILON) current = change.name;
			else if (change.t < bar.start + bar.length - EPSILON) inBar.push(change);
		}
		/** @type {{ offset: number, name: string }[]} */
		const marks = [{ offset: 0, name: current }];
		for (const change of inBar) {
			const exact = change.t - bar.start;
			const offset = Math.min(Math.round(exact), Math.ceil(bar.length) - 1);
			if (Math.abs(offset - exact) > EPSILON) {
				notes.push(
					`Bar ${b + 1}: the change to ${change.name} isn't on a beat, so it's moved to beat ${offset + 1}.`
				);
			}
			marks.push({ offset, name: change.name });
			current = change.name;
		}
		// Later changes on the same beat win, and repeats of one chord merge
		const merged = marks
			.filter((mark, i) => !marks.slice(i + 1).some((later) => later.offset === mark.offset))
			.filter((mark, i, list) => i === 0 || list[i - 1].name !== mark.name);

		let meter = arrangementMeter(bar.meter);
		const beats = Math.round(bar.length);
		if (!meter) {
			notes.push(
				`Bar ${b + 1}: ${bar.meter.num}/${bar.meter.den} can't be played yet, so it's written as ${beats}/4.`
			);
			meter = { beats, unit: 4 };
		} else if (bar.meter.den !== meter.unit) {
			notes.push(
				`${bar.meter.num}/${bar.meter.den} is written as ${meterText(meter)}: the bars are the same length, but the guitar's rhythm won't have the ${bar.meter.num}/${bar.meter.den} lilt.`
			);
		}
		if (Math.abs(barQuarters(meter) - bar.length) > EPSILON) {
			// A bar that's short or long for its time signature (crooked tunes)
			meter = { beats, unit: 4 };
		}
		written.push({
			section: sectionStarts.filter((time) => time <= bar.start + EPSILON).length,
			meter,
			chords: barSlots(beats, merged)
		});
	});

	// Guitar shapes and capo
	const allNames = written.flatMap((bar) => bar.chords);
	const { capo, fitted } = chooseCapo(allNames);
	for (const [name, fit] of fitted) {
		if (fit.missing)
			notes.push(`There's no guitar shape for ${fit.shape} (${name}) yet, so it won't play.`);
		else if (fit.simplified)
			notes.push(`${name} is played as ${fit.shape} shape${capo ? ` with capo ${capo}` : ''}.`);
	}
	for (const bar of written) {
		bar.chords = bar.chords.map((name) => fitted.get(name)?.shape ?? name);
	}

	// Sections: one per part as played, lettered by where it starts in the score
	const sections = [...new Set(written.map((bar) => bar.section))].map((index) => {
		const sectionBars = written.filter((bar) => bar.section === index);
		const firstBar = bars[written.indexOf(sectionBars[0])];
		const first = items.find((item) => item.t - pickup >= firstBar.start - EPSILON);
		return { bars: sectionBars, src: first ? Math.round(first.src * 1000) : 0 };
	});
	const letters = [...new Set(sections.map((section) => section.src))];
	const name = (/** @type {number} */ src) => String.fromCharCode(65 + letters.indexOf(src));

	/** @type {string[]} */
	const lines = [];
	/** @type {Map<string, string>} */
	const firstOfName = new Map();
	let persistent = { beats: 4, unit: 4 };
	const flat = sections.flatMap((section) => section.bars);
	let index = 0;

	for (const section of sections) {
		const label = name(section.src);
		const signature = JSON.stringify(section.bars.map((bar) => [bar.meter, bar.chords]));
		if (firstOfName.get(label) === signature) {
			lines.push(`"${label}" as ${label}`);
			index += section.bars.length;
			continue;
		}
		const cells = section.bars.map((bar) => {
			const next = flat[index + 1];
			index++;
			const same = (/** @type {{ beats: number, unit: number }} */ m) =>
				m.beats === persistent.beats && m.unit === persistent.unit;
			let field = '';
			if (!same(bar.meter)) {
				if (next && same(next.meter)) field = `[${meterText(bar.meter)}]`;
				else {
					field = `[M:${meterText(bar.meter)}]`;
					persistent = bar.meter;
				}
			}
			return field + bar.chords.join(',');
		});
		if (!firstOfName.has(label)) firstOfName.set(label, signature);
		lines.push(`"${label}"|${cells.join('|')}|`);
	}

	return { text: lines.join('\n'), capo, notes: [...new Set(notes)] };
}

/**
 * The ABC with the arrangement's chords written in, at concert pitch.
 * @param {string} abc the tune, with no chord symbols of its own
 * @param {any[][]} voices abcjs.synth.sequence(tune) for that ABC
 * @param {import('./timeline.js').Section[]} sections the whole arrangement
 * @param {{ capo?: number }} options
 * @returns {{ abc: string, notes: string[] }}
 */
export function abcWithChords(abc, voices, sections, { capo = 0 } = {}) {
	const voice = voices[0] ?? [];
	const { items, pickup } = walk(voice);
	const slots = slotPositions(sections);
	const key = songKey(sections);
	/** @type {string[]} */
	const notes = [];
	if (slots.length === 0) return { abc, notes };
	const last = slots.at(-1);
	const end = last ? last.barStart + barQuarters(last.meter) : 0;

	const played = items
		.map((item) => ({ ...item, t: item.t - pickup }))
		.filter((item) => item.t >= -EPSILON && item.t < end - EPSILON && item.startChar !== undefined);
	const concert = (/** @type {string} */ name) =>
		chordLabel(name, { key, shift: capo, mode: 'concert' });
	const chordAt = (/** @type {number} */ time) =>
		slots.filter((slot) => slot.start <= time + EPSILON).at(-1)?.name ?? slots[0].name;
	/** @param {number} time */
	const where = (time) => {
		const slot = slots.filter((s) => s.barStart <= time + EPSILON).at(-1) ?? slots[0];
		return `bar ${slot.bar + 1}, beat ${Math.round(time - slot.barStart) + 1}`;
	};

	// Each chord change goes on the note (or rest) that starts with it
	/** @type {Map<number, string>} */
	const symbols = new Map();
	slots.forEach((slot, k) => {
		if (k > 0 && slots[k - 1].name === slot.name) return;
		const item = played.find((i) => i.t >= slot.start - EPSILON);
		if (!item || item.t >= slot.start + slot.length - EPSILON) {
			notes.push(
				`The ${concert(slot.name)} at ${where(slot.start)} can't be shown: the melody holds a note through it.`
			);
			return;
		}
		if (item.t > slot.start + EPSILON) {
			notes.push(
				`The ${concert(slot.name)} at ${where(slot.start)} is shown on the next note, as the melody holds a note through the change.`
			);
		}
		const startChar = /** @type {number} */ (item.startChar);
		if (!symbols.has(startChar)) symbols.set(startChar, slot.name);
	});

	// Repeated bars are written once, so they must have the same chords each time
	for (const item of played) {
		const symbol = symbols.get(/** @type {number} */ (item.startChar));
		const wanted = chordAt(item.t);
		if (symbol && symbol !== wanted) {
			notes.push(
				`At ${where(item.t)} the arrangement plays ${concert(wanted)}, but that bar repeats one where it plays ${concert(symbol)}; the music shows ${concert(symbol)}.`
			);
		}
	}

	let result = abc;
	for (const [startChar, name] of [...symbols].sort((a, b) => b[0] - a[0])) {
		result = `${result.slice(0, startChar)}"${concert(name)}"${result.slice(startChar)}`;
	}
	return { abc: result, notes: [...new Set(notes)] };
}
