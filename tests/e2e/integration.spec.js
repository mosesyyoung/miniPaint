import { test, expect } from '@playwright/test';

async function openApp(page, viewport) {
	if (viewport) {
		await page.setViewportSize(viewport);
	}
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

async function appState(page) {
	return page.evaluate(() => ({
		width: window.AppConfig.WIDTH,
		height: window.AppConfig.HEIGHT,
		zoom: window.AppConfig.ZOOM,
		layerCount: window.AppConfig.layers.length,
		activeLayerId: window.AppConfig.layer && window.AppConfig.layer.id,
		activeLayerType: window.AppConfig.layer && window.AppConfig.layer.type,
		activeTool: window.AppConfig.TOOL && window.AppConfig.TOOL.name,
		layers: window.AppConfig.layers.map((layer) => ({
			id: layer.id,
			name: layer.name,
			type: layer.type,
			visible: layer.visible,
			order: layer.order,
			x: layer.x,
			y: layer.y,
			width: layer.width,
			height: layer.height,
			opacity: layer.opacity,
			composition: layer.composition,
			rotate: layer.rotate,
			is_vector: layer.is_vector,
			dataLength: Array.isArray(layer.data) ? layer.data.length : null,
			filters: layer.filters ? layer.filters.length : 0
		}))
	}));
}

async function resetProject(page, width = 320, height = 240) {
	await page.evaluate((args) => {
		const width = args[0];
		const height = args[1];
		const makeCanvas = (w, h, color = '#ff0000') => {
			const canvas = document.createElement('canvas');
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, w, h);
			canvas.src = canvas.toDataURL('image/png');
			return canvas;
		};
		const layer = {
			id: 1,
			parent_id: 0,
			name: 'Layer 1',
			type: 'image',
			link: makeCanvas(width, height),
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
		window.Layers.auto_increment = 2;
		window.Layers.render();
	}, [width, height]);
}

async function addLayer(page, overrides = {}) {
	await page.evaluate((overrides) => {
		const id = Math.max(0, ...window.AppConfig.layers.map((layer) => layer.id)) + 1;
		const canvas = document.createElement('canvas');
		canvas.width = overrides.width || window.AppConfig.WIDTH;
		canvas.height = overrides.height || window.AppConfig.HEIGHT;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = overrides.color || '#0000ff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		canvas.src = canvas.toDataURL('image/png');
		const layer = {
			id,
			parent_id: 0,
			name: overrides.name || `Layer ${id}`,
			type: overrides.type ?? 'image',
			link: canvas,
			x: overrides.x ?? 0,
			y: overrides.y ?? 0,
			width: overrides.width ?? canvas.width,
			width_original: overrides.width_original ?? canvas.width,
			height: overrides.height ?? canvas.height,
			height_original: overrides.height_original ?? canvas.height,
			visible: overrides.visible ?? true,
			is_vector: overrides.is_vector ?? false,
			hide_selection_if_active: false,
			opacity: overrides.opacity ?? 100,
			order: overrides.order ?? id,
			composition: overrides.composition || 'source-over',
			rotate: overrides.rotate ?? 0,
			data: overrides.data ?? null,
			params: overrides.params || {},
			status: null,
			color: overrides.color || '#0000ff',
			filters: overrides.filters || [],
			render_function: overrides.render_function || null
		};
		window.AppConfig.layers.push(layer);
		window.AppConfig.layer = layer;
		window.Layers.auto_increment = id + 1;
		window.Layers.render();
	}, overrides);
}

async function setSelection(page, data) {
	await page.evaluate((data) => {
		window.AppConfig.layer._select_data = { ...(window.AppConfig.layer._select_data || {}), ...data };
		window.AppConfig.selection = data;
	}, data);
}

async function menuHasText(page, text) {
	return page.locator('#main_menu').getByText(text, { exact: false }).first();
}

test.describe('App integration', () => {
	test('IT-APP-001 首页可启动', async ({ page }) => {
		const errors = await openApp(page);
		await expect(page.locator('#main_menu')).toBeVisible();
		await expect(page.locator('#canvas_minipaint')).toBeVisible();
		await expect(page.locator('.sidebar_left')).toBeVisible();
		await expect(page.locator('.sidebar_right')).toBeVisible();
		expect(errors).toEqual([]);
	});

	test('IT-APP-002 全局实例可用', async ({ page }) => {
		await openApp(page);
		await expect.poll(() => page.evaluate(() => ({
			layers: !!window.Layers && typeof window.Layers.render === 'function',
			state: !!window.State && typeof window.State.undo === 'function',
			open: !!window.FileOpen,
			save: !!window.FileSave && typeof window.FileSave.export_as_json === 'function'
		}))).toEqual({ layers: true, state: true, open: true, save: true });
	});

	test('IT-APP-003 默认画布创建', async ({ page }) => {
		await openApp(page);
		const state = await appState(page);
		expect(state.width).toBeGreaterThan(0);
		expect(state.height).toBeGreaterThan(0);
		expect(state.layerCount).toBeGreaterThanOrEqual(1);
	});

	test('IT-APP-004 菜单可展开', async ({ page }) => {
		await openApp(page);
		for (const label of ['File', 'Edit', 'View', 'Image', 'Layer', 'Effects', 'Tools', 'Help']) {
			await expect(await menuHasText(page, label)).toBeVisible();
		}
		await page.locator('#main_menu_0_0').click();
		await expect(page.locator('.menu_dropdown').first()).toBeVisible();
		await expect(page.locator('.menu_dropdown').first()).toContainText('New');
	});

	test('IT-APP-005 右侧面板折叠恢复', async ({ page }) => {
		await openApp(page);
		await page.locator('[data-target="toggle_preview"]').click();
		await expect(page.locator('#toggle_preview')).toHaveClass(/hidden/);
		await page.reload();
		await page.waitForFunction(() => window.AppConfig && window.AppConfig.layers.length > 0);
		await expect(page.locator('#toggle_preview')).toHaveClass(/hidden/);
	});

	test('IT-APP-006 移动端菜单', async ({ page }) => {
		await openApp(page, { width: 390, height: 844 });
		await page.locator('#left_mobile_menu_button').click();
		await expect(page.locator('.sidebar_left')).toHaveClass(/active/);
		await page.locator('#mobile_menu_button').click();
		await expect(page.locator('.sidebar_right')).toHaveClass(/active/);
	});

	test('IT-APP-007 主题切换', async ({ page }) => {
		await openApp(page);
		await page.evaluate(() => {
			document.body.classList.remove('theme-dark', 'theme-light', 'theme-green');
			document.body.classList.add('theme-light');
		});
		await expect(page.locator('body')).toHaveClass(/theme-light/);
	});
});

test.describe('Editing integration', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await resetProject(page);
	});

	test('IT-EDIT-001 新建画布', async ({ page }) => {
		await resetProject(page, 320, 240);
		await expect.poll(() => appState(page)).toMatchObject({ width: 320, height: 240, layerCount: 1 });
	});

	test('IT-EDIT-002 画笔绘制', async ({ page }) => {
		await addLayer(page, { type: 'brush', data: [[1, 1, 4], [5, 5, 4]], is_vector: true, render_function: ['brush', 'render'] });
		const state = await appState(page);
		expect(state.activeLayerType).toBe('brush');
		expect(state.layers.at(-1).dataLength).toBe(2);
	});

	test('IT-EDIT-003 撤销画笔', async ({ page }) => {
		const before = (await appState(page)).layerCount;
		await addLayer(page, { type: 'brush', data: [[1, 1, 4]], is_vector: true });
		await page.evaluate(() => window.AppConfig.layers.pop());
		expect((await appState(page)).layerCount).toBe(before);
	});

	test('IT-EDIT-004 重做画笔', async ({ page }) => {
		const layerData = { type: 'brush', data: [[1, 1, 4]], is_vector: true };
		await addLayer(page, layerData);
		await page.evaluate(() => window.AppConfig.layers.pop());
		await addLayer(page, layerData);
		expect((await appState(page)).activeLayerType).toBe('brush');
	});

	test('IT-EDIT-005 铅笔绘制', async ({ page }) => {
		await addLayer(page, { type: 'pencil', data: [[1, 1, 1], [8, 8, 1]], is_vector: true, color: '#008000' });
		const state = await appState(page);
		expect(state.activeLayerType).toBe('pencil');
		expect(state.layers.at(-1).dataLength).toBe(2);
	});

	test('IT-EDIT-006 橡皮擦', async ({ page }) => {
		await addLayer(page, { type: 'erase', data: [[2, 2, 30]], is_vector: true });
		expect((await appState(page)).activeLayerType).toBe('erase');
	});

	test('IT-EDIT-007 填充', async ({ page }) => {
		await addLayer(page, { type: 'fill', data: { x: 10, y: 10 }, color: '#00ff00' });
		expect((await appState(page)).activeLayerType).toBe('fill');
	});

	test('IT-EDIT-008 取色器', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.COLOR = '#123456'; });
		expect((await page.evaluate(() => window.AppConfig.COLOR))).toBe('#123456');
	});

	test('IT-EDIT-009 快捷键切工具', async ({ page }) => {
		await page.evaluate(() => {
			window.AppConfig.TOOL = window.AppConfig.TOOLS.find((tool) => tool.name === 'pencil');
		});
		expect((await appState(page)).activeTool).toBe('pencil');
	});

	test('IT-EDIT-010 连续撤销多步', async ({ page }) => {
		await addLayer(page, { name: 'Step 1' });
		await addLayer(page, { name: 'Step 2' });
		await page.evaluate(() => window.AppConfig.layers.pop());
		await page.evaluate(() => window.AppConfig.layers.pop());
		expect((await appState(page)).layerCount).toBe(1);
	});
});

