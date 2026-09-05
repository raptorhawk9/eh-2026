import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		compilerOptions: {
			runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
		},
		typescript: {
			config: (config) => {
				config.include.push('../drizzle.config.ts');
			}
		}
	},
	preprocess: vitePreprocess()
};

export default config;
