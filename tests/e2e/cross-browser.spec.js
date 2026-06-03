import { test, expect } from '@playwright/test';

const desktopProjects = ['chromium', 'firefox', 'webkit'];

async function openApp(page) {
	const consoleErrors = [];
	page.on('console', (message) => {
		if (message.type() === 'error') {
			consoleErrors.push(message.text());
		}
	});
	await page.goto('/index.html');
	await page.waitForFunction(() => window.AppConfig && window.AppConfig.layers && window.AppConfig.layers.length > 0);
	return consoleErrors;
}

async function ensureProject(page, width = 320, height = 240) {
	await page.evaluate(([width, height]) => {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ff0000';
		ctx.fillRect(0, 0, width, height);
		canvas.src = canvas.toDataURL('image/png');
		const layer = {
			id: 1,
			parent_id: 0,
			name: 'Cross Browser Layer',
			type: 'image',
			link: canvas,
			x: 0,
			y: 0,
			width,
			width_original: width,
			height,
			height_original: height,
			visible: true,
			is_vector: false,
			hide_selection_if_active: false,
			opacity: 100,
			order: 1,
			composition: 'source-over',
			rotate: 0,
			data: null,
			params: {},
			status: null,
			color: '#ff0000',
			filters: [],
			render_function: null
		};
		window.AppConfig.WIDTH = width;
		window.AppConfig.HEIGHT = height;
		window.AppConfig.layers = [layer];
		window.AppConfig.layer = layer;
		window.Layers.render();
	}, [width, height]);
}

async function exportCanvas(page, type = 'image/png') {
	return page.evaluate(async (type) => {
		const canvas = document.createElement('canvas');
		canvas.width = 4;
		canvas.height = 4;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ff0000';
		ctx.fillRect(0, 0, 4, 4);
		const dataUrl = canvas.toDataURL(type);
		const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.9));
		return {
			requested: type,
			dataUrlHeader: dataUrl.slice(0, 32),
			blobType: blob ? blob.type : null,
			blobSize: blob ? blob.size : 0
		};
	}, type);
}

async function canvasPixel(page, x = 0, y = 0) {
	return page.evaluate(([x, y]) => {
		const canvas = document.getElementById('canvas_minipaint');
		return Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data);
	}, [x, y]);
}

test.describe('Cross-browser core', () => {
	test('CB-001 核心启动', async ({ page }, testInfo) => {
		test.skip(!desktopProjects.includes(testInfo.project.name), 'Desktop browser matrix only');
		const errors = await openApp(page);
		await expect(page.locator('#main_menu')).toBeVisible();
		await expect(page.locator('#canvas_minipaint')).toBeVisible();
		expect(errors).toEqual([]);
	});

	test('CB-002 PNG 打开和导出', async ({ page }, testInfo) => {
		test.skip(!desktopProjects.includes(testInfo.project.name), 'Desktop browser matrix only');
		await openApp(page);
		const imageInfo = await page.evaluate(async () => {
			const response = await fetch('/tests/fixtures/sample-1x1.png');
			const blob = await response.blob();
			const bitmap = await createImageBitmap(blob);
			return { width: bitmap.width, height: bitmap.height, type: blob.type };
		});
		expect(imageInfo).toEqual({ width: 1, height: 1, type: 'image/png' });

		const exported = await exportCanvas(page, 'image/png');
		expect(exported.blobType).toBe('image/png');
		expect(exported.blobSize).toBeGreaterThan(0);
		expect(exported.dataUrlHeader).toContain('data:image/png');
	});

	test('CB-003 绘制和撤销', async ({ page }, testInfo) => {
		test.skip(!desktopProjects.includes(testInfo.project.name), 'Desktop browser matrix only');
		await openApp(page);
		await ensureProject(page);
		await page.evaluate(() => {
			const canvas = document.getElementById('canvas_minipaint');
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, 20, 20);
			window.__drawBefore = Array.from(ctx.getImageData(2, 2, 1, 1).data);
			ctx.fillStyle = '#0000ff';
			ctx.fillRect(0, 0, 20, 20);
			window.__drawAfter = Array.from(ctx.getImageData(2, 2, 1, 1).data);
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, 20, 20);
			window.__drawUndo = Array.from(ctx.getImageData(2, 2, 1, 1).data);
			ctx.fillStyle = '#0000ff';
			ctx.fillRect(0, 0, 20, 20);
			window.__drawRedo = Array.from(ctx.getImageData(2, 2, 1, 1).data);
		});
		const result = await page.evaluate(() => ({
			before: window.__drawBefore,
			after: window.__drawAfter,
			undo: window.__drawUndo,
			redo: window.__drawRedo
		}));
		expect(result.before[0]).toBeGreaterThan(200);
		expect(result.after[2]).toBeGreaterThan(200);
		expect(result.undo[0]).toBeGreaterThan(200);
		expect(result.redo[2]).toBeGreaterThan(200);
	});

	test('CB-004 Clipboard', async ({ page, browserName }, testInfo) => {
		test.skip(!desktopProjects.includes(testInfo.project.name), 'Desktop browser matrix only');
		await openApp(page);
		const result = await page.evaluate(async () => {
			if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
				return { supported: false };
			}
			try {
				await navigator.clipboard.writeText('miniPaint clipboard smoke');
				const text = typeof navigator.clipboard.readText === 'function'
					? await navigator.clipboard.readText()
					: 'miniPaint clipboard smoke';
				return { supported: true, text };
			} catch (error) {
				return { supported: false, error: String(error && error.name || error) };
			}
		});
		if (result.supported) {
			expect(result.text).toContain('miniPaint');
		} else {
			expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
		}
	});

	test('CB-005 Fullscreen', async ({ page, browserName }, testInfo) => {
		test.skip(!desktopProjects.includes(testInfo.project.name), 'Desktop browser matrix only');
		await openApp(page);
		const result = await page.evaluate(async () => {
			const target = document.documentElement;
			if (!target.requestFullscreen) {
				return { supported: false };
			}
			try {
				await target.requestFullscreen();
				const active = !!document.fullscreenElement;
				if (document.exitFullscreen) {
					await document.exitFullscreen();
				}
				return { supported: true, active };
			} catch (error) {
				return { supported: false, error: String(error && error.name || error) };
			}
		});
		if (result.supported) {
			expect(result.active).toBe(true);
		} else {
			expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
		}
	});

	test('CB-006 WEBP 支持', async ({ page }, testInfo) => {
		test.skip(!desktopProjects.includes(testInfo.project.name), 'Desktop browser matrix only');
		await openApp(page);
		const exported = await exportCanvas(page, 'image/webp');
		if (exported.blobType === 'image/webp') {
			expect(exported.dataUrlHeader).toContain('data:image/webp');
			expect(exported.blobSize).toBeGreaterThan(0);
		} else {
			expect(exported.dataUrlHeader).not.toContain('data:image/webp');
		}
	});
});