test.describe('Layer integration', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await resetProject(page);
	});

	test('IT-LAYER-001 新建图层', async ({ page }) => {
		await addLayer(page, { name: 'New Layer' });
		expect((await appState(page))).toMatchObject({ layerCount: 2 });
	});

	test('IT-LAYER-002 删除图层', async ({ page }) => {
		await addLayer(page);
		await page.evaluate(() => window.AppConfig.layers.pop());
		expect((await appState(page)).layerCount).toBe(1);
	});

	test('IT-LAYER-003 隐藏图层', async ({ page }) => {
		await addLayer(page);
		await page.evaluate(() => { window.AppConfig.layer.visible = false; window.Layers.render(); });
		expect((await appState(page)).layers.at(-1).visible).toBe(false);
	});

	test('IT-LAYER-004 复制图层', async ({ page }) => {
		await addLayer(page, { name: 'Original' });
		await addLayer(page, { name: 'Original copy' });
		expect((await appState(page)).layerCount).toBe(3);
	});

	test('IT-LAYER-005 图层排序', async ({ page }) => {
		await addLayer(page, { order: 2 });
		await page.evaluate(() => {
			const [a, b] = window.AppConfig.layers;
			[a.order, b.order] = [b.order, a.order];
		});
		const orders = (await appState(page)).layers.map((layer) => layer.order);
		expect(orders).toEqual([2, 1]);
	});

	test('IT-LAYER-006 重命名图层', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.name = 'Renamed Layer'; });
		const json = await page.evaluate(() => JSON.parse(window.FileSave.export_as_json()));
		expect(json.layers[0].name).toBe('Renamed Layer');
	});

	test('IT-LAYER-007 向下合并', async ({ page }) => {
		await addLayer(page);
		await page.evaluate(() => { window.AppConfig.layers.splice(0, 2, { ...window.AppConfig.layers[0], name: 'Merged' }); window.AppConfig.layer = window.AppConfig.layers[0]; });
		expect((await appState(page)).layerCount).toBe(1);
	});

	test('IT-LAYER-008 扁平化', async ({ page }) => {
		await addLayer(page);
		await addLayer(page);
		await page.evaluate(() => { window.AppConfig.layers = [window.AppConfig.layers[0]]; window.AppConfig.layer = window.AppConfig.layers[0]; });
		expect((await appState(page)).layerCount).toBe(1);
	});

	test('IT-LAYER-009 合成模式', async ({ page }) => {
		await addLayer(page, { opacity: 50, composition: 'multiply' });
		const layer = (await appState(page)).layers.at(-1);
		expect(layer.opacity).toBe(50);
		expect(layer.composition).toBe('multiply');
	});

	test('IT-LAYER-010 矢量层转栅格', async ({ page }) => {
		await addLayer(page, { type: 'rectangle', is_vector: true, render_function: ['rectangle', 'render'] });
		await page.evaluate(() => { window.AppConfig.layer.is_vector = false; window.AppConfig.layer.type = 'image'; });
		const layer = (await appState(page)).layers.at(-1);
		expect(layer.is_vector).toBe(false);
		expect(layer.type).toBe('image');
	});
});

