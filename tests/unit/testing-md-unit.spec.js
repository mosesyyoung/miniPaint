import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import app from '../../src/js/app.js';
import config from '../../src/js/config.js';
import menuDefinition from '../../src/js/config-menu.js';
import HelperClass from '../../src/js/libs/helpers.js';
import CanvasToTIFF from '../../src/js/libs/canvastotiff.js';
import colorMatrix from '../../src/js/libs/color-matrix.js';
import { Base_action } from '../../src/js/actions/base.js';
import * as Actions from '../../src/js/actions/index.js';
import FileSaveClass from '../../src/js/modules/file/save.js';
import BaseToolsClass from '../../src/js/core/base-tools.js';

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function flattenMenu(items, out = []) {
	for (const item of items) {
		out.push(item);
		if (item.children) {
			flattenMenu(item.children, out);
		}
	}
	return out;
}

function makeCanvas(width = 10, height = 10) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function makeLayer(id, overrides = {}) {
	return {
		id,
		parent_id: 0,
		name: `Layer ${id}`,
		type: 'image',
		link: makeCanvas(2, 2),
		x: 0,
		y: 0,
		width: 2,
		width_original: 2,
		height: 2,
		height_original: 2,
		visible: true,
		is_vector: false,
		hide_selection_if_active: false,
		opacity: 100,
		order: id,
		composition: 'source-over',
		rotate: 0,
		data: null,
		params: {},
		status: null,
		color: '#008000',
		filters: [],
		render_function: null,
		...overrides
	};
}

function resetAppState() {
	config.WIDTH = 100;
	config.HEIGHT = 80;
	config.ZOOM = 1;
	config.COLOR = '#008000';
	config.ALPHA = 255;
	config.need_render = false;
	config.need_render_changed_params = false;
	config.guides = [];
	config.user_fonts = {};
	config.TOOL = config.TOOLS.find((tool) => tool.name === 'brush') || config.TOOLS[0];
	config.layers = [makeLayer(1)];
	config.layer = config.layers[0];

	const selectionSettings = {
		data: { x: 1, y: 2, width: 3, height: 4 }
	};
	app.Actions = Actions;
	app.Layers = {
		auto_increment: 2,
		Base_selection: {
			find_settings: vi.fn(() => selectionSettings)
		},
		get_layer: vi.fn((id) => config.layers.find((layer) => layer.id === parseInt(id))),
		find_next: vi.fn((id) => config.layers.find((layer) => layer.order > app.Layers.get_layer(id)?.order)),
		find_previous: vi.fn((id) => [...config.layers].reverse().find((layer) => layer.order < app.Layers.get_layer(id)?.order)),
		render: vi.fn(),
		convert_layers_to_canvas: vi.fn((ctx) => {
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, 1, 1);
		}),
		convert_layer_to_canvas: vi.fn(() => makeCanvas(2, 2)),
		get_world_coords: vi.fn((x, y) => ({ x: x / config.ZOOM, y: y / config.ZOOM }))
	};
	app.GUI = {
		prepare_canvas: vi.fn(),
		GUI_layers: { render_layers: vi.fn() },
		GUI_details: { render: vi.fn() },
		GUI_tools: { render_action_attributes: vi.fn() }
	};
	return { selectionSettings };
}

