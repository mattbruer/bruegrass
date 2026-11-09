/**
 * The user's appearance choices, applied to the page.
 *
 * The five choices map one-to-one onto the CSS variables at the top of
 * tokens.css. Applying a theme just sets those variables on <html>; the
 * CSS works out everything else.
 *
 * Note: src/app.html has a tiny copy of `applyTheme` that runs before the
 * page first paints (so a dark theme doesn't flash light on load). If you
 * add a choice here, add it there too.
 */

/**
 * @typedef {{
 *   background: string,
 *   text: string,
 *   accent: string,
 *   depth: number,
 *   roundness: number
 * }} Appearance colours are #rrggbb; depth and roundness are 0–2 (1 = normal)
 */

/** The look the app ships with, Night (the same values as tokens.css). */
export const DEFAULT_APPEARANCE = Object.freeze({
	background: '#2b2f37',
	text: '#e7e9ee',
	accent: '#f5a524',
	depth: 1,
	roundness: 1
});

/** Ready-made looks, offered in Settings → Appearance. */
export const APPEARANCE_PRESETS = Object.freeze([
	{
		name: 'Morning',
		appearance: {
			background: '#e4e9f0',
			text: '#283041',
			accent: '#d97706',
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
	depth: '--theme-depth',
	roundness: '--theme-roundness'
};

/**
 * Put appearance choices on the page.
 * @param {Appearance} appearance
 */
export function applyTheme(appearance) {
	const root = document.documentElement;
	for (const [choice, variable] of Object.entries(CSS_VARIABLE_FOR)) {
		root.style.setProperty(variable, String(appearance[/** @type {keyof Appearance} */ (choice)]));
	}
	// Tell the browser whether the page is light or dark, so its own controls
	// (the audio player, dropdown menus, scroll bars) match
	root.style.colorScheme = isDark(appearance.background) ? 'dark' : 'light';
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
