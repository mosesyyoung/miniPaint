import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const fixtureDir = path.resolve('tests/fixtures');

function fixtureBuffer(name) {
	return fs.readFileSync(path.join(fixtureDir, name));
}

function fixtureText(name) {
	return fs.readFileSync(path.join(fixtureDir, name), 'utf8');
}

async function openApp(page) {
	const runtime = {
		consoleErrors: [],
		pageErrors: []
	};
	page.on('console', (message) => {
		if (message.type() === 'error') {
			runtime.consoleErrors.push(message.text());
		}
	});
	page.on('pageerror', (error) => {
		runtime.pageErrors.push(error.message);
	});
	await page.goto('/index.html');
	await page.waitForFunction(() => window.AppConfig && window.FileOpen && window.AppConfig.layers.length > 0);
	await page.evaluate(() => {
		window.__secXss = 0;
		window.__secAlerts = [];
		if (window.alertify && !window.alertify.__secWrapped) {
			const originalError = window.alertify.error.bind(window.alertify);
			window.alertify.error = (message, ...args) => {
				window.__secAlerts.push(String(message));
				return originalError(message, ...args);
			};
			window.alertify.__secWrapped = true;
		}
	});
	return runtime;
}

async function importBrowserFile(page, { bytes, name, type }) {
	await page.evaluate(async ({ bytes, name, type }) => {
		const file = new File([new Uint8Array(bytes)], name, { type, lastModified: Date.now() });
		await window.FileOpen.open_handler({ target: { files: [file] } });
	}, { bytes: Array.from(bytes), name, type });
}

async function domSecurityState(page) {
	return page.evaluate(() => ({
		xss: window.__secXss,
		alerts: window.__secAlerts || [],
		layerHtml: document.querySelector('#layers') ? document.querySelector('#layers').innerHTML : '',
		layerText: document.querySelector('#layers') ? document.querySelector('#layers').textContent : '',
		injectedNodes: document.querySelectorAll('#layers script, #layers img, #layers svg, #layers iframe').length,
		pageResponsive: !!document.querySelector('#canvas_minipaint')
	}));
}

test.describe('Security and exception tests', () => {
	test('SEC-001 XSS 文件名', async ({ page }) => {
		const runtime = await openApp(page);
		const name = 'x<img src=x onerror="window.__secXss=1">.png';
		await importBrowserFile(page, {
			bytes: fixtureBuffer('sample-1x1.png'),
			name,
			type: 'image/png'
		});
		await page.waitForFunction((name) => window.AppConfig.layers.some((layer) => layer.name === name), name);
		const state = await domSecurityState(page);
		expect(state.xss).toBe(0);
		expect(state.layerText).toContain(name);
		expect(state.layerHtml).toContain('&lt;img');
		expect(state.injectedNodes).toBe(0);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('SEC-002 XSS 图层名', async ({ page }) => {
		const runtime = await openApp(page);
		const name = '<svg onload="window.__secXss=1">Layer</svg>';
		await page.evaluate((name) => {
			window.AppConfig.layer.name = name;
			window.Layers.Base_gui.GUI_layers.render_layers();
		}, name);
		const state = await domSecurityState(page);
		expect(state.xss).toBe(0);
		expect(state.layerText).toContain(name);
		expect(state.layerHtml).toContain('&lt;svg');
		expect(state.injectedNodes).toBe(0);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('SEC-003 XSS JSON 文本层', async ({ page }) => {
		const runtime = await openApp(page);
		const json = JSON.parse(fixtureText('sample-layers.json'));
		const payload = '<img src=x onerror="window.__secXss=1">JSON Text';
		json.layers[1].name = '<script>window.__secXss=1</script>';
		json.layers[1].data = [[{ text: payload, meta: {} }]];
		json.layers[1].params = {
			boundary: 'box',
			kerning: 'metrics',
			halign: 'left',
			valign: 'top',
			text_direction: 'ltr',
			wrap_direction: 'ttb',
			wrap: 'word'
		};
		await page.evaluate(async (json) => {
			await window.FileOpen.load_json(json);
		}, json);
		const state = await domSecurityState(page);
		const activeText = await page.evaluate(() => window.AppConfig.layers.find((layer) => layer.type === 'text').data[0][0].text);
		expect(activeText).toBe(payload);
		expect(state.xss).toBe(0);
		expect(state.layerHtml).toContain('&lt;script');
		expect(state.injectedNodes).toBe(0);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('SEC-004 超大 Data URL', async ({ page }) => {
		const runtime = await openApp(page);
		const before = await page.evaluate(() => window.AppConfig.layers.length);
		await page.evaluate(() => {
			const dataUrl = `data:image/png;base64,${'A'.repeat(1024 * 1024)}`;
			window.FileOpen.file_open_data_url_handler(dataUrl);
		});
		await page.waitForTimeout(800);
		const state = await domSecurityState(page);
		const after = await page.evaluate(() => window.AppConfig.layers.length);
		expect(state.pageResponsive).toBe(true);
		expect(after).toBe(before);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('SEC-005 损坏 EXIF', async ({ page }) => {
		const runtime = await openApp(page);
		const original = fixtureBuffer('sample-photo.jpg');
		const corruptExif = Buffer.from([
			0xff, 0xe1, 0x00, 0x20,
			0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
			0x4d, 0x4d, 0xff, 0xff, 0xff, 0xff,
			0x00, 0x2a, 0x7f, 0xff, 0xff, 0xff,
			0x62, 0x61, 0x64, 0x2d, 0x65, 0x78,
			0x69, 0x66
		]);
		const bytes = Buffer.concat([original.subarray(0, 2), corruptExif, original.subarray(2)]);
		await importBrowserFile(page, {
			bytes,
			name: 'broken-exif.jpg',
			type: 'image/jpeg'
		});
		await page.waitForFunction(() => window.AppConfig.layers.some((layer) => layer.name === 'broken-exif.jpg'));
		const exif = await page.evaluate(() => window.AppConfig.layers.find((item) => item.name === 'broken-exif.jpg')._exif);
		expect(exif).toBeTruthy();
		expect(exif.general).toBeTruthy();
		expect(exif.exif).toBeDefined();
		expect(runtime.pageErrors).toEqual([]);
	});

	test('SEC-006 CORS 污染 canvas', async ({ page }) => {
		const runtime = await openApp(page);
		const before = await page.evaluate(() => window.AppConfig.layers.length);
		await page.evaluate(() => {
			window.FileOpen.file_open_url_handler({ url: 'http://localhost:8899/tests/fixtures/sample-1x1.png' });
		});
		await page.waitForTimeout(1000);
		const state = await domSecurityState(page);
		const after = await page.evaluate(() => window.AppConfig.layers.length);
		expect(state.pageResponsive).toBe(true);
		expect(after).toBe(before);
		expect(runtime.pageErrors).toEqual([]);
	});
});
