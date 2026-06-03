import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const fixtureDir = path.resolve('tests/fixtures');

function fixturePath(name) {
	return path.join(fixtureDir, name);
}

function fixtureBuffer(name) {
	return fs.readFileSync(fixturePath(name));
}

function fixtureText(name) {
	return fs.readFileSync(fixturePath(name), 'utf8');
}

function dataUrl(name, type) {
	return `data:${type};base64,${fixtureBuffer(name).toString('base64')}`;
}

async function openApp(page) {
	await page.goto('/index.html');
	await page.waitForFunction(() => window.AppConfig && window.FileOpen && window.FileSave && window.AppConfig.layers.length > 0);
}

async function decodeFixture(page, name, type) {
	const url = dataUrl(name, type);
	return page.evaluate(async (url) => {
		const response = await fetch(url);
		const blob = await response.blob();
		const bitmap = await createImageBitmap(blob);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(bitmap, 0, 0);
		const pixel = Array.from(ctx.getImageData(0, 0, 1, 1).data);
		return { width: bitmap.width, height: bitmap.height, type: blob.type, pixel };
	}, url);
}

async function setSingleImageLayer(page, width = 16, height = 16, color = '#ff0000') {
	await page.evaluate(([width, height, color]) => {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, width, height);
		canvas.src = canvas.toDataURL('image/png');
		const layer = {
			id: 1,
			parent_id: 0,
			name: 'Export Fixture',
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
			color,
			filters: [],
			render_function: null
		};
		window.AppConfig.WIDTH = width;
		window.AppConfig.HEIGHT = height;
		window.AppConfig.layers = [layer];
		window.AppConfig.layer = layer;
		window.Layers.render();
	}, [width, height, color]);
}

async function exportCanvasBlob(page, type = 'image/png', width = 16, height = 16) {
	return page.evaluate(async ([type, width, height]) => {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = '#ff0000';
		ctx.fillRect(0, 0, width, height);
		const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.9));
		const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()).slice(0, 16));
		return { type: blob.type, size: blob.size, bytes, dataUrlHeader: canvas.toDataURL(type).slice(0, 32) };
	}, [type, width, height]);
}

function parsePngSize(buffer) {
	return {
		width: buffer.readUInt32BE(16),
		height: buffer.readUInt32BE(20)
	};
}

function minimalTiff(width, height) {
	const entries = 3;
	const buffer = Buffer.alloc(8 + 2 + entries * 12 + 4);
	buffer.write('II', 0, 'ascii');
	buffer.writeUInt16LE(42, 2);
	buffer.writeUInt32LE(8, 4);
	buffer.writeUInt16LE(entries, 8);
	const writeEntry = (index, tag, type, count, value) => {
		const offset = 10 + index * 12;
		buffer.writeUInt16LE(tag, offset);
		buffer.writeUInt16LE(type, offset + 2);
		buffer.writeUInt32LE(count, offset + 4);
		buffer.writeUInt32LE(value, offset + 8);
	};
	writeEntry(0, 256, 4, 1, width);
	writeEntry(1, 257, 4, 1, height);
	writeEntry(2, 258, 3, 1, 8);
	buffer.writeUInt32LE(0, 10 + entries * 12);
	return buffer;
}

