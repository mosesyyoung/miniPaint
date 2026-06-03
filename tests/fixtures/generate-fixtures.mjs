import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const outDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

function crc32(buffer) {
	let crc = ~0;
	for (let i = 0; i < buffer.length; i++) {
		crc ^= buffer[i];
		for (let j = 0; j < 8; j++) {
			crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
		}
	}
	return ~crc >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
	const typeBuffer = Buffer.from(type, 'ascii');
	const lengthBuffer = Buffer.alloc(4);
	lengthBuffer.writeUInt32BE(data.length, 0);
	const crcBuffer = Buffer.alloc(4);
	crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
	return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function png(width, height, pixelFn) {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const rawRows = [];
	for (let y = 0; y < height; y++) {
		const row = Buffer.alloc(1 + width * 4);
		row[0] = 0;
		for (let x = 0; x < width; x++) {
			const [r, g, b, a] = pixelFn(x, y);
			const offset = 1 + x * 4;
			row[offset] = r;
			row[offset + 1] = g;
			row[offset + 2] = b;
			row[offset + 3] = a;
		}
		rawRows.push(row);
	}

	return Buffer.concat([
		signature,
		chunk('IHDR', ihdr),
		chunk('IDAT', zlib.deflateSync(Buffer.concat(rawRows))),
		chunk('IEND')
	]);
}

function write(name, data) {
	fs.writeFileSync(path.join(outDir, name), data);
}

const redPng = png(1, 1, () => [255, 0, 0, 255]);
write('sample-1x1.png', redPng);

write('sample-transparent.png', png(4, 4, (x, y) => {
	if (x < 2 && y < 2) return [255, 0, 0, 255];
	return [0, 0, 0, 0];
}));

write('sample-checker.png', png(16, 16, (x, y) => {
	const white = (x + y) % 2 === 0;
	return white ? [255, 255, 255, 255] : [0, 0, 0, 255];
}));

write('sample-quadrants.png', png(16, 16, (x, y) => {
	if (x < 8 && y < 8) return [255, 0, 0, 255];
	if (x >= 8 && y < 8) return [0, 255, 0, 255];
	if (x < 8 && y >= 8) return [0, 0, 255, 255];
	return [255, 255, 255, 255];
}));

write('sample-large.png', png(3000, 2000, (x, y) => {
	if ((Math.floor(x / 100) + Math.floor(y / 100)) % 2 === 0) return [240, 240, 240, 255];
	return [64, 128, 192, 255];
}));

// 1x1 red JPEG.
write('sample-photo.jpg', Buffer.from(
	'/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgL/2wBDAQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Ap//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
	'base64'
));

// 2-frame 1x1 GIF: red then blue.
write('sample-animated.gif', Buffer.from(
	'R0lGODlhAQABAIEAAP8AAAAA/wAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJAAEAAAAAACH5BAkAAQAAAAAALAAAAAABAAEAAAICRAEAOw==',
	'base64'
));

const layerDataUrl = `data:image/png;base64,${redPng.toString('base64')}`;
const baseLayer = {
	id: 1,
	parent_id: 0,
	name: 'Fixture Image Layer',
	type: 'image',
	link: null,
	x: 0,
	y: 0,
	width: 1,
	width_original: 1,
	height: 1,
	height_original: 1,
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

write('sample-layers.json', JSON.stringify({
	info: {
		width: 16,
		height: 16,
		about: 'Image data with multi-layers. Can be opened using miniPaint - https://github.com/viliusle/miniPaint',
		date: '2026-06-03',
		version: '4.14.3',
		layer_active: 2,
		guides: [{ x: 8, y: null }, { x: null, y: 8 }]
	},
	user_fonts: {},
	layers: [
		baseLayer,
		{
			id: 2,
			parent_id: 0,
			name: 'Fixture Text Layer',
			type: 'text',
			link: null,
			x: 2,
			y: 2,
			width: 12,
			width_original: null,
			height: 8,
			height_original: null,
			visible: true,
			is_vector: true,
			hide_selection_if_active: false,
			opacity: 100,
			order: 2,
			composition: 'source-over',
			rotate: 0,
			data: 'Fixture\nText',
			params: { size: 12, font: 'Arial', fill: '#000000' },
			status: null,
			color: '#000000',
			filters: [],
			render_function: ['text', 'render']
		}
	],
	data: [{ id: 1, data: layerDataUrl }]
}, null, '\t'));

write('sample-old-layers.json', JSON.stringify({
	info: {
		width: 16,
		height: 16,
		about: 'Legacy miniPaint fixture',
		date: '2026-06-03',
		version: '3.0.0',
		layer_active: 1,
		guides: []
	},
	user_fonts: {},
	layers: [
		{
			...baseLayer,
			name: 'Legacy Rectangle',
			type: 'rectangle',
			is_vector: true,
			width: 10,
			height: 10,
			data: null,
			params: { border: true, fill: true, border_color: '#000000', fill_color: '#ffffff' },
			render_function: 'rectangle'
		}
	],
	data: []
}, null, '\t'));

write('sample-invalid.json', '{ "info": { "width": 16, "height": 16 }, "layers": [');
