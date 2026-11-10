/**
 * App settings: one reactive object, shared by the Settings panel and the
 * pages, and remembered in this browser (localStorage).
 *
 * To add a setting:
 *   1. give it a default in `settings` below (grouped by Settings tab),
 *   2. show it in the matching tab in ./tabs/.
 * Saving and loading pick it up automatically.
 *
 * Call loadSettings() once the app is running in the browser (the root
 * layout does this).
 */
import { DEFAULT_APPEARANCE } from '$lib/theme/theme.js';
import { DEFAULT_BASS_STYLE } from '$lib/arranger/instruments/bassStyles.js';

/** Where settings are kept in localStorage. src/app.html reads it too (for the theme). */
export const SETTINGS_STORAGE_KEY = 'bruegrass.settings';

/** Where the keypad choice lived before there was a Settings panel. */
const OLD_KEYPAD_STORAGE_KEY = 'arranger.phoneKeyboard';

export const settings = $state({
	// General tab

	/** Show tooltips (a short summary of what each control does). */
	showTips: true,

	/** On touch screens, type arrangements with the music keypad (else the phone's keyboard). */
	musicKeypad: true,

	/** How the arranger shows chords: guitar shapes, concert, roman or nashville (see key.js). */
	chordDisplay: /** @type {import('$lib/arranger/chart/key.js').ChordDisplay} */ ('shapes'),

	/** How the band's own bass line plays: an id in BASS_STYLES (instruments/bassStyles.js). */
	bassStyle: DEFAULT_BASS_STYLE,

	/** Which view the mixer's master visualiser shows. */
	scopeView: /** @type {'waveform' | 'spectrum' | 'stereo'} */ ('spectrum'),

	// Metronome: set from the menu beside its button on the arranger's bar

	/** The metronome: its sound, level (dB, before the output) and meter when playing alone. */
	metronome: {
		sound: 'woodblock',
		level: -14,
		beats: 4,
		unit: 4
	},

	// Recording along: set from the record panel

	recording: {
		/** Bars of clicks before bar 1 (the melody's pickup is sung in the last of them). */
		countInBars: 2
	},

	// The arranger page: set from its player card

	/** Whether the page shows the chords scrolling past or the sheet music (see musicView.js). */
	musicView: /** @type {import('$lib/arranger/components/page/musicView.js').MusicView} */ (
		'sheet'
	),

	// The lyric chart: set from its page

	chart: {
		/** The chart's text scale, or 0 for the largest that fits the song on one page. */
		textSize: 0
	},

	// Appearance tab

	/** Colours, shadow depth and corner roundness (see $lib/theme). */
	appearance: /** @type {import('$lib/theme/theme.js').Appearance} */ ({ ...DEFAULT_APPEARANCE })
});

let alreadyLoaded = false;

/** Read saved settings, then keep saving every change. Safe to call more than once. */
export function loadSettings() {
	if (alreadyLoaded) return;
	alreadyLoaded = true;

	restoreSavedSettings();
	saveSettingsWheneverTheyChange();
}

function restoreSavedSettings() {
	try {
		const oldKeypadChoice = localStorage.getItem(OLD_KEYPAD_STORAGE_KEY);
		if (oldKeypadChoice) settings.musicKeypad = oldKeypadChoice !== 'off';

		const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
		copyMatchingValues(saved, settings);
	} catch {
		// Storage unavailable (private browsing) or unreadable: keep the defaults
	}
}

function saveSettingsWheneverTheyChange() {
	// Never torn down, on purpose: settings are saved for the life of the page (set up once)
	$effect.root(() => {
		$effect(() => {
			const everySetting = JSON.stringify(settings); // reading every setting makes this rerun on any change
			try {
				localStorage.setItem(SETTINGS_STORAGE_KEY, everySetting);
			} catch {
				// Storage unavailable: choices last for this visit
			}
		});
	});
}

/**
 * Copy saved values onto the settings, but only where the saved value has
 * the same type as the default. A setting saved by an older version of the
 * app (or a damaged one) can't break anything; it's just ignored.
 * @param {any} saved
 * @param {Record<string, any>} target
 */
function copyMatchingValues(saved, target) {
	if (!saved || typeof saved !== 'object') return;

	for (const name of Object.keys(target)) {
		const savedValue = saved[name];
		const defaultValue = target[name];

		const isSection = defaultValue && typeof defaultValue === 'object';
		if (isSection) {
			copyMatchingValues(savedValue, defaultValue);
		} else if (typeof savedValue === typeof defaultValue) {
			target[name] = savedValue;
		}
	}
}