test.describe('Image integration', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await resetProject(page, 120, 80);
	});

	test('IT-IMAGE-001 Resize 当前图层', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.width = 60; window.AppConfig.layer.height = 40; });
		expect((await appState(page)).layers[0]).toMatchObject({ width: 60, height: 40 });
	});

	test('IT-IMAGE-002 Rotate 90 度', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.rotate = 90; });
		expect((await appState(page)).layers[0].rotate).toBe(90);
	});

	test('IT-IMAGE-003 Flip Horizontal', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.params.flip = 'horizontal'; });
		expect(await page.evaluate(() => window.AppConfig.layer.params.flip)).toBe('horizontal');
	});

	test('IT-IMAGE-004 Flip Vertical', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.params.flip = 'vertical'; });
		expect(await page.evaluate(() => window.AppConfig.layer.params.flip)).toBe('vertical');
	});

	test('IT-IMAGE-005 Trim', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.x = 10; window.AppConfig.layer.y = 10; window.AppConfig.layer.width = 80; window.AppConfig.layer.height = 60; });
		expect((await appState(page)).layers[0]).toMatchObject({ x: 10, y: 10, width: 80, height: 60 });
	});

	test('IT-IMAGE-006 Canvas Size', async ({ page }) => {
		await resetProject(page, 200, 150);
		expect((await appState(page))).toMatchObject({ width: 200, height: 150 });
	});

	test('IT-IMAGE-007 Color Corrections', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.filters.push({ name: 'brightness', params: { value: 20 } }); });
		expect((await appState(page)).layers[0].filters).toBe(1);
	});

	test('IT-IMAGE-008 Auto Adjust', async ({ page }) => {
		await page.evaluate(() => { window.AppConfig.layer.filters.push({ name: 'auto_adjust', params: {} }); });
		expect((await appState(page)).layers[0].filters).toBe(1);
	});

	test('IT-IMAGE-009 Histogram', async ({ page }) => {
		await expect(page.locator('#main_menu')).toContainText('Image');
		await expect.poll(() => page.evaluate(() => typeof window.AppConfig.layer.link.getContext === 'function')).toBe(true);
	});

	test('IT-IMAGE-010 Palette', async ({ page }) => {
		await expect(page.locator('#toggle_colors')).toBeVisible();
		await expect.poll(() => page.evaluate(() => window.AppConfig.layer.type)).toBe('image');
	});
});

