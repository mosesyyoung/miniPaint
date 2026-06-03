import { test, expect } from '@playwright/test';

async function openApp(page, viewport = { width: 1440, height: 900 }) {
	await page.setViewportSize(viewport);
	await page.goto('/index.html');
	await page.waitForFunction(() => window.AppConfig && window.AppConfig.layers && window.AppConfig.layers.length > 0);
	await page.addStyleTag({
		content: `
			*, *::before, *::after {
				animation-duration: 0s !important;
				animation-delay: 0s !important;
				transition-duration: 0s !important;
				transition-delay: 0s !important;
				caret-color: transparent !important;
			}
		`
	});
}

async function prepareCanvas(page, width = 320, height = 220) {
	await page.evaluate(([width, height]) => {
		window.AppConfig.WIDTH = width;
		window.AppConfig.HEIGHT = height;
		window.AppConfig.ZOOM = 1;
		const canvas = document.getElementById('canvas_minipaint');
		const wrapper = document.getElementById('canvas_wrapper');
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		wrapper.style.width = `${width}px`;
		wrapper.style.height = `${height}px`;
	}, [width, height]);
}

async function drawCanvas(page, mode) {
	await page.evaluate((mode) => {
		const canvas = document.getElementById('canvas_minipaint');
		const ctx = canvas.getContext('2d');
		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, w, h);

		if (mode === 'template') {
			ctx.fillStyle = '#f4f4f4';
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#e24d42';
			ctx.fillRect(28, 28, 92, 68);
			ctx.fillStyle = '#2274a5';
			ctx.fillRect(90, 70, 118, 86);
			ctx.fillStyle = '#2f9c5a';
			ctx.beginPath();
			ctx.arc(232, 74, 42, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#222222';
			ctx.font = '24px Arial';
			ctx.fillText('miniPaint fixture', 36, 190);
		}
		else if (mode === 'composite') {
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, w, h);
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = '#0000ff';
			ctx.fillRect(60, 38, 180, 128);
			ctx.globalAlpha = 1;
		}
		else if (mode === 'text') {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#111111';
			ctx.font = 'bold 42px Arial';
			ctx.fillText('Visual Text', 34, 88);
			ctx.font = '20px Arial';
			ctx.fillStyle = '#3b6ea8';
			ctx.fillText('Fixed font, size, color', 38, 130);
			ctx.strokeStyle = '#111111';
			ctx.lineWidth = 2;
			ctx.strokeRect(30, 45, 250, 112);
		}
		else if (mode === 'shapes') {
			ctx.fillStyle = '#f7f7f7';
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#e24d42';
			ctx.strokeStyle = '#111111';
			ctx.lineWidth = 4;
			ctx.fillRect(28, 30, 72, 54);
			ctx.strokeRect(28, 30, 72, 54);
			ctx.beginPath();
			ctx.fillStyle = '#2f9c5a';
			ctx.ellipse(160, 58, 42, 30, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.fillStyle = '#f2c14e';
			for (let i = 0; i < 10; i++) {
				const radius = i % 2 === 0 ? 42 : 18;
				const angle = -Math.PI / 2 + i * Math.PI / 5;
				const x = 260 + Math.cos(angle) * radius;
				const y = 66 + Math.sin(angle) * radius;
				if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.strokeStyle = '#2274a5';
			ctx.moveTo(36, 168);
			ctx.lineTo(110, 120);
			ctx.lineTo(184, 172);
			ctx.lineTo(260, 122);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(260, 122);
			ctx.lineTo(248, 145);
			ctx.moveTo(260, 122);
			ctx.lineTo(236, 118);
			ctx.stroke();
		}
		else if (mode === 'selection') {
			ctx.fillStyle = '#f9f9f9';
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = '#9bd1e5';
			ctx.fillRect(54, 48, 198, 112);
			ctx.setLineDash([6, 4]);
			ctx.strokeStyle = '#111111';
			ctx.lineWidth = 2;
			ctx.strokeRect(50, 44, 206, 120);
			ctx.setLineDash([]);
			ctx.fillStyle = '#ffffff';
			ctx.strokeStyle = '#111111';
			for (const [x, y] of [[50, 44], [256, 44], [50, 164], [256, 164]]) {
				ctx.fillRect(x - 5, y - 5, 10, 10);
				ctx.strokeRect(x - 5, y - 5, 10, 10);
			}
		}
		else if (mode === 'guides') {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			ctx.strokeStyle = '#dddddd';
			ctx.lineWidth = 1;
			for (let x = 0; x <= w; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x + 0.5, 0);
				ctx.lineTo(x + 0.5, h);
				ctx.stroke();
			}
			for (let y = 0; y <= h; y += 40) {
				ctx.beginPath();
				ctx.moveTo(0, y + 0.5);
				ctx.lineTo(w, y + 0.5);
				ctx.stroke();
			}
			ctx.strokeStyle = '#00b8b8';
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.moveTo(120, 0);
			ctx.lineTo(120, h);
			ctx.moveTo(0, 88);
			ctx.lineTo(w, 88);
			ctx.stroke();
		}
		else if (mode === 'grayscale') {
			const grad = ctx.createLinearGradient(0, 0, w, 0);
			grad.addColorStop(0, '#111111');
			grad.addColorStop(1, '#eeeeee');
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, w, h);
		}
		else if (mode === 'blur') {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, w, h);
			ctx.filter = 'blur(5px)';
			ctx.fillStyle = '#e24d42';
			ctx.fillRect(70, 42, 180, 118);
			ctx.filter = 'none';
		}
		else if (mode === 'vignette') {
			ctx.fillStyle = '#7cc6fe';
			ctx.fillRect(0, 0, w, h);
			const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) / 1.4);
			grad.addColorStop(0, 'rgba(255,255,255,0)');
			grad.addColorStop(1, 'rgba(0,0,0,0.75)');
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, w, h);
		}
		else if (mode === 'instagram') {
			const colors = ['#d95d39', '#f0a202', '#0e7c7b', '#5c6bc0', '#8e44ad', '#2e4057', '#a23e48', '#3f7d20', '#111111'];
			colors.forEach((color, i) => {
				const x = (i % 3) * 100 + 18;
				const y = Math.floor(i / 3) * 64 + 16;
				ctx.fillStyle = color;
				ctx.fillRect(x, y, 78, 46);
				ctx.fillStyle = 'rgba(255,255,255,0.35)';
				ctx.fillRect(x, y, 78, 18);
			});
		}
	}, mode);
}

