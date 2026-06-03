import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config.js';

export default defineConfig({
	...baseConfig,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		},
		{
			name: 'mobile-chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 390, height: 844 }
			}
		},
		{
			name: 'tablet-chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1024, height: 768 }
			}
		},
		{
			name: 'hidpi-chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 800, height: 600 },
				deviceScaleFactor: 2
			}
		}
	]
});
