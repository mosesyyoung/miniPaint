import { vi } from 'vitest';
import jquery from 'jquery';

globalThis.VERSION = '4.14.3';
globalThis.$ = jquery;
globalThis.jQuery = jquery;
window.$ = jquery;
window.jQuery = jquery;

class MockCanvasContext2D {
	constructor(canvas) {
		this.canvas = canvas;
		this.fillStyle = '#000000';
		this.strokeStyle = '#000000';
		this.lineWidth = 1;
		this.globalCompositeOperation = 'source-over';
		this.imageSmoothingEnabled = true;
		this.webkitImageSmoothingEnabled = true;
		this.oImageSmoothingEnabled = true;
		this.msImageSmoothingEnabled = true;
		this.ops = [];
	}
	beginPath() { this.ops.push(['beginPath']); }
	closePath() { this.ops.push(['closePath']); }
	moveTo(x, y) { this.ops.push(['moveTo', x, y]); }
	lineTo(x, y) { this.ops.push(['lineTo', x, y]); }
	rect(x, y, w, h) { this.ops.push(['rect', x, y, w, h]); }
	ellipse(...args) { this.ops.push(['ellipse', ...args]); }
	arc(...args) { this.ops.push(['arc', ...args]); }
	fill() { this.ops.push(['fill', this.fillStyle]); }
	stroke() { this.ops.push(['stroke', this.strokeStyle]); }
	clearRect(x, y, w, h) { this.ops.push(['clearRect', x, y, w, h]); }
	fillRect(x, y, w, h) { this.ops.push(['fillRect', x, y, w, h, this.fillStyle]); }
	drawImage(...args) { this.ops.push(['drawImage', ...args]); }
	putImageData(...args) { this.ops.push(['putImageData', ...args]); }
	save() { this.ops.push(['save']); }
	restore() { this.ops.push(['restore']); }
	rotate(value) { this.ops.push(['rotate', value]); }
	translate(x, y) { this.ops.push(['translate', x, y]); }
	scale(x, y) { this.ops.push(['scale', x, y]); }
	measureText(text) { return { width: String(text).length * 10 }; }
	fillText(text, x, y) { this.ops.push(['fillText', text, x, y]); }
	strokeText(text, x, y) { this.ops.push(['strokeText', text, x, y]); }
	createRadialGradient() {
		return { addColorStop: vi.fn() };
	}
	createLinearGradient() {
		return { addColorStop: vi.fn() };
	}
	getImageData(x, y, width, height) {
		return {
			x,
			y,
			width,
			height,
			data: new Uint8ClampedArray(Math.max(1, width * height * 4)).fill(0)
		};
	}
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
	value(type) {
		if (type !== '2d') {
			return null;
		}
		if (!this.__mockContext) {
			this.__mockContext = new MockCanvasContext2D(this);
		}
		return this.__mockContext;
	}
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
	value(type = 'image/png') {
		return `data:${type};base64,AAAA`;
	}
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
	value(callback, type = 'image/png') {
		callback(new Blob(['mock-canvas'], { type }));
	}
});

globalThis.Image = class MockImage {
	constructor() {
		this.width = 10;
		this.height = 10;
		this.onload = null;
		this.onerror = null;
		this.crossOrigin = null;
		this._src = '';
	}
	set src(value) {
		this._src = value;
		setTimeout(() => this.onload && this.onload(), 0);
	}
	get src() {
		return this._src;
	}
	cloneNode() {
		const image = new MockImage();
		image.width = this.width;
		image.height = this.height;
		image.src = this.src;
		return image;
	}
};

globalThis.Path2D = class MockPath2D {
	arc() {}
};

if (!globalThis.URL.createObjectURL) {
	globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
}

Object.defineProperty(window, 'performance', {
	value: {
		memory: {
			usedJSHeapSize: 0,
			jsHeapSizeLimit: Number.MAX_SAFE_INTEGER
		}
	},
	configurable: true
});

document.body.innerHTML = '<div id="popups"></div><canvas id="canvas_minipaint"></canvas><div id="main_wrapper"></div>';
