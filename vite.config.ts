import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	root: '.',
	envDir: '.',
	envPrefix: 'VITE_',
	server: {
		open: true,
		port: 3001,
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
			},
		},
		sourcemap: true,
	},
});