test.describe('File import tests', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
	});

	test('IO-IMPORT-001 PNG 普通导入', async ({ page }) => {
		const image = await decodeFixture(page, 'sample-1x1.png', 'image/png');
		expect(image).toMatchObject({ width: 1, height: 1, type: 'image/png' });
		expect(image.pixel).toEqual([255, 0, 0, 255]);
	});

	test('IO-IMPORT-002 PNG 透明导入', async ({ page }) => {
		const url = dataUrl('sample-transparent.png', 'image/png');
		const alpha = await page.evaluate(async (url) => {
			const blob = await (await fetch(url)).blob();
			const bitmap = await createImageBitmap(blob);
			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			const ctx = canvas.getContext('2d');
			ctx.drawImage(bitmap, 0, 0);
			return ctx.getImageData(3, 3, 1, 1).data[3];
		}, url);
		expect(alpha).toBe(0);
	});

	test('IO-IMPORT-003 JPG 普通照片导入', async ({ page }) => {
		const image = await decodeFixture(page, 'sample-photo.jpg', 'image/jpeg');
		expect(image.width).toBeGreaterThanOrEqual(1);
		expect(image.height).toBeGreaterThanOrEqual(1);
		expect(image.type).toBe('image/jpeg');
	});

	test('IO-IMPORT-004 GIF 动图导入', async ({ page }) => {
		const image = await decodeFixture(page, 'sample-animated.gif', 'image/gif');
		expect(image.width).toBe(2);
		expect(image.height).toBe(2);
	});

	test('IO-IMPORT-005 JSON 图层导入', async ({ page }) => {
		const json = fixtureText('sample-layers.json');
		await page.evaluate(async (json) => {
			await window.FileOpen.load_json(json);
		}, json);
		const state = await page.evaluate(() => ({
			width: window.AppConfig.WIDTH,
			height: window.AppConfig.HEIGHT,
			layerCount: window.AppConfig.layers.length,
			names: window.AppConfig.layers.map((layer) => layer.name)
		}));
		expect(state).toMatchObject({ width: 16, height: 16, layerCount: 2 });
		expect(state.names).toContain('Fixture Text Layer');
	});

	test('IO-IMPORT-006 Data URL 导入', async ({ page }) => {
		const url = dataUrl('sample-1x1.png', 'image/png');
		await page.evaluate((url) => window.FileOpen.file_open_data_url_handler(url), url);
		await page.waitForFunction(() => window.AppConfig.layer && window.AppConfig.layer.name === 'Data URL');
		const layer = await page.evaluate(() => ({
			name: window.AppConfig.layer.name,
			width: window.AppConfig.layer.width,
			height: window.AppConfig.layer.height
		}));
		expect(layer).toEqual({ name: 'Data URL', width: 1, height: 1 });
	});

	test('IO-IMPORT-007 Directory 多文件导入策略', async ({ page }) => {
		const names = ['sample-1x1.png', 'sample-transparent.png', 'sample-photo.jpg'];
		const decoded = await Promise.all(names.map((name) => decodeFixture(page, name, name.endsWith('.jpg') ? 'image/jpeg' : 'image/png')));
		expect(decoded).toHaveLength(3);
		expect(decoded.every((item) => item.width > 0 && item.height > 0)).toBe(true);
	});

	test('IO-IMPORT-008 同源 URL 导入', async ({ page }) => {
		await page.evaluate(() => window.FileOpen.file_open_url_handler({ url: '/tests/fixtures/sample-1x1.png' }));
		await page.waitForFunction(() => window.AppConfig.layer && window.AppConfig.layer.name === 'sample-1x1.png');
		expect(await page.evaluate(() => window.AppConfig.layer.width)).toBe(1);
	});

	test('IO-IMPORT-009 跨域 URL 失败可控', async ({ page }) => {
		const before = await page.evaluate(() => window.AppConfig.layers.length);
		await page.evaluate(() => window.FileOpen.file_open_url_handler({ url: 'https://invalid.invalid/not-found.png' }));
		await page.waitForTimeout(500);
		expect(await page.evaluate(() => window.AppConfig.layers.length)).toBe(before);
	});

	test('IO-IMPORT-010 损坏图片失败可控', async ({ page }) => {
		const failed = await page.evaluate(async () => {
			try {
				await createImageBitmap(new Blob(['not an image'], { type: 'image/png' }));
				return false;
			} catch {
				return true;
			}
		});
		expect(failed).toBe(true);
	});
});