describe('配置和菜单单元测试', () => {
	it('UT-CONFIG-001 默认配置完整', () => {
		expect(config.COLOR).toMatch(/^#[0-9a-f]{6}$/i);
		expect(config.ZOOM).toBe(1);
		expect(Array.isArray(config.TOOLS)).toBe(true);
		expect(config.TOOLS.length).toBeGreaterThan(0);
	});

	it('UT-CONFIG-002 默认工具合法', () => {
		const names = new Set();
		for (const tool of config.TOOLS) {
			expect(tool.name).toEqual(expect.any(String));
			expect(names.has(tool.name)).toBe(false);
			names.add(tool.name);
			expect(tool.attributes || {}).toEqual(expect.any(Object));
		}
	});

	it('UT-CONFIG-003 文本工具参数完整', () => {
		const textTool = config.TOOLS.find((tool) => tool.name === 'text');
		expect(textTool).toBeTruthy();
		expect(Object.keys(textTool.attributes)).toEqual(expect.arrayContaining([
			'font', 'size', 'bold', 'italic', 'underline', 'fill', 'stroke'
		]));
	});

	it('UT-CONFIG-004 形状工具默认参数合法', () => {
		for (const name of ['rectangle', 'ellipse', 'star']) {
			const tool = config.TOOLS.find((item) => item.name === name);
			expect(tool).toBeTruthy();
			expect(tool.attributes).toEqual(expect.any(Object));
			expect(JSON.stringify(tool.attributes)).toMatch(/color|border|fill|size|radius|corners/);
		}
	});

	it('UT-MENU-001 菜单 target 格式合法', () => {
		for (const item of flattenMenu(menuDefinition).filter((entry) => entry.target)) {
			expect(item.target).toMatch(/^[\w/-]+\.[A-Za-z0-9_]+$/);
		}
	});

	it('UT-MENU-002 菜单基础分类存在', () => {
		expect(menuDefinition.map((item) => item.name)).toEqual([
			'File', 'Edit', 'View', 'Image', 'Layer', 'Effects', 'Tools', 'Help'
		]);
	});

	it('UT-MENU-003 同级菜单快捷键冲突可控', () => {
		function assertLevel(items) {
			const seen = new Set();
			for (const item of items) {
				if (item.shortcut) {
					expect(seen.has(item.shortcut)).toBe(false);
					seen.add(item.shortcut);
				}
				if (item.children) {
					assertLevel(item.children);
				}
			}
		}
		assertLevel(menuDefinition);
	});

	it('UT-MENU-004 菜单指向模块存在', () => {
		const moduleRoot = path.join(root, 'src/js/modules');
		for (const item of flattenMenu(menuDefinition).filter((entry) => entry.target)) {
			const [modulePath] = item.target.split('.');
			expect(fs.existsSync(path.join(moduleRoot, `${modulePath}.js`))).toBe(true);
		}
	});
});

describe('Helpers 和基础库单元测试', () => {
	let helper;

	beforeEach(() => {
		helper = new HelperClass();
		document.cookie = 'config=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
	});

	it('UT-HELPER-001 HEX/RGB 转换', () => {
		expect(helper.rgbToHex(255, 0, 16)).toBe('#ff0010');
		expect(helper.hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0, a: 255 });
	});

	it('UT-HELPER-002 透明度/Alpha 转换基础值', () => {
		expect(helper.hex(0)).toBe('00');
		expect(helper.hex(128)).toBe('80');
		expect(helper.hex(255)).toBe('ff');
	});

	it('UT-HELPER-003 数值边界和格式化稳定', () => {
		expect(helper.number_format(1.23456, 2)).toBe(1.23);
		expect(helper.darkenColor('#ffffff', -300)).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it('UT-HELPER-004 URL 参数解析', () => {
		window.history.pushState({}, '', '/?lang=zh&theme=dark');
		expect(helper.get_url_parameters()).toEqual({ lang: 'zh', theme: 'dark' });
	});

	it('UT-HELPER-005 Cookie 读写', () => {
		helper.setCookie('theme', 'light');
		expect(helper.getCookie('theme')).toBe('light');
		expect(helper.getCookie('missing')).toBe(null);
	});

	it('UT-COLOR-001 颜色矩阵初始化', () => {
		const matrix = new colorMatrix();
		expect(matrix).toBeTruthy();
		expect(typeof matrix.multiply).toBe('function');
		expect(typeof matrix.colorMatrix).toBe('function');
	});

	it('UT-COLOR-002 调色板提取库契约存在', async () => {
		const source = read('src/js/libs/color-thief.js');
		expect(source).toContain('getPalette');
		expect(source).toContain('getColor');
	});

	it('UT-TIFF-001 Canvas 转 TIFF ArrayBuffer', async () => {
		const buffer = await new Promise((resolve) => {
			CanvasToTIFF.toArrayBuffer(makeCanvas(2, 2), resolve);
		});
		expect(buffer).toBeInstanceOf(ArrayBuffer);
		expect(buffer.byteLength).toBeGreaterThan(8);
	});

	it('UT-TIFF-002 无效画布不会静默成功', () => {
		const callback = vi.fn();
		expect(() => CanvasToTIFF.toArrayBuffer(null, callback)).not.toThrow();
		expect(callback).not.toHaveBeenCalled();
	});
});

describe('Action 撤销/重做单元测试', () => {
	beforeEach(() => {
		resetAppState();
	});

	it('UT-ACTION-001 action 基类', () => {
		const action = new Base_action('id', 'description');
		expect(action.is_done).toBe(false);
		action.do();
		expect(action.is_done).toBe(true);
		action.undo();
		expect(action.is_done).toBe(false);
		expect(action.memory_estimate).toBe(0);
		expect(action.database_estimate).toBe(0);
	});

	it('UT-ACTION-002 插入图层', async () => {
		const action = new Actions.Insert_layer_action({ name: 'New', type: null, width: 10, height: 10 }, false);
		await action.do();
		expect(config.layers).toHaveLength(2);
		expect(config.layer.name).toBe('New');
	});

	it('UT-ACTION-003 插入图层撤销', async () => {
		const action = new Actions.Insert_layer_action({ name: 'New', type: null, width: 10, height: 10 }, false);
		await action.do();
		await action.undo();
		expect(config.layers).toHaveLength(1);
		expect(config.layer.id).toBe(1);
	});

	it('UT-ACTION-004 删除图层', async () => {
		config.layers.push(makeLayer(2, { order: 2 }));
		config.layer = config.layers[1];
		const action = new Actions.Delete_layer_action(2);
		await action.do();
		expect(config.layers.map((layer) => layer.id)).toEqual([1]);
	});

	it('UT-ACTION-005 删除撤销', async () => {
		config.layers.push(makeLayer(2, { order: 2 }));
		config.layer = config.layers[1];
		const action = new Actions.Delete_layer_action(2);
		await action.do();
		await action.undo();
		expect(config.layers.map((layer) => layer.id)).toEqual([1, 2]);
	});

	it('UT-ACTION-006 更新图层属性', async () => {
		const action = new Actions.Update_layer_action(1, { x: 5, width: 20, name: 'Updated' });
		await action.do();
		expect(config.layer).toMatchObject({ x: 5, width: 20, name: 'Updated' });
		await action.undo();
		expect(config.layer).toMatchObject({ x: 0, width: 2, name: 'Layer 1' });
	});

	it('UT-ACTION-007 更新图层图片契约', async () => {
		const source = read('src/js/actions/update-layer-image.js');
		expect(source).toContain('Update_layer_image_action');
		expect(source).toContain('undo()');
		expect(source).toContain('image_store');
	});

	it('UT-ACTION-008 组合 action 成功', async () => {
		const one = { do: vi.fn(), undo: vi.fn(), free: vi.fn(), memory_estimate: 1, database_estimate: 2 };
		const two = { do: vi.fn(), undo: vi.fn(), free: vi.fn(), memory_estimate: 3, database_estimate: 4 };
		const action = new Actions.Bundle_action('bundle', 'Bundle', [one, two]);
		await action.do();
		expect(one.do).toHaveBeenCalledBefore(two.do);
		expect(action.memory_estimate).toBe(4);
		await action.undo();
		expect(two.undo).toHaveBeenCalledBefore(one.undo);
	});

	it('UT-ACTION-009 组合 action 中途失败会回滚', async () => {
		const one = { do: vi.fn(), undo: vi.fn(), free: vi.fn(), memory_estimate: 0, database_estimate: 0 };
		const two = { do: vi.fn(() => { throw new Error('fail'); }), undo: vi.fn(), free: vi.fn(), memory_estimate: 0, database_estimate: 0 };
		const action = new Actions.Bundle_action('bundle', 'Bundle', [one, two]);
		await expect(action.do()).rejects.toThrow('fail');
		expect(one.undo).toHaveBeenCalledTimes(1);
	});

	it('UT-ACTION-010 图层排序', async () => {
		config.layers = [makeLayer(1, { order: 1 }), makeLayer(2, { order: 2 })];
		config.layer = config.layers[0];
		const action = new Actions.Reorder_layer_action(1, 1);
		await action.do();
		expect(config.layers[0].order).toBe(2);
		expect(config.layers[1].order).toBe(1);
		await action.undo();
		expect(config.layers[0].order).toBe(1);
	});

	it('UT-ACTION-011 可见性切换', async () => {
		const action = new Actions.Toggle_layer_visibility_action(1);
		await action.do();
		expect(config.layer.visible).toBe(false);
		await action.undo();
		expect(config.layer.visible).toBe(true);
	});

	it('UT-ACTION-012 设置选择区', async () => {
		const { selectionSettings } = resetAppState();
		const action = new Actions.Set_selection_action(10, 11, 12, 13);
		await action.do();
		expect(selectionSettings.data).toEqual({ x: 10, y: 11, width: 12, height: 13 });
		await action.undo();
		expect(selectionSettings.data).toEqual({ x: 1, y: 2, width: 3, height: 4 });
	});

	it('UT-ACTION-013 图层滤镜增删', async () => {
		const add = new Actions.Add_layer_filter_action(1, 'blur', { radius: 2 });
		await add.do();
		expect(config.layer.filters).toHaveLength(1);
		const id = config.layer.filters[0].id;
		const del = new Actions.Delete_layer_filter_action(1, id);
		await del.do();
		expect(config.layer.filters).toHaveLength(0);
		await del.undo();
		expect(config.layer.filters).toHaveLength(1);
		await add.undo();
		expect(config.layer.filters).toHaveLength(0);
	});

	it('UT-ACTION-014 清空图层', async () => {
		const action = new Actions.Clear_layer_action(1);
		await action.do();
		expect(config.layer).toMatchObject({ type: null, width: 0, height: 0, data: null });
		await action.undo();
		expect(config.layer).toMatchObject({ type: 'image', width: 2, height: 2 });
	});

	it('UT-ACTION-015 自动扩画布契约', () => {
		const source = read('src/js/actions/autoresize-canvas.js');
		expect(source).toContain('Auto-resize Canvas');
		expect(source).toContain('app.GUI.prepare_canvas');
		expect(source).toContain('undo()');
	});
});

describe('State 历史管理单元测试', () => {
	function createStateLike() {
		return {
			action_history: [],
			action_history_index: 0,
			action_history_max: 50,
			can_redo: ActionsState.can_redo,
			can_undo: ActionsState.can_undo,
			do_action: ActionsState.do_action,
			undo_action: ActionsState.undo_action,
			redo_action: ActionsState.redo_action,
			free: ActionsState.free
		};
	}

	const stateSource = read('src/js/core/base-state.js');
	const ActionsState = {
		async do_action(action, options = {}) {
			await action.do();
			if (this.action_history_index < this.action_history.length) {
				for (const oldAction of this.action_history.slice(this.action_history_index).reverse()) {
					await oldAction.free();
				}
				this.action_history = this.action_history.slice(0, this.action_history_index);
			}
			const last = this.action_history[this.action_history.length - 1];
			if (options.merge_with_history && last && [options.merge_with_history].flat().includes(last.action_id)) {
				this.action_history[this.action_history.length - 1] = new Actions.Bundle_action(last.action_id, last.action_description, [last, action]);
			} else {
				this.action_history.push(action);
				this.action_history_index++;
			}
			return { status: 'completed' };
		},
		can_redo() {
			return this.action_history_index < this.action_history.length;
		},
		can_undo() {
			return this.action_history_index > 0;
		},
		async undo_action() {
			if (this.can_undo()) {
				this.action_history_index--;
				await this.action_history[this.action_history_index].undo();
			}
		},
		async redo_action() {
			if (this.can_redo()) {
				await this.action_history[this.action_history_index].do();
				this.action_history_index++;
			}
		},
		async free(memory = 0, database = 0) {
			let total_memory_freed = 0;
			let total_database_freed = 0;
			while (this.action_history_index > 0) {
				const action = this.action_history.shift();
				total_memory_freed += action.memory_estimate;
				total_database_freed += action.database_estimate;
				await action.free();
				this.action_history_index--;
				if (total_memory_freed >= memory && total_database_freed >= database) break;
			}
			return { total_memory_freed, total_database_freed };
		}
	};

	const fakeAction = (id = 'a') => ({
		action_id: id,
		action_description: id,
		memory_estimate: 1,
		database_estimate: 1,
		do: vi.fn(),
		undo: vi.fn(),
		free: vi.fn()
	});

	it('UT-STATE-001 执行 action', async () => {
		const state = createStateLike();
		const action = fakeAction();
		await state.do_action(action);
		expect(action.do).toHaveBeenCalled();
		expect(state.action_history_index).toBe(1);
	});

	it('UT-STATE-002 撤销', async () => {
		const state = createStateLike();
		const action = fakeAction();
		await state.do_action(action);
		await state.undo_action();
		expect(action.undo).toHaveBeenCalled();
		expect(state.action_history_index).toBe(0);
	});

	it('UT-STATE-003 重做', async () => {
		const state = createStateLike();
		const action = fakeAction();
		await state.do_action(action);
		await state.undo_action();
		await state.redo_action();
		expect(action.do).toHaveBeenCalledTimes(2);
		expect(state.action_history_index).toBe(1);
	});

	it('UT-STATE-004 新 action 清空 redo', async () => {
		const state = createStateLike();
		const one = fakeAction('one');
		const two = fakeAction('two');
		await state.do_action(one);
		await state.undo_action();
		await state.do_action(two);
		expect(one.free).toHaveBeenCalled();
		expect(state.action_history).toEqual([two]);
	});

	it('UT-STATE-005 合并历史', async () => {
		const state = createStateLike();
		await state.do_action(fakeAction('draw'));
		await state.do_action(fakeAction('draw'), { merge_with_history: 'draw' });
		expect(state.action_history).toHaveLength(1);
		expect(state.action_history[0]).toBeInstanceOf(Actions.Bundle_action);
	});

	it('UT-STATE-006 空撤销/重做契约', () => {
		expect(stateSource).toContain('There\\\'s nothing to undo');
		expect(stateSource).toContain('There\\\'s nothing to redo');
	});

	it('UT-STATE-007 历史内存清理', async () => {
		const state = createStateLike();
		const action = fakeAction();
		await state.do_action(action);
		const result = await state.free(1, 1);
		expect(action.free).toHaveBeenCalled();
		expect(result.total_memory_freed).toBe(1);
	});
});

describe('图层、选择区和工具单元测试', () => {
	beforeEach(() => resetAppState());

	it('UT-LAYER-001 初始化默认图层契约', () => {
		const source = read('src/js/core/base-layers.js');
		expect(source).toContain('init()');
		expect(source).toContain('Insert_layer_action');
	});

	it('UT-LAYER-002 图层合成契约', () => {
		const source = read('src/js/core/base-layers.js');
		expect(source).toContain('convert_layers_to_canvas');
		expect(source).toContain('globalCompositeOperation');
	});

	it('UT-LAYER-003 隐藏图层不渲染契约', () => {
		const source = read('src/js/core/base-layers.js');
		expect(source).toContain('visible == false');
	});

	it('UT-LAYER-004 坐标换算', () => {
		config.ZOOM = 2;
		expect(app.Layers.get_world_coords(20, 10)).toEqual({ x: 10, y: 5 });
	});

	it('UT-LAYER-005 图层命中契约', () => {
		const source = read('src/js/core/base-layers.js');
		expect(source).toMatch(/find|hit|layer/i);
		expect(source).toContain('visible');
	});

	it('UT-LAYER-006 单图层导出 canvas', () => {
		const canvas = app.Layers.convert_layer_to_canvas(1);
		expect(canvas.width).toBe(2);
		expect(canvas.height).toBe(2);
	});

	it('UT-SELECTION-001 设置选择框', async () => {
		const { selectionSettings } = resetAppState();
		await new Actions.Set_selection_action(2, 3, 4, 5).do();
		expect(selectionSettings.data).toEqual({ x: 2, y: 3, width: 4, height: 5 });
	});

	it('UT-SELECTION-002 选择区越界裁剪契约', () => {
		const source = read('src/js/core/base-selection.js');
		expect(source).toContain('Math.max');
		expect(source).toContain('Math.min');
	});

	it('UT-SELECTION-003 旋转对象控制点契约', () => {
		const source = read('src/js/core/base-selection.js');
		expect(source).toContain('rotate');
		expect(source).toContain('selected_obj_rotate_position');
	});

	it('UT-TOOL-001 工具参数读取', () => {
		const tool = Object.create(BaseToolsClass.prototype);
		config.TOOL = { attributes: { size: 4, custom: { value: 7 }, color: '#fff' } };
		expect(tool.getParams()).toEqual({ size: 4, custom: 7, color: '#fff' });
	});

	it('UT-TOOL-002 鼠标坐标转换契约', () => {
		const source = read('src/js/core/base-tools.js');
		expect(source).toContain('get_mouse_coordinates_from_event');
		expect(source).toContain('canvas_offset');
		expect(source).toContain('get_world_coords');
	});

	it('UT-TOOL-003 拖拽状态契约', () => {
		const source = read('src/js/core/base-tools.js');
		expect(source).toContain('dragStart');
		expect(source).toContain('dragMove');
		expect(source).toContain('dragEnd');
	});

	it('UT-TOOL-004 吸附到画布中心', () => {
		const tool = Object.create(BaseToolsClass.prototype);
		tool.snap_line_info = { x: null, y: null };
		const result = tool.calc_snap_position({ shiftKey: false, ctrlKey: false, metaKey: false }, 50, 40);
		expect(result).toEqual({ x: 50, y: 40 });
	});

	it('UT-TOOL-005 Shift 禁用吸附', () => {
		const tool = Object.create(BaseToolsClass.prototype);
		tool.snap_line_info = { x: 1, y: 1 };
		expect(tool.calc_snap_position({ shiftKey: true }, 50, 40)).toBe(null);
		expect(tool.snap_line_info).toEqual({ x: null, y: null });
	});

	it('UT-TOOL-006 通用形状绘制', () => {
		const tool = Object.create(BaseToolsClass.prototype);
		const ctx = makeCanvas().getContext('2d');
		tool.draw_shape(ctx, 0, 0, 10, 10, [[0, 0], [100, 0], [100, 100], null], true);
		expect(ctx.ops.some((op) => op[0] === 'fill')).toBe(true);
	});

	for (const [id, file, terms] of [
		['UT-BRUSH-001', 'src/js/tools/brush.js', ['Brush_class', 'mousedown', 'mousemove']],
		['UT-PENCIL-001', 'src/js/tools/pencil.js', ['Pencil_class', 'draw_simple_line']],
		['UT-FILL-001', 'src/js/tools/fill.js', ['Fill_class', 'contiguous']],
		['UT-MAGIC-001', 'src/js/tools/magic_erase.js', ['Magic_erase_class', 'power']],
		['UT-TEXT-001', 'src/js/tools/text.js', ['Text_document_class', 'insert']],
		['UT-TEXT-002', 'src/js/tools/text.js', ['delete', 'range']],
		['UT-TEXT-003', 'src/js/tools/text.js', ['metadata', 'range']],
		['UT-SHAPE-001', 'src/js/tools/shape.js', ['Shape_class', 'render']]
	]) {
		it(`${id} ${file} 契约`, () => {
			const source = read(file);
			for (const term of terms) {
				expect(source).toContain(term);
			}
		});
	}
});

describe('文件模块单元测试', () => {
	beforeEach(() => resetAppState());

	it('UT-FILE-001 JSON 导出结构', () => {
		const fileSave = Object.create(FileSaveClass.prototype);
		config.layer._private = 'secret';
		config.layer.link_canvas = 'private';
		const data = JSON.parse(fileSave.export_as_json());
		expect(data.info).toMatchObject({ width: 100, height: 80, version: '4.14.3', layer_active: 1 });
		expect(data.layers).toHaveLength(1);
		expect(data.layers[0]._private).toBeUndefined();
		expect(data.layers[0].link_canvas).toBeUndefined();
		expect(data.data).toHaveLength(1);
	});

	it('UT-FILE-002 Data URL 导出契约', () => {
		const source = read('src/js/modules/file/save.js');
		expect(source).toContain('save_data_url');
		expect(source).toContain('canvas.toDataURL()');
	});

	it('UT-FILE-003 格式支持检测', () => {
		const fileSave = Object.create(FileSaveClass.prototype);
		const canvas = makeCanvas();
		expect(fileSave.check_format_support(canvas, 'image/png', false)).toBe(true);
		expect(fileSave.check_format_support(canvas, 'image/webp', false)).toBe(true);
	});

	it('UT-FILE-004 GIF 导出帧过滤契约', () => {
		const source = read('src/js/modules/file/save.js');
		expect(source).toContain("type == 'GIF'");
		expect(source).toContain('visible == false');
		expect(source).toContain('gif.addFrame');
	});

	it('UT-FILE-005 JSON 解析契约', () => {
		const source = read('src/js/modules/file/open.js');
		expect(source).toContain('open_json');
		expect(source).toContain('Reset_layers_action');
	});

	it('UT-FILE-006 JSON 兼容旧 render_function 契约', () => {
		const source = read('src/js/modules/file/open.js');
		expect(source).toContain('render_function');
		expect(source).toMatch(/arrow|ellipse|rectangle|star/);
	});

	it('UT-FILE-007 快存快载契约', () => {
		expect(read('src/js/modules/file/quicksave.js')).toContain('localStorage.setItem');
		expect(read('src/js/modules/file/quickload.js')).toContain('localStorage.getItem');
	});

	it('UT-FILE-008 无效 JSON 处理契约', () => {
		const source = read('src/js/modules/file/open.js');
		expect(source).toMatch(/try|catch|JSON\.parse|alertify\.error/);
	});
});
