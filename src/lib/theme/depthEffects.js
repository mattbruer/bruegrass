/**
 * The 3D effects, each its own switch in Settings → Appearance.
 *
 * Each sets one CSS variable on the page, 1 when on and 0 when off, and the
 * CSS multiplies by it (a shadow's strength, a blur's size, a tilt's angle),
 * so a new effect is one entry here plus the CSS that reads its variable.
 */

export const DEPTH_EFFECTS = Object.freeze([
	{
		id: 'dropShadows',
		variable: '--theme-drop-shadows',
		label: '3D depth',
		description: 'Things float above the page on deep shadows, lit from above.'
	},
	{
		id: 'glass',
		variable: '--fx-glass',
		label: 'Frosted glass',
		description: 'Bars and menus blur what scrolls behind them.'
	},
	{
		id: 'glow',
		variable: '--fx-glow',
		label: 'Glow',
		description: 'Playheads and buttons that are on light up what’s around them.'
	},
	{
		id: 'springs',
		variable: '--fx-springs',
		label: 'Springy',
		description: 'Buttons squash when pressed and bounce back; panels pop in.'
	},
	{
		id: 'tilt',
		variable: '--fx-tilt',
		label: 'Tilt and sheen',
		description: 'Buttons tip toward the mouse and catch the light (computers only).'
	},
	{
		id: 'gloss',
		variable: '--fx-gloss',
		label: 'Gloss',
		description: 'Notes and waveforms look rounded and shiny, with shadows in their own colour.'
	},
	{
		id: 'litPage',
		variable: '--fx-lit-page',
		label: 'Lit page',
		description: 'A soft light from the top, darker at the edges.'
	},
	{
		id: 'blurBehind',
		variable: '--fx-blur-behind',
		label: 'Blur behind menus',
		description: 'The page softens behind an open menu or panel.'
	}
]);

/** Every effect on: the look the app ships with. */
export const ALL_EFFECTS_ON = Object.freeze(
	Object.fromEntries(DEPTH_EFFECTS.map((effect) => [effect.id, true]))
);
