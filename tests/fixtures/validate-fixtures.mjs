import fs from 'fs';
import path from 'path';

const outDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

function read(name) {
	return fs.readFileSync(path.join(outDir, name));
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

for (const name of [
	'sample-1x1.png',
	'sample-transparent.png',
	'sample-checker.png',
	'sample-quadrants.png',
	'sample-large.png'
]) {
	const data = read(name);
	assert(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${name} is not PNG`);
	assert(data.length > 50, `${name} is too small`);
}

assert(read('sample-photo.jpg').subarray(0, 2).equals(Buffer.from([0xff, 0xd8])), 'sample-photo.jpg is not JPEG');
assert(read('sample-animated.gif').subarray(0, 6).toString('ascii') === 'GIF89a', 'sample-animated.gif is not GIF89a');

const layers = JSON.parse(read('sample-layers.json').toString('utf8'));
assert(layers.info.width === 16 && layers.info.height === 16, 'sample-layers.json dimensions mismatch');
assert(Array.isArray(layers.layers) && layers.layers.length === 2, 'sample-layers.json layer count mismatch');
assert(Array.isArray(layers.data) && layers.data.length === 1, 'sample-layers.json data count mismatch');

const oldLayers = JSON.parse(read('sample-old-layers.json').toString('utf8'));
assert(oldLayers.info.version === '3.0.0', 'sample-old-layers.json version mismatch');
assert(oldLayers.layers[0].render_function === 'rectangle', 'sample-old-layers.json legacy render_function mismatch');

let invalidFailed = false;
try {
	JSON.parse(read('sample-invalid.json').toString('utf8'));
} catch {
	invalidFailed = true;
}
assert(invalidFailed, 'sample-invalid.json should be invalid');

console.log('fixtures valid');
