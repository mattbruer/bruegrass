/**
 * The user's appearance choices, applied to the page.
 *
 * The choices map one-to-one onto the CSS variables at the top of
 * tokens.css. Applying a theme just sets those variables on <html>; the
 * CSS works out everything else.
 *
 * Every variable applyTheme sets is also saved (`FIRST_PAINT_KEY`), and
 * src/app.html puts them back before the page first paints, so the theme
 * (and the colours worked out from it) never flash wrong on load.
 */

/**
 * @typedef {{
 *   background: string,
 *   text: string,
 *   accent: string,
 *   waveform: string,
 *   depth: number,
 *   roundness: number,
 *   dropShadows?: boolean
 * }} Appearance colours are #rrggbb; depth and roundness are 0–2 (1 = normal);
 *   dropShadows: 3D depth, things lifted off the page on big drop shadows (on unless false)
 */

/** The look the app ships with, Night (the same values as tokens.css). */
export const DEFAULT_APPEARANCE = Object.freeze({
	background: '#2b2f37',
	text: '#e7e9ee',
	accent: '#f5a524',
	waveform: '#7ee08a',
	depth: 1,
	roundness: 1,
	dropShadows: true
});

/** Ready-made looks, offered in Settings → Appearance. */
export const APPEARANCE_PRESETS = Object.freeze([
	{
		name: 'Morning',
		appearance: {
			background: '#e4e9f0',
			text: '#283041',
			accent: '#d97706',
			waveform: '#1d8a63',
			depth: 1,
			roundness: 1
		}
	},
	{ name: 'Night', appearance: DEFAULT_APPEARANCE },
	{
		name: 'Sage',
		appearance: {
			background: '#e2ebe3',
			text: '#24332a',
			accent: '#3f7d4f',
			waveform: '#2f5fa8',
			depth: 1,
			roundness: 1
		}
	},
	{
		name: 'Sand',
		appearance: {
			background: '#efe7da',
			text: '#3a3024',
			accent: '#b4530a',
			waveform: '#1d7a72',
			depth: 1,
			roundness: 1
		}
	},
	{
		name: 'Sky',
		appearance: {
			background: '#e1e9f4',
			text: '#1f2d40',
			accent: '#2563eb',
			waveform: '#1d8a63',
			depth: 1,
			roundness: 1
		}
	}
]);

/** Which CSS variable (in tokens.css) each choice sets. */
const CSS_VARIABLE_FOR = {
	background: '--theme-background',
	text: '--theme-text',
	accent: '--theme-accent',
	waveform: '--theme-waveform',
	depth: '--theme-depth',
	roundness: '--theme-roundness',
	dropShadows: '--theme-drop-shadows'
};

/**
 * Put appearance choices on the page.
 * @param {Appearance} appearance
 */
export function applyTheme(appearance) {
	/** @type {Record<string, string>} */
	const variables = {};
	for (const [choice, variable] of Object.entries(CSS_VARIABLE_FOR)) {
		variables[variable] = cssValue(appearance[/** @type {keyof Appearance} */ (choice)]);
	}
	// Tell the browser whether the page is light or dark, so its own controls
	// (the audio player, dropdown menus, scroll bars) match
	variables['color-scheme'] = isDark(appearance.background) ? 'dark' : 'light';
	Object.assign(variables, derivedColours(appearance.background));

	for (const [variable, value] of Object.entries(variables)) {
		document.documentElement.style.setProperty(variable, value);
	}
	rememberForFirstPaint(variables);
}

/**
 * A choice as CSS reads it: a switch is 1 or 0, so CSS can multiply by it.
 * @param {string | number | boolean | undefined} choice
 */
function cssValue(choice) {
	if (choice === undefined) return '1';
	if (typeof choice === 'boolean') return choice ? '1' : '0';
	return String(choice);
}

/** Read by src/app.html before the page first paints. */
const FIRST_PAINT_KEY = 'bruegrass.firstPaint';

/** @param {Record<string, string>} variables */
function rememberForFirstPaint(variables) {
	try {
		localStorage.setItem(FIRST_PAINT_KEY, JSON.stringify(variables));
	} catch {
		// No storage: the first paint uses tokens.css until the app applies the theme
	}
}

/**
 * Each derived colour: the background with its lightness (and chroma) moved,
 * and an optional alpha. Worked out here, not by CSS relative colours, because
 * desktop Safari misreads the hue in `oklch(from … c h)` (brown, not blue).
 * The same formulas sit in tokens.css as the fallback before this runs.
 */
const DERIVED_COLOURS = {
	'--shadow-light-edge': { lightness: 0.08, alpha: 0.9 },
	'--shadow-dark-edge': { lightness: -0.16, alpha: 0.75 },
	'--mixer-tray': { lightness: -0.08 },
	'--mixer-strip': { lightness: 0.045 },
	'--player-bar': { lightness: -0.14, chroma: 0.05 },
	'--color-surface-deep': { lightness: -0.04 },
	'--color-raised': { lightness: 0.06 },
	'--color-line': { lightness: -0.1 }
};

/**
 * @param {string} background #rrggbb
 * @returns {Record<string, string>} CSS variable → colour
 */
function derivedColours(background) {
	const [l, c, h] = hexToOklch(background);
	return Object.fromEntries(
		Object.entries(DERIVED_COLOURS).map(([variable, { lightness = 0, chroma = 0, alpha = 1 }]) => [
			variable,
			`oklch(${l + lightness} ${Math.max(0, c + chroma)} ${h}${alpha < 1 ? ` / ${alpha}` : ''})`
		])
	);
}

/**
 * A colour as OKLCH (Björn Ottosson's OKLab, the space CSS's oklch() uses).
 * @param {string} hex #rrggbb
 * @returns {[number, number, number]} lightness 0–1, chroma, hue in degrees
 */
export function hexToOklch(hex) {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const value = parseInt(hex.slice(i, i + 2), 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	const hue = (Math.atan2(bAxis, a) * 180) / Math.PI;
	return [lightness, Math.hypot(a, bAxis), (hue + 360) % 360];
}

/**
 * Is a colour dark (so text and controls on it should be light)?
 * @param {string} hex #rrggbb
 */
export function isDark(hex) {
	return relativeLuminance(hex) < 0.35;
}

/**
 * How readable one colour is on another: the WCAG contrast ratio, from 1
 * (no contrast) to 21 (black on white). Body text should be at least 4.5.
 * @param {string} foreground #rrggbb
 * @param {string} background #rrggbb
 */
export function contrastRatio(foreground, background) {
	const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
	const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
	return (lighter + 0.05) / (darker + 0.05);
}

/** The contrast WCAG asks for body text. */
export const READABLE_CONTRAST = 4.5;

/**
 * Perceived brightness of a colour, 0 (black) to 1 (white), as WCAG defines it.
 * @param {string} hex #rrggbb
 */
function relativeLuminance(hex) {
	const [red, green, blue] = [1, 3, 5].map((start) => {
		const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
		// Undo the sRGB curve to get the light actually emitted
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