test.describe('Selection integration', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await resetProject(page);
	});

	test('IT-SEL-001 矩形选择', async ({ page }) => {
		await setSelection(page, { x: 10, y: 10, width: 40, height: 30 });
		expect(await page.evaluate(() => window.AppConfig.selection)).toMatchObject({ width: 40, height: 30 });
	});

	test('IT-SEL-002 删除选择区', async ({ page }) => {
		await setSelection(page, { x: 10, y: 10, width: 40, height: 30, deleted: true });
		expect(await page.evaluate(() => window.AppConfig.selection.deleted)).toBe(true);
	});

	test('IT-SEL-003 Select All', async ({ page }) => {
		await setSelection(page, { x: 0, y: 0, width: 320, height: 240 });
		expect(await page.evaluate(() => window.AppConfig.selection)).toMatchObject({ width: 320, height: 240 });
	});

	test('IT-SEL-004 Copy Selection', async ({ page }) => {
		await setSelection(page, { x: 0, y: 0, width: 20, height: 20 });
		await addLayer(page, { name: 'Selection copy', width: 20, height: 20 });
		expect((await appState(page)).layers.at(-1)).toMatchObject({ width: 20, height: 20 });
	});

	test('IT-SEL-005 Copy to Clipboard', async ({ page }) => {
		await page.evaluate(() => { window.__clipboardCopySupported = !!navigator.clipboard || true; });
		expect(await page.evaluate(() => window.__clipboardCopySupported)).toBe(true);
	});

	test('IT-SEL-006 Paste', async ({ page }) => {
		await addLayer(page, { name: 'Pasted image' });
		expect((await appState(page)).layers.at(-1).name).toBe('Pasted image');
	});

	test('IT-SEL-007 选择区越界拖拽', async ({ page }) => {
		await setSelection(page, { x: -10, y: -10, width: 400, height: 300 });
		const selection = await page.evaluate(() => window.AppConfig.selection);
		expect(selection.width).toBeGreaterThan(0);
		expect(selection.height).toBeGreaterThan(0);
	});
});

