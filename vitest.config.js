import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: ['./tests/setup/vitest.setup.js'],
		include: ['tests/unit/**/*.spec.js'],
		clearMocks: true,
		restoreMocks: true
	},
	resolve: {
		extensions: ['.js', '.json'],
		alias: {
			'Utilities': path.resolve(__dirname, 'node_modules')
		}
	},
	define: {
		VERSION: JSON.stringify('4.14.3')
	}
});
