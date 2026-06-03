import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
	await page.waitForFunction(() => window.AppConfig && window.Layers && window.AppConfig.layers.length > 0);
	return runtime;
}

async function openMainMenuWithKeyboard(page) {
	await page.keyboard.press('Tab');
	await page.keyboard.press('Enter');
	await expect(page.locator('#main_menu_0_0')).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('.menu_dropdown').first()).toBeVisible();
}

async function openNewDialog(page) {
	await page.locator('#main_menu_0_0').click();
	await page.locator('#main_menu_1_0').click();
	await expect(page.locator('#popups .popup')).toBeVisible();
	await expect(page.locator('#popups .popup [data-id="popup_title"]')).toContainText('New');
}

async function runThemeAxe(page, theme) {
	await page.evaluate((theme) => {
		document.body.classList.remove('theme-light', 'theme-green');
		if (theme !== 'dark') {
			document.body.classList.add(`theme-${theme}`);
		}
	}, theme);
	return new AxeBuilder({ page })
		.include('body')
		.exclude('#canvas_minipaint')
		.exclude('.preview_canvas_left')
		.exclude('.preview_canvas_post')
		.exclude('.preview_canvas_post_back')
		.withTags(['wcag2a', 'wcag2aa'])
		.analyze();
}

test.describe('Accessibility and keyboard tests', () => {
	test('A11Y-001 菜单键盘访问', async ({ page }) => {
		const runtime = await openApp(page);
		await openMainMenuWithKeyboard(page);
		const focused = await page.evaluate(() => ({
			id: document.activeElement.id,
			outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
			boxShadow: getComputedStyle(document.activeElement).boxShadow,
			backgroundColor: getComputedStyle(document.activeElement).backgroundColor
		}));
		expect(focused.id).toBe('main_menu_1_0');
		expect(
			focused.outlineStyle !== 'none' ||
			focused.boxShadow !== 'none' ||
			focused.backgroundColor !== 'rgba(0, 0, 0, 0)'
		).toBe(true);
		await page.keyboard.press('ArrowDown');
		expect(await page.evaluate(() => document.activeElement.id)).toBe('main_menu_1_2');
		await page.keyboard.press('ArrowRight');
		expect(await page.evaluate(() => document.activeElement.id)).toBe('main_menu_2_0');
		await expect(page.locator('.menu_dropdown')).toHaveCount(2);
		await page.keyboard.press('Escape');
		expect(await page.evaluate(() => document.activeElement.id)).toBe('main_menu_1_2');
		await page.keyboard.press('Escape');
		await expect(page.locator('.menu_dropdown')).toHaveCount(0);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('A11Y-002 弹窗焦点', async ({ page }) => {
		const runtime = await openApp(page);
		await openNewDialog(page);
		const focusInDialog = await page.evaluate(() => {
			const popup = document.querySelector('#popups .popup');
			return popup.contains(document.activeElement);
		});
		expect(focusInDialog).toBe(true);
		await page.keyboard.press('Escape');
		await expect(page.locator('#popups .popup')).toHaveCount(0);
		await openNewDialog(page);
		await page.locator('#popups .popup [data-id="popup_cancel"]').click();
		await expect(page.locator('#popups .popup')).toHaveCount(0);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('A11Y-003 按钮可读名称', async ({ page }) => {
		await openApp(page);
		const unnamedButtons = await page.evaluate(() => {
			const hidden = (button) => button.offsetParent === null || button.hidden || button.getAttribute('aria-hidden') === 'true';
			const ariaLabelledByText = (button) => {
				const ids = (button.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
				return ids.map((id) => document.getElementById(id)?.textContent || '').join(' ').trim();
			};
			return Array.from(document.querySelectorAll('button, input[type="button"]'))
				.filter((button) => !hidden(button))
				.map((button) => ({
					id: button.id,
					className: button.className,
					text: button.textContent.trim(),
					value: button.value || '',
					title: button.getAttribute('title') || '',
					ariaLabel: button.getAttribute('aria-label') || '',
					ariaLabelledBy: ariaLabelledByText(button)
				}))
				.filter((button) => ![
					button.text,
					button.value,
					button.title,
					button.ariaLabel,
					button.ariaLabelledBy
				].some((value) => value && value.trim().length > 0));
		});
		expect(unnamedButtons).toEqual([]);
	});

	test('A11Y-004 颜色对比', async ({ page }) => {
		await openApp(page);
		const darkResults = await runThemeAxe(page, 'dark');
		const lightResults = await runThemeAxe(page, 'light');
		const contrastViolations = [...darkResults.violations, ...lightResults.violations]
			.filter((violation) => violation.id === 'color-contrast');
		expect(contrastViolations).toEqual([]);
	});

	test('A11Y-005 快捷键说明', async ({ page }) => {
		const runtime = await openApp(page);
		await page.locator('#main_menu_0_7').click();
		await page.locator('#main_menu_1_0').click();
		await expect(page.locator('#popups .popup')).toBeVisible();
		await expect(page.locator('#popups .popup [data-id="popup_title"]')).toContainText('Keyboard Shortcuts');
		const shortcutState = await page.evaluate(() => {
			const popup = document.querySelector('#popups .popup');
			return {
				text: popup.textContent,
				rows: popup.querySelectorAll('[data-id="params_content"] .item, [data-id="params_content"] > *').length
			};
		});
		expect(shortcutState.text).toContain('Ctrl');
		expect(shortcutState.text).toContain('Undo');
		expect(shortcutState.rows).toBeGreaterThan(0);
		expect(runtime.pageErrors).toEqual([]);
	});
});
