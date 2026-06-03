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

function dataUrl(name, type) {
	return `data:${type};base64,${fixtureBuffer(name).toString('base64')}`;
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
	const start = Date.now();
	await page.goto('/index.html');
	await page.waitForFunction(() => window.AppConfig && window.FileOpen && window.FileSave && window.AppConfig.layers.length > 0);
	runtime.startupMs = Date.now() - start;
	return runtime;
}

function record(testInfo, name, value) {
	testInfo.annotations.push({ type: 'perf', description: `${name}=${value}` });
}

async function pageResponsive(page) {
	return page.evaluate(() => {
		const marker = document.createElement('div');
		marker.id = `perf-marker-${Date.now()}`;
		document.body.appendChild(marker);
		const exists = !!document.getElementById(marker.id);
		marker.remove();
		return exists && !!document.getElementById('canvas_minipaint');
	});
}

test.describe('Performance and stability tests', () => {
	test('PERF-001 启动性能', async ({ page }, testInfo) => {
		const runtime = await openApp(page);
		record(testInfo, 'startupMs', runtime.startupMs);
		await expect(page.locator('#main_menu')).toBeVisible();
		await expect(page.locator('#canvas_minipaint')).toBeVisible();
		expect(runtime.startupMs).toBeLessThan(3000);
		expect(runtime.consoleErrors).toEqual([]);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('PERF-002 大图打开', async ({ page }, testInfo) => {
		test.setTimeout(30000);
		const runtime = await openApp(page);
		const start = Date.now();
		const result = await page.evaluate(async (url) => {
			await window.FileOpen.file_open_data_url_handler(url);
			await new Promise((resolve, reject) => {
				const deadline = performance.now() + 10000;
				const tick = () => {
					const layer = window.AppConfig.layer;
					if (layer && layer.name === 'Data URL' && layer.width === 3000 && layer.height === 2000) {
						resolve();
						return;
					}
					if (performance.now() > deadline) {
						reject(new Error('Timed out opening large PNG'));
						return;
					}
					requestAnimationFrame(tick);
				};
				tick();
			});
			return {
				width: window.AppConfig.WIDTH,
				height: window.AppConfig.HEIGHT,
				layerCount: window.AppConfig.layers.length,
				activeLayer: window.AppConfig.layer.name
			};
		}, dataUrl('sample-large.png', 'image/png'));
		const duration = Date.now() - start;
		record(testInfo, 'largePngOpenMs', duration);
		expect(duration).toBeLessThan(10000);
		expect(result).toMatchObject({ width: 3000, height: 2000, activeLayer: 'Data URL' });
		expect(result.layerCount).toBeGreaterThanOrEqual(1);
		expect(await pageResponsive(page)).toBe(true);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('PERF-003 多图层渲染', async ({ page }, testInfo) => {
		test.setTimeout(30000);
		const runtime = await openApp(page);
		const result = await page.evaluate(() => {
			const start = performance.now();
			const width = 512;
			const height = 512;
			const layers = [];
			for (let i = 0; i < 50; i++) {
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx.fillStyle = `hsl(${i * 7}, 70%, 50%)`;
				ctx.fillRect(0, 0, width, height);
				ctx.fillStyle = 'rgba(255,255,255,0.35)';
				ctx.fillRect(i % width, i % height, 48, 48);
				canvas.src = canvas.toDataURL('image/png');
				layers.push({
					id: i + 1,
					parent_id: 0,
					name: `Perf Layer ${i + 1}`,
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
					opacity: 35,
					order: i + 1,
					composition: 'source-over',
					rotate: 0,
					data: null,
					params: {},
					status: null,
					color: '#000000',
					filters: [],
					render_function: null
				});
			}
			window.AppConfig.WIDTH = width;
			window.AppConfig.HEIGHT = height;
			window.AppConfig.layers = layers;
			window.AppConfig.layer = layers[layers.length - 1];
			window.AppConfig.need_render = true;
			window.Layers.render(true);
			const merged = document.createElement('canvas');
			merged.width = width;
			merged.height = height;
			const mergedCtx = merged.getContext('2d');
			window.Layers.convert_layers_to_canvas(mergedCtx, null, false);
			return {
				duration: performance.now() - start,
				layerCount: window.AppConfig.layers.length,
				pixel: Array.from(mergedCtx.getImageData(10, 10, 1, 1).data)
			};
		});
		record(testInfo, 'render50LayersMs', Math.round(result.duration));
		expect(result.layerCount).toBe(50);
		expect(result.duration).toBeLessThan(10000);
		expect(result.pixel[3]).toBeGreaterThan(0);
		expect(await pageResponsive(page)).toBe(true);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('PERF-004 连续撤销', async ({ page }, testInfo) => {
		test.setTimeout(30000);
		const runtime = await openApp(page);
		const result = await page.evaluate(async () => {
			window.__perfFreed = 0;
			for (let i = 0; i < 100; i++) {
				const action = {
					action_id: 'perf_stroke',
					action_description: 'Perf Stroke',
					memory_estimate: 1024,
					database_estimate: 0,
					async do() {
						window.__perfStroke = (window.__perfStroke || 0) + 1;
					},
					async undo() {
						window.__perfStroke = (window.__perfStroke || 0) - 1;
					},
					async free() {
						window.__perfFreed++;
					}
				};
				await window.State.do_action(action);
			}
			const afterActions = {
				historyLength: window.State.action_history.length,
				index: window.State.action_history_index,
				freed: window.__perfFreed,
				stroke: window.__perfStroke
			};
			while (window.State.can_undo()) {
				await window.State.undo_action();
			}
			return {
				afterActions,
				afterUndo: {
					historyLength: window.State.action_history.length,
					index: window.State.action_history_index,
					freed: window.__perfFreed,
					stroke: window.__perfStroke
				}
			};
		});
		record(testInfo, 'historyLengthAfter100', result.afterActions.historyLength);
		record(testInfo, 'freedAfter100', result.afterActions.freed);
		expect(result.afterActions.historyLength).toBeLessThanOrEqual(50);
		expect(result.afterActions.index).toBe(result.afterActions.historyLength);
		expect(result.afterActions.freed).toBe(50);
		expect(result.afterUndo.index).toBe(0);
		expect(result.afterUndo.stroke).toBe(50);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('PERF-005 大图滤镜', async ({ page }, testInfo) => {
		test.setTimeout(45000);
		const runtime = await openApp(page);
		const result = await page.evaluate(() => {
			const width = 2000;
			const height = 2000;
			const source = document.createElement('canvas');
			source.width = width;
			source.height = height;
			const sourceCtx = source.getContext('2d');
			const gradient = sourceCtx.createLinearGradient(0, 0, width, height);
			gradient.addColorStop(0, '#1d4ed8');
			gradient.addColorStop(1, '#f97316');
			sourceCtx.fillStyle = gradient;
			sourceCtx.fillRect(0, 0, width, height);

			const start = performance.now();
			const blurred = document.createElement('canvas');
			blurred.width = width;
			blurred.height = height;
			const blurCtx = blurred.getContext('2d');
			blurCtx.filter = 'blur(2px)';
			blurCtx.drawImage(source, 0, 0);

			const imageData = blurCtx.getImageData(0, 0, width, height);
			const data = imageData.data;
			const copy = new Uint8ClampedArray(data);
			for (let y = 1; y < height - 1; y++) {
				for (let x = 1; x < width - 1; x++) {
					const i = (y * width + x) * 4;
					for (let c = 0; c < 3; c++) {
						data[i + c] = Math.max(0, Math.min(255, copy[i + c] * 5 - copy[i - 4 + c] - copy[i + 4 + c] - copy[i - width * 4 + c] - copy[i + width * 4 + c]));
					}
				}
			}
			blurCtx.putImageData(imageData, 0, 0);
			return {
				duration: performance.now() - start,
				width,
				height,
				pixel: Array.from(blurCtx.getImageData(1000, 1000, 1, 1).data)
			};
		});
		record(testInfo, 'largeFilterMs', Math.round(result.duration));
		expect(result).toMatchObject({ width: 2000, height: 2000 });
		expect(result.duration).toBeLessThan(15000);
		expect(result.pixel[3]).toBe(255);
		expect(await pageResponsive(page)).toBe(true);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('PERF-006 GIF 导出', async ({ page }, testInfo) => {
		test.setTimeout(60000);
		const runtime = await openApp(page);
		await page.addScriptTag({ path: path.resolve('src/js/libs/gifjs/gif.js') });
		const result = await page.evaluate(async () => {
			const start = performance.now();
			const gif = new window.GIF({
				workers: 2,
				quality: 20,
				repeat: 0,
				width: 512,
				height: 512,
				workerScript: '/src/js/libs/gifjs/gif.worker.js'
			});
			for (let i = 0; i < 20; i++) {
				const canvas = document.createElement('canvas');
				canvas.width = 512;
				canvas.height = 512;
				const ctx = canvas.getContext('2d');
				ctx.fillStyle = `hsl(${i * 18}, 80%, 50%)`;
				ctx.fillRect(0, 0, 512, 512);
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(i * 12, i * 8, 96, 96);
				gif.addFrame(ctx, { copy: true, delay: 40 });
			}
			const blob = await new Promise((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error('GIF render timeout')), 50000);
				gif.on('finished', (blob) => {
					clearTimeout(timeout);
					resolve(blob);
				});
				gif.render();
			});
			const header = Array.from(new Uint8Array(await blob.slice(0, 6).arrayBuffer()));
			return {
				duration: performance.now() - start,
				size: blob.size,
				type: blob.type,
				header: String.fromCharCode(...header)
			};
		});
		record(testInfo, 'gifExportMs', Math.round(result.duration));
		record(testInfo, 'gifSize', result.size);
		expect(result.header).toBe('GIF89a');
		expect(result.type).toBe('image/gif');
		expect(result.size).toBeGreaterThan(0);
		expect(result.duration).toBeLessThan(50000);
		expect(runtime.pageErrors).toEqual([]);
	});

	test('PERF-007 JSON 大文件', async ({ page }, testInfo) => {
		test.setTimeout(30000);
		const runtime = await openApp(page);
		const result = await page.evaluate(async (baseJson) => {
			const json = JSON.parse(baseJson);
			const imageLayer = json.layers.find((layer) => layer.type === 'image');
			const imageData = json.data.find((item) => item.id === imageLayer.id).data;
			json.layers = [];
			json.data = [];
			for (let i = 0; i < 20; i++) {
				json.layers.push({
					...imageLayer,
					id: i + 1,
					name: `JSON Perf Layer ${i + 1}`,
					order: i + 1,
					x: i,
					y: i
				});
				json.data.push({ id: i + 1, data: imageData });
			}
			json.info.layer_active = 20;
			const inputSize = JSON.stringify(json).length;
			const start = performance.now();
			await window.FileOpen.load_json(json);
			const exported = window.FileSave.export_as_json();
			const parsed = JSON.parse(exported);
			return {
				duration: performance.now() - start,
				inputSize,
				outputSize: exported.length,
				layerCount: parsed.layers.length,
				activeLayer: parsed.info.layer_active
			};
		}, fixtureText('sample-layers.json'));
		record(testInfo, 'jsonRoundtripMs', Math.round(result.duration));
		record(testInfo, 'jsonOutputSize', result.outputSize);
		expect(result.layerCount).toBe(20);
		expect(result.activeLayer).toBe(20);
		expect(result.outputSize).toBeGreaterThan(result.inputSize / 2);
		expect(result.duration).toBeLessThan(10000);
		expect(await pageResponsive(page)).toBe(true);
		expect(runtime.pageErrors).toEqual([]);
	});
});
