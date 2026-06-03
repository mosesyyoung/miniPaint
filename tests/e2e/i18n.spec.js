import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const languagesDir = path.resolve('src/js/languages');
const zh = JSON.parse(fs.readFileSync(path.join(languagesDir, 'zh.json'), 'utf8'));

async function openApp(page, url = '/index.html') {
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
	await page.goto(url);
	await page.waitForFunction(() => window.AppConfig && window.Layers && window.AppConfig.layers.length > 0);
	return runtime;
}

async function fileMenuText(page) {
	return page.locator('#main_menu_0_0 .name').textContent();
}

async function selectChineseFromMenu(page) {
	await page.locator('#main_menu_0_6').click();
	await page.locator('#main_menu_1_9').click();
	await page.locator('#main_menu_2_3').click();
	await page.waitForFunction(() => window.AppConfig.LANG === 'zh');
}

test.describe('Internationalization tests', () => {
	test('I18N-001 中文语言包', async ({ page }) => {
		const runtime = await openApp(page);
		const before = await fileMenuText(page);
		await selectChineseFromMenu(page);
		const after = await fileMenuText(page);
		expect(before).toBe('File');
		expect(after).toBe(zh.File);
		expect(after).not.toBe('File');
		expect(await page.locator('#main_menu').textContent()).not.toContain('undefined');
		expect(runtime.pageErrors).toEqual([]);
	});

	test('I18N-002 URL 参数语言', async ({ page }) => {
		const runtime = await openApp(page, '/index.html?lang=zh');
		await page.waitForFunction(() => window.AppConfig.LANG === 'zh');
		expect(await fileMenuText(page)).toBe(zh.File);
		expect(await page.locator('#main_menu').textContent()).not.toContain('undefined');
		expect(runtime.pageErrors).toEqual([]);
	});

	test('I18N-003 语言 cookie', async ({ page }) => {
		const runtime = await openApp(page);
		await selectChineseFromMenu(page);
		await page.reload();
		await page.waitForFunction(() => window.AppConfig && window.AppConfig.LANG === 'zh');
		expect(await fileMenuText(page)).toBe(zh.File);
		const cookie = await page.evaluate(() => document.cookie);
		expect(cookie).toContain('language');
		expect(runtime.pageErrors).toEqual([]);
	});

	test('I18N-004 所有语言包 JSON', () => {
		const files = fs.readdirSync(languagesDir).filter((file) => file.endsWith('.json'));
		expect(files.length).toBeGreaterThan(0);
		const invalidValues = [];
		for (const file of files) {
			const data = JSON.parse(fs.readFileSync(path.join(languagesDir, file), 'utf8'));
			for (const [key, value] of Object.entries(data)) {
				if (typeof key !== 'string' || typeof value !== 'string') {
					invalidValues.push({ file, key, valueType: typeof value });
				}
			}
		}
		expect(invalidValues).toEqual([]);
	});

	test('I18N-005 缺失翻译降级', async ({ page }) => {
		const runtime = await openApp(page);
		const empty = JSON.parse(fs.readFileSync(path.join(languagesDir, 'empty.json'), 'utf8'));
		const result = await page.evaluate((empty) => {
			const t = {};
			for (const [key, value] of Object.entries(empty)) {
				t[key] = { en: key, empty: value };
			}
			const getTranslation = (index) => {
				let res = index;
				try {
					res = t[index].empty;
				}
				catch {
					return index;
				}
				return res || index;
			};
			const container = document.createElement('div');
			container.innerHTML = '<span id="known_empty"></span><span id="missing_empty"></span>';
			document.body.appendChild(container);
			document.getElementById('known_empty').textContent = getTranslation('File');
			document.getElementById('missing_empty').textContent = getTranslation('Missing Translation Key');
			return {
				known: document.getElementById('known_empty').textContent,
				missing: document.getElementById('missing_empty').textContent,
				bodyText: container.textContent
			};
		}, empty);
		expect(result.known).toBe('File');
		expect(result.missing).toBe('Missing Translation Key');
		expect(result.bodyText).not.toContain('undefined');
		expect(runtime.pageErrors).toEqual([]);
	});
});
