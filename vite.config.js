import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		// AudioWorklet processors must load from a real file: browsers (Safari
		// especially) don't reliably load worklet code from an inlined data: URL
		assetsInlineLimit: (file) => (/Processor\.js$/.test(file) ? false : undefined)
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Svelte Inspector (dev only): hold Option (Mac) / Alt (Windows) and click an element to open its source in the editor
			vitePlugin: {
				inspector: { toggleKeyCombo: 'alt' }
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	]
});
