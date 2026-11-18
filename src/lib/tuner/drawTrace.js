/**
 * The glowing trace: the last few seconds of pitch as a line flowing down
 * the screen, newest at the top, over a grid that flows with it. Its colour
 * says how far off you are (green in tune, amber close, red far); it casts
 * a shadow and glows, with two faint echoes swaying behind it.
 */

export const SECONDS_SHOWN = 4;
/** Within this many cents is in tune (green); within CLOSE, amber; beyond, red. */
export const IN_TUNE = 2;
const CLOSE = 10;
/** Cents from the middle to each edge. */
const SPAN = 50;
const GRID_CENTS = 10;
const GRID_SECONDS = 0.5;
const LINE_WIDTH = 3.5;
const GLOW = 14;
const ECHO_SWAY = 4;

/**
 * @typedef {{ screen: string, grid: string, inTune: string, close: string, far: string }} TraceColours
 * @typedef {{ width: number, height: number, top: number, sway: boolean }} TraceFrame
 * top: where the newest point sits (below the note); sway: the echoes move (off with reduced motion)
 */

/** @param {number} cents @param {TraceColours} colours */
export function colourFor(cents, colours) {
	const off = Math.abs(cents);
	return off < IN_TUNE ? colours.inTune : off < CLOSE ? colours.close : colours.far;
}

/**
 * @param {CanvasRenderingContext2D} g
 * @param {TraceFrame} frame
 * @param {{ time: number, cents: number | null }[]} points newest first
 * @param {number} now seconds
 * @param {TraceColours} colours
 */
export function drawTrace(g, frame, points, now, colours) {
	const { width, height, top } = frame;
	const x = (/** @type {number} */ cents) =>
		width / 2 + (Math.max(-SPAN, Math.min(SPAN, cents)) * (width / 2 - 14)) / SPAN;
	const y = (/** @type {number} */ time) => top + ((now - time) / SECONDS_SHOWN) * (height - top);

	g.fillStyle = colours.screen;
	g.fillRect(0, 0, width, height);
	drawGrid(g, frame, now, colours, x, y);

	const age = (/** @type {number} */ time) => (now - time) / SECONDS_SHOWN;
	for (const echo of [2, 1]) {
		const sway = (/** @type {number} */ time) =>
			frame.sway ? Math.sin(now * 2.2 + age(time) * 9 + echo) * ECHO_SWAY * echo : echo * 2;
		strokeLine(
			g,
			points,
			(p) => x(p.cents) + sway(p.time),
			(p) => y(p.time),
			{
				width: (p) => LINE_WIDTH * (2 + echo * 1.5) * (1 - age(p.time) * 0.5),
				alpha: (p) => 0.16 * (1 - age(p.time)),
				colour: (p) => colourFor(p.cents, colours)
			}
		);
	}

	// Depth: the line's shadow on the screen, then the line glowing above it
	g.save();
	g.shadowColor = 'rgba(0, 0, 0, 0.55)';
	g.shadowBlur = 8;
	g.shadowOffsetX = 4;
	g.shadowOffsetY = 7;
	strokeLine(
		g,
		points,
		(p) => x(p.cents),
		(p) => y(p.time),
		{
			width: (p) => LINE_WIDTH * (1 - age(p.time) * 0.55),
			alpha: (p) => 1 - age(p.time) * 0.85,
			colour: (p) => colourFor(p.cents, colours)
		}
	);
	g.restore();
	g.save();
	g.shadowBlur = GLOW;
	strokeLine(
		g,
		points,
		(p) => x(p.cents),
		(p) => y(p.time),
		{
			width: (p) => LINE_WIDTH * 0.6 * (1 - age(p.time) * 0.55),
			alpha: (p) => 1 - age(p.time) * 0.85,
			colour: (p) => colourFor(p.cents, colours),
			glow: true
		}
	);
	g.restore();

	drawHead(g, points[0], x, y, colours);
}

/**
 * Lines a cent apart every GRID_CENTS, the in-tune lane down the middle,
 * and lines across every half second that flow down with the trace.
 * @param {CanvasRenderingContext2D} g
 * @param {TraceFrame} frame
 * @param {number} now
 * @param {TraceColours} colours
 * @param {(cents: number) => number} x
 * @param {(time: number) => number} y
 */
function drawGrid(g, { width, height, top }, now, colours, x, y) {
	g.save();
	g.globalAlpha = 0.12;
	g.fillStyle = colours.inTune;
	g.fillRect(x(-IN_TUNE), top, x(IN_TUNE) - x(-IN_TUNE), height - top);

	g.lineWidth = 1;
	g.strokeStyle = colours.grid;
	for (let cents = -SPAN + GRID_CENTS; cents < SPAN; cents += GRID_CENTS) {
		g.globalAlpha = cents === 0 ? 0 : 0.22;
		line(g, x(cents), top, x(cents), height);
	}
	g.globalAlpha = 0.55;
	g.strokeStyle = colours.inTune;
	line(g, x(0), top, x(0), height);

	g.strokeStyle = colours.grid;
	const newest = Math.floor(now / GRID_SECONDS) * GRID_SECONDS;
	for (let time = newest; time > now - SECONDS_SHOWN; time -= GRID_SECONDS) {
		g.globalAlpha = 0.18 * (1 - (now - time) / SECONDS_SHOWN);
		line(g, 0, y(time), width, y(time));
	}
	g.restore();
}

/**
 * The trace as short segments, each its own width, alpha and colour; gaps where nothing was heard.
 * @param {CanvasRenderingContext2D} g
 * @param {{ time: number, cents: number | null }[]} points
 * @param {(p: { time: number, cents: number }) => number} px
 * @param {(p: { time: number, cents: number }) => number} py
 * @param {{ width: (p: any) => number, alpha: (p: any) => number, colour: (p: any) => string, glow?: boolean }} style
 */
function strokeLine(g, points, px, py, style) {
	g.lineCap = 'round';
	for (let i = 1; i < points.length; i++) {
		const from = points[i];
		const to = points[i - 1];
		if (from.cents === null || to.cents === null) continue;
		const colour = style.colour(to);
		g.globalAlpha = Math.max(0, style.alpha(to));
		g.lineWidth = Math.max(0.5, style.width(to));
		g.strokeStyle = colour;
		if (style.glow) g.shadowColor = colour;
		line(g, px(from), py(from), px(to), py(to));
	}
	g.globalAlpha = 1;
}

/**
 * A soft light where the newest point is.
 * @param {CanvasRenderingContext2D} g
 * @param {{ time: number, cents: number | null } | undefined} newest
 * @param {(cents: number) => number} x
 * @param {(time: number) => number} y
 * @param {TraceColours} colours
 */
function drawHead(g, newest, x, y, colours) {
	if (!newest || newest.cents === null) return;
	const cx = x(newest.cents);
	const cy = y(newest.time);
	const light = g.createRadialGradient(cx, cy, 0, cx, cy, 22);
	light.addColorStop(0, colourFor(newest.cents, colours));
	light.addColorStop(1, 'transparent');
	g.fillStyle = light;
	g.beginPath();
	g.arc(cx, cy, 22, 0, Math.PI * 2);
	g.fill();
}

/** @param {CanvasRenderingContext2D} g @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2 */
function line(g, x1, y1, x2, y2) {
	g.beginPath();
	g.moveTo(x1, y1);
	g.lineTo(x2, y2);
	g.stroke();
}
