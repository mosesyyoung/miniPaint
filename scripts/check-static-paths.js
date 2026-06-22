#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const extensions = new Set(['.html', '.css', '.js', '.json']);
const ignoredDirs = new Set([
	'.git',
	'dist',
	'node_modules',
	'tests',
	'test-results',
	'test-reports',
]);
const ignoredFiles = new Set([
	'package-lock.json',
]);

const findings = [];

function shouldScanFile(filePath) {
	const ext = path.extname(filePath);
	if (!extensions.has(ext)) {
		return false;
	}
	if (ignoredFiles.has(path.basename(filePath))) {
		return false;
	}
	if (filePath.endsWith('.map')) {
		return false;
	}
	return true;
}

function walk(dir) {
	for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
		if (entry.isDirectory()) {
			if (!ignoredDirs.has(entry.name)) {
				walk(path.join(dir, entry.name));
			}
			continue;
		}
		if (entry.isFile()) {
			const filePath = path.join(dir, entry.name);
			if (shouldScanFile(filePath)) {
				scanFile(filePath);
			}
		}
	}
}

function isRootPath(value) {
	if (!value.startsWith('/') || value.startsWith('//')) {
		return false;
	}
	if (value.startsWith('/*')) {
		return false;
	}
	if (value === '/') {
		return false;
	}
	if (/[\s,]/.test(value)) {
		return false;
	}
	return /^\/(?:[A-Za-z0-9._~%-]+(?:[/?#]|$)|[?#])/.test(value);
}

function addFinding(filePath, content, index, value, kind) {
	const before = content.slice(0, index);
	const line = before.split(/\r\n|\r|\n/).length;
	const lineStart = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r')) + 1;
	const column = index - lineStart + 1;
	const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

	findings.push({
		file: relPath,
		line,
		column,
		kind,
		value,
	});
}

function scanFile(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	const ext = path.extname(filePath);

	if (ext === '.css') {
		const cssUrlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s][^)]*?))\s*\)/g;
		for (const match of content.matchAll(cssUrlPattern)) {
			const value = (match[1] || match[2] || match[3] || '').trim();
			if (isRootPath(value)) {
				const offset = match.index + match[0].indexOf(value);
				addFinding(filePath, content, offset, value, 'CSS url()');
			}
		}
	}

	const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
	for (const match of content.matchAll(stringPattern)) {
		const value = match[2];
		if (isRootPath(value)) {
			const offset = match.index + 1;
			addFinding(filePath, content, offset, value, 'string literal');
		}
	}
}

walk(rootDir);

if (findings.length > 0) {
	console.error('Found root-relative static path references that can break sub-path deployments:');
	for (const finding of findings) {
		console.error(
			`${finding.file}:${finding.line}:${finding.column} ${finding.kind} ${JSON.stringify(finding.value)}`
		);
	}
	console.error('\nUse relative paths such as "images/favicon.png", "./service-worker.js", or "./dist/".');
	process.exit(1);
}

console.log('No root-relative static path references found.');