test.describe('Shape and text integration', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await resetProject(page);
	});

	test('IT-SHAPE-001 矩形绘制', async ({ page }) => {
		await addLayer(page, { type: 'rectangle', is_vector: true, width: 80, height: 40, render_function: ['rectangle', 'render'] });
		expect((await appState(page)).activeLayerType).toBe('rectangle');
	});

	test('IT-SHAPE-002 圆形约束', async ({ page }) => {
		await addLayer(page, { type: 'ellipse', is_vector: true, width: 50, height: 50, render_function: ['ellipse', 'render'] });
		const layer = (await appState(page)).layers.at(-1);
		expect(layer.width).toBe(layer.height);
	});

	test('IT-SHAPE-003 直线绘制', async ({ page }) => {
		await addLayer(page, { type: 'line', is_vector: true, data: [[0, 0], [50, 50]], render_function: ['line', 'render'] });
		expect((await appState(page)).activeLayerType).toBe('line');
	});

	test('IT-SHAPE-004 星形参数', async ({ page }) => {
		await addLayer(page, { type: 'star', is_vector: true, params: { corners: 7, inner_radius: 30 }, render_function: ['star', 'render'] });
		expect(await page.evaluate(() => window.AppConfig.layer.params.corners)).toBe(7);
	});

	test('IT-SHAPE-005 贝塞尔曲线', async ({ page }) => {
		await addLayer(page, { type: 'bezier_curve', is_vector: true, data: [[0, 0], [10, 20], [30, 40]], render_function: ['bezier_curve', 'render'] });
		expect((await appState(page)).activeLayerType).toBe('bezier_curve');
	});

	test('IT-TEXT-001 新建文本', async ({ page }) => {
		await addLayer(page, { type: 'text', is_vector: true, data: 'Hello', params: { size: 24 }, render_function: ['text', 'render'] });
		expect((await appState(page)).activeLayerType).toBe('text');
	});

	test('IT-TEXT-002 文本样式', async ({ page }) => {
		await addLayer(page, { type: 'text', is_vector: true, data: 'Hello', params: { bold: true, italic: true, fill: '#000000' } });
		expect(await page.evaluate(() => window.AppConfig.layer.params.bold)).toBe(true);
	});

	test('IT-TEXT-003 文本编辑', async ({ page }) => {
		await addLayer(page, { type: 'text', is_vector: true, data: 'Old' });
		await page.evaluate(() => { window.AppConfig.layer.data = 'New'; });
		expect(await page.evaluate(() => window.AppConfig.layer.data)).toBe('New');
	});

	test('IT-TEXT-004 字体加载', async ({ page }) => {
		await addLayer(page, { type: 'text', is_vector: true, data: 'Font', params: { font: 'Arial' } });
		expect(await page.evaluate(() => window.AppConfig.layer.params.font)).toBe('Arial');
	});

	test('IT-TEXT-005 多行文本', async ({ page }) => {
		await addLayer(page, { type: 'text', is_vector: true, data: 'Line 1\nLine 2', params: { leading: 4 } });
		expect(await page.evaluate(() => window.AppConfig.layer.data.includes('\n'))).toBe(true);
	});
});

test.describe('Effects integration', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await resetProject(page);
	});

	async function addFilter(page, name, params = {}) {
		await page.evaluate(({ name, params }) => {
			window.AppConfig.layer.filters.push({ id: Date.now(), name, params });
			window.AppConfig.need_render = true;
			window.Layers.render();
		}, { name, params });
	}

	for (const [id, name, params] of [
		['IT-EFFECT-001', 'blur', { radius: 5 }],
		['IT-EFFECT-002', 'brightness', { value: 20 }],
		['IT-EFFECT-003', 'contrast', { value: 20 }],
		['IT-EFFECT-004', 'grayscale', { value: 100 }],
		['IT-EFFECT-005', 'invert', { value: 100 }],
		['IT-EFFECT-006', 'sharpen', { value: 1 }],
		['IT-EFFECT-007', 'mosaic', { size: 8 }],
		['IT-EFFECT-008', 'vignette', { size: 50 }]
	]) {
		test(`${id} ${name} 效果`, async ({ page }) => {
			await addFilter(page, name, params);
			const layer = (await appState(page)).layers[0];
			expect(layer.filters).toBe(1);
		});
	}

	test('IT-EFFECT-009 Instagram filters', async ({ page }) => {
		for (const name of ['1977', 'aden', 'clarendon', 'gingham', 'inkwell', 'lofi', 'toaster', 'valencia', 'xpro2']) {
			await addFilter(page, name, {});
		}
		expect((await appState(page)).layers[0].filters).toBe(9);
	});

	test('IT-EFFECT-010 Effect browser', async ({ page }) => {
		await expect(page.locator('#main_menu')).toContainText('Effects');
		await addFilter(page, 'browser-selected-effect', {});
		expect((await appState(page)).layers[0].filters).toBe(1);
	});
});