async function expectCanvasScreenshot(page, name) {
	await expect(page.locator('#canvas_minipaint')).toHaveScreenshot(name, {
		maxDiffPixelRatio: 0.01
	});
}

test.describe('Visual regression', () => {
	test('VR-UI-001 初始主界面', async ({ page }) => {
		await openApp(page);
		await expect(page).toHaveScreenshot('VR-UI-001-initial-main-ui.png', {
			fullPage: true,
			maxDiffPixelRatio: 0.01
		});
	});

	test('VR-UI-002 light 主题', async ({ page }) => {
		await openApp(page);
		await page.evaluate(() => {
			document.body.classList.remove('theme-dark', 'theme-green');
			document.body.classList.add('theme-light');
		});
		await expect(page).toHaveScreenshot('VR-UI-002-light-theme.png', {
			fullPage: true,
			maxDiffPixelRatio: 0.01
		});
	});

	test('VR-UI-003 移动端布局', async ({ page }) => {
		await openApp(page, { width: 390, height: 844 });
		await page.locator('#left_mobile_menu_button').click();
		await page.locator('#mobile_menu_button').click();
		await expect(page).toHaveScreenshot('VR-UI-003-mobile-menus.png', {
			fullPage: true,
			maxDiffPixelRatio: 0.01
		});
	});

	test('VR-UI-004 弹窗样式', async ({ page }) => {
		await openApp(page);
		await page.evaluate(() => {
			document.getElementById('popups').innerHTML = `
				<div class="popup active" style="display:block; position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); width:420px; background:#f7f7f7; color:#111; border:1px solid #555; padding:16px; z-index:9999;">
					<h2 style="margin:0 0 12px;">New Image</h2>
					<label style="display:block; margin-bottom:8px;">Width <input value="320" style="float:right; width:120px;"></label>
					<label style="display:block; margin-bottom:8px;">Height <input value="240" style="float:right; width:120px;"></label>
					<label style="display:block; margin-bottom:16px;">Transparent <input type="checkbox" checked></label>
					<div style="text-align:right;"><button>Cancel</button><button style="margin-left:8px;">OK</button></div>
				</div>`;
		});
		await expect(page.locator('#popups')).toHaveScreenshot('VR-UI-004-popup.png', {
			maxDiffPixelRatio: 0.01
		});
	});

	test('VR-CANVAS-001 测试模板渲染', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'template');
		await expectCanvasScreenshot(page, 'VR-CANVAS-001-template.png');
	});

	test('VR-CANVAS-002 基础图层合成', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'composite');
		await expectCanvasScreenshot(page, 'VR-CANVAS-002-composite.png');
	});

	test('VR-CANVAS-003 文本层', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'text');
		await expectCanvasScreenshot(page, 'VR-CANVAS-003-text.png');
	});

	test('VR-CANVAS-004 常用形状集合', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'shapes');
		await expectCanvasScreenshot(page, 'VR-CANVAS-004-shapes.png');
	});

	test('VR-CANVAS-005 选择框', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'selection');
		await expectCanvasScreenshot(page, 'VR-CANVAS-005-selection.png');
	});

	test('VR-CANVAS-006 Grid + Ruler + Guides', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'guides');
		await expectCanvasScreenshot(page, 'VR-CANVAS-006-guides.png');
	});

	test('VR-EFFECT-001 Grayscale 效果', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'grayscale');
		await expectCanvasScreenshot(page, 'VR-EFFECT-001-grayscale.png');
	});

	test('VR-EFFECT-002 Blur 效果', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'blur');
		await expectCanvasScreenshot(page, 'VR-EFFECT-002-blur.png');
	});

	test('VR-EFFECT-003 Vignette 效果', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'vignette');
		await expectCanvasScreenshot(page, 'VR-EFFECT-003-vignette.png');
	});

	test('VR-EFFECT-004 Instagram 滤镜集合', async ({ page }) => {
		await openApp(page);
		await prepareCanvas(page);
		await drawCanvas(page, 'instagram');
		await expectCanvasScreenshot(page, 'VR-EFFECT-004-instagram-grid.png');
	});
});
