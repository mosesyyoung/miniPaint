import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30000,
	expect: {
		timeout: 5000
	},
	fullyParallel: false,
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL: 'http://127.0.0.1:8899',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command: 'npx http-server . -a 127.0.0.1 -p 8899 -c-1',
		url: 'http://127.0.0.1:8899/index.html',
		reuseExistingServer: !process.env.CI,
		timeout: 30000
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