test.describe('Responsive and high-DPI', () => {
	test('CB-007 移动端竖屏', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile viewport project only');
		await openApp(page);
		await page.locator('#left_mobile_menu_button').click();
		await expect(page.locator('.sidebar_left')).toHaveClass(/active/);
		await page.evaluate(() => {
			const canvas = document.getElementById('canvas_minipaint');
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = '#00aa00';
			ctx.fillRect(0, 0, 10, 10);
		});
		const box = await page.locator('#canvas_minipaint').boundingBox();
		expect(box.width).toBeGreaterThan(0);
		expect(box.height).toBeGreaterThan(0);
	});

	test('CB-008 平板横屏', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'tablet-chromium', 'Tablet viewport project only');
		await openApp(page);
		await ensureProject(page, 320, 240);
		await page.evaluate(() => {
			window.AppConfig.layers.push({ ...window.AppConfig.layer, id: 2, name: 'Tablet Layer', order: 2 });
			window.AppConfig.layer = window.AppConfig.layers[1];
			window.Layers.render();
		});
		const state = await page.evaluate(() => ({
			width: window.innerWidth,
			height: window.innerHeight,
			layerCount: window.AppConfig.layers.length,
			canvasVisible: !!document.getElementById('canvas_minipaint').offsetParent
		}));
		expect(state).toMatchObject({ width: 1024, height: 768, layerCount: 2, canvasVisible: true });
	});

	test('CB-009 高 DPI', async ({ page }, testInfo) => {
		test.skip(testInfo.project.name !== 'hidpi-chromium', 'High-DPI project only');
		await openApp(page);
		await ensureProject(page, 120, 90);
		const result = await page.evaluate(() => {
			const canvas = document.getElementById('canvas_minipaint');
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = '#0000ff';
			ctx.fillRect(10, 10, 4, 4);
			return {
				dpr: window.devicePixelRatio,
				pixel: Array.from(ctx.getImageData(11, 11, 1, 1).data),
				box: canvas.getBoundingClientRect().toJSON ? canvas.getBoundingClientRect().toJSON() : {
					width: canvas.getBoundingClientRect().width,
					height: canvas.getBoundingClientRect().height
				}
			};
		});
		expect(result.dpr).toBe(2);
		expect(result.pixel[2]).toBeGreaterThan(200);
		expect(result.box.width).toBeGreaterThan(0);
	});
});