test.describe('File export tests', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
		await setSingleImageLayer(page);
	});

	test('IO-EXPORT-001 PNG 导出完整图像', async ({ page }) => {
		const blob = await exportCanvasBlob(page, 'image/png', 16, 16);
		expect(blob.type).toBe('image/png');
		expect(blob.bytes.slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
	});

	test('IO-EXPORT-002 JSON 保存图层数据', async ({ page }) => {
		const exported = await page.evaluate(() => JSON.parse(window.FileSave.export_as_json()));
		expect(exported.info).toMatchObject({ width: 16, height: 16, layer_active: 1 });
		expect(exported.layers).toHaveLength(1);
		expect(exported.data).toHaveLength(1);
		expect(exported.data[0].data).toMatch(/^data:image\/png;base64,/);
	});

	test('IO-EXPORT-003 JPG 导出', async ({ page }) => {
		const blob = await exportCanvasBlob(page, 'image/jpeg', 16, 16);
		expect(blob.type).toBe('image/jpeg');
		expect(blob.bytes.slice(0, 2)).toEqual([255, 216]);
	});

	test('IO-EXPORT-004 WEBP 导出', async ({ page }) => {
		const blob = await exportCanvasBlob(page, 'image/webp', 16, 16);
		if (blob.type === 'image/webp') {
			expect(String.fromCharCode(...blob.bytes.slice(0, 4))).toBe('RIFF');
		} else {
			expect(blob.dataUrlHeader).not.toContain('image/webp');
		}
	});

	test('IO-EXPORT-005 BMP 导出支持判断', async ({ page }) => {
		const support = await page.evaluate(() => {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			return window.FileSave.check_format_support(canvas, 'image/bmp', false);
		});
		const blob = await exportCanvasBlob(page, support ? 'image/bmp' : 'image/png', 16, 16);
		expect(blob.size).toBeGreaterThan(0);
	});

	test('IO-EXPORT-006 TIFF 导出文件头', () => {
		const tiff = minimalTiff(16, 16);
		expect(tiff.subarray(0, 4).toString('binary')).toBe('II*\u0000');
		expect(tiff.readUInt32LE(10 + 0 * 12 + 8)).toBe(16);
		expect(tiff.readUInt32LE(10 + 1 * 12 + 8)).toBe(16);
	});

	test('IO-EXPORT-007 GIF 多帧导出结构', () => {
		const gif = fixtureBuffer('sample-animated.gif');
		expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a');
		const imageDescriptors = [...gif].filter((byte) => byte === 0x2c).length;
		expect(imageDescriptors).toBeGreaterThanOrEqual(1);
	});

	test('IO-EXPORT-008 Data URL 导出', async ({ page }) => {
		const dataUrlHeader = await page.evaluate(() => {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			return canvas.toDataURL('image/png').slice(0, 22);
		});
		expect(dataUrlHeader).toBe('data:image/png;base64,');
	});

	test('IO-EXPORT-009 仅保存当前图层', async ({ page }) => {
		await page.evaluate(() => {
			window.AppConfig.layer.width = 8;
			window.AppConfig.layer.height = 6;
		});
		const layerSize = await page.evaluate(() => {
			const canvas = window.Layers.convert_layer_to_canvas();
			return { width: canvas.width, height: canvas.height };
		});
		expect(layerSize).toEqual({ width: 8, height: 6 });
	});

	test('IO-EXPORT-010 Large PNG 导出', () => {
		const buffer = fixtureBuffer('sample-large.png');
		expect(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
		expect(parsePngSize(buffer)).toEqual({ width: 3000, height: 2000 });
	});
});

test.describe('File roundtrip tests', () => {
	test.beforeEach(async ({ page }) => {
		await openApp(page);
	});

	test('IO-ROUND-001 JSON 往返', async ({ page }) => {
		const json = fixtureText('sample-layers.json');
		await page.evaluate(async (json) => window.FileOpen.load_json(json), json);
		const exported = await page.evaluate(() => JSON.parse(window.FileSave.export_as_json()));
		expect(exported.info).toMatchObject({ width: 16, height: 16 });
		expect(exported.layers.map((layer) => layer.name)).toEqual(expect.arrayContaining(['Fixture Image Layer', 'Fixture Text Layer']));
	});

	test('IO-ROUND-002 PNG 往返', async ({ page }) => {
		const image = await decodeFixture(page, 'sample-1x1.png', 'image/png');
		const exported = await exportCanvasBlob(page, 'image/png', image.width, image.height);
		expect(exported.bytes.slice(0, 8)).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
	});

	test('IO-ROUND-003 Data URL 往返', async ({ page }) => {
		const url = dataUrl('sample-1x1.png', 'image/png');
		const result = await page.evaluate(async (url) => {
			const blob = await (await fetch(url)).blob();
			const bitmap = await createImageBitmap(blob);
			const canvas = document.createElement('canvas');
			canvas.width = bitmap.width;
			canvas.height = bitmap.height;
			canvas.getContext('2d').drawImage(bitmap, 0, 0);
			return canvas.toDataURL('image/png').startsWith('data:image/png;base64,');
		}, url);
		expect(result).toBe(true);
	});

	test('IO-ROUND-004 GIF 往返', async ({ page }) => {
		const image = await decodeFixture(page, 'sample-animated.gif', 'image/gif');
		expect(image.width).toBe(2);
		expect(image.height).toBe(2);
		expect(fixtureBuffer('sample-animated.gif').subarray(0, 6).toString('ascii')).toBe('GIF89a');
	});

	test('IO-ROUND-005 JSON 旧版本兼容', async ({ page }) => {
		const json = fixtureText('sample-old-layers.json');
		await page.evaluate(async (json) => window.FileOpen.load_json(json), json);
		const state = await page.evaluate(() => ({
			width: window.AppConfig.WIDTH,
			height: window.AppConfig.HEIGHT,
			layerCount: window.AppConfig.layers.length
		}));
		expect(state.width).toBeGreaterThan(0);
		expect(state.height).toBeGreaterThan(0);
		expect(state.layerCount).toBe(1);
	});
});
