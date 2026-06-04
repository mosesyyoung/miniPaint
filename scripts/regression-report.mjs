import { spawn } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const reportsRoot = path.join(rootDir, 'test-reports');

const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const suiteDefinitions = {
	unit: {
		label: 'Unit Tests',
		command: npxBin,
		args: ({ jsonPath }) => ['vitest', 'run', '--reporter=json', `--outputFile=${jsonPath}`],
		type: 'vitest'
	},
	integration: {
		label: 'Integration Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/integration.spec.js', '--reporter=list,json'],
		type: 'playwright'
	},
	visual: {
		label: 'Visual Regression Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/visual.spec.js', '--reporter=list,json'],
		type: 'playwright'
	},
	io: {
		label: 'Import/Export Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/import-export.spec.js', '--reporter=list,json'],
		type: 'playwright'
	},
	'cross-browser': {
		label: 'Cross-Browser and Responsive Tests',
		command: npxBin,
		args: () => [
			'playwright',
			'test',
			'--config=playwright.cross-browser.config.js',
			'tests/e2e/cross-browser.spec.js',
			'--reporter=list,json'
		],
		type: 'playwright'
	},
	security: {
		label: 'Security and Exception Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/security.spec.js', '--reporter=list,json'],
		type: 'playwright'
	},
	performance: {
		label: 'Performance and Stability Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/performance.spec.js', '--reporter=list,json'],
		type: 'playwright'
	},
	a11y: {
		label: 'Accessibility and Keyboard Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/accessibility.spec.js', '--reporter=list,json'],
		type: 'playwright'
	},
	i18n: {
		label: 'Multi-Language Tests',
		command: npxBin,
		args: () => ['playwright', 'test', 'tests/e2e/i18n.spec.js', '--reporter=list,json'],
		type: 'playwright'
	}
};

const aliases = {
	all: 'all',
	e2e: 'integration',
	file: 'io',
	files: 'io',
	'import-export': 'io',
	accessibility: 'a11y',
	keyboard: 'a11y',
	cross: 'cross-browser',
	responsive: 'cross-browser',
	lang: 'i18n'
};

function printHelp() {
	console.log(`Usage:
  npm run test:regression -- --all
  npm run test:regression -- --suite unit,integration
  npm run test:regression -- unit visual io
  npm run test:regression -- --list

Available suites:
${Object.entries(suiteDefinitions).map(([name, suite]) => `  ${name.padEnd(14)} ${suite.label}`).join('\n')}

Reports are written to test-reports/regression-<timestamp>/`);
}

function parseArgs(argv) {
	const selected = [];
	let all = false;
	let list = false;

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		}
		if (arg === '--list') {
			list = true;
			continue;
		}
		if (arg === '--all') {
			all = true;
			continue;
		}
		if (arg === '--suite' || arg === '--suites') {
			const value = argv[index + 1];
			if (!value) {
				throw new Error(`${arg} requires a comma-separated suite list.`);
			}
			selected.push(...value.split(','));
			index++;
			continue;
		}
		if (arg.startsWith('--suite=')) {
			selected.push(...arg.slice('--suite='.length).split(','));
			continue;
		}
		if (arg.startsWith('--suites=')) {
			selected.push(...arg.slice('--suites='.length).split(','));
			continue;
		}
		if (arg.startsWith('-')) {
			throw new Error(`Unknown option: ${arg}`);
		}
		selected.push(...arg.split(','));
	}

	if (list) {
		return { list: true, suites: [] };
	}

	const normalized = selected
		.map((name) => name.trim().toLowerCase())
		.filter(Boolean)
		.map((name) => aliases[name] || name);

	if (all || normalized.length === 0 || normalized.includes('all')) {
		return { list: false, suites: Object.keys(suiteDefinitions) };
	}

	const unknown = normalized.filter((name) => !suiteDefinitions[name]);
	if (unknown.length > 0) {
		throw new Error(`Unknown suite(s): ${unknown.join(', ')}`);
	}

	return { list: false, suites: [...new Set(normalized)] };
}

function timestamp() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, '0');
	return [
		now.getFullYear(),
		pad(now.getMonth() + 1),
		pad(now.getDate())
	].join('') + '-' + [
		pad(now.getHours()),
		pad(now.getMinutes()),
		pad(now.getSeconds())
	].join('');
}

function durationText(ms) {
	if (!Number.isFinite(ms)) {
		return '-';
	}
	if (ms < 1000) {
		return `${Math.round(ms)} ms`;
	}
	return `${(ms / 1000).toFixed(1)} s`;
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

async function parseJsonFile(filePath) {
	if (!existsSync(filePath)) {
		return null;
	}
	const raw = await readFile(filePath, 'utf8');
	if (!raw.trim()) {
		return null;
	}
	return JSON.parse(raw);
}

function summarizeVitest(json) {
	if (!json) {
		return {};
	}
	return {
		total: json.numTotalTests,
		passed: json.numPassedTests,
		failed: json.numFailedTests,
		skipped: json.numPendingTests,
		durationMs: json.startTime && json.testResults
			? Math.max(...json.testResults.map((item) => item.endTime || json.startTime), json.startTime) - json.startTime
			: undefined
	};
}

function summarizePlaywright(json) {
	if (!json?.stats) {
		return {};
	}
	const stats = json.stats;
	const failed = (stats.unexpected || 0) + (stats.flaky || 0);
	const passed = stats.expected || 0;
	const skipped = stats.skipped || 0;
	return {
		total: passed + failed + skipped,
		passed,
		failed,
		skipped,
		durationMs: stats.duration
	};
}

async function runSuite(name, reportDir) {
	const suite = suiteDefinitions[name];
	const suiteDir = path.join(reportDir, name);
	await mkdir(suiteDir, { recursive: true });

	const jsonPath = path.join(suiteDir, 'results.json');
	const logPath = path.join(suiteDir, 'output.log');
	const log = createWriteStream(logPath, { flags: 'w' });
	const args = suite.args({ jsonPath });
	const env = {
		...process.env
	};

	if (suite.type === 'playwright') {
		env.PLAYWRIGHT_JSON_OUTPUT_NAME = jsonPath;
		env.PLAYWRIGHT_HTML_OPEN = 'never';
	}

	console.log(`\n[${name}] ${suite.label}`);
	console.log(`$ ${suite.command} ${args.join(' ')}`);

	const startTime = Date.now();
	const exitCode = await new Promise((resolve) => {
		const child = spawn(suite.command, args, {
			cwd: rootDir,
			env,
			shell: process.platform === 'win32'
		});

		child.stdout.on('data', (chunk) => {
			process.stdout.write(chunk);
			log.write(chunk);
		});
		child.stderr.on('data', (chunk) => {
			process.stderr.write(chunk);
			log.write(chunk);
		});
		child.on('error', (error) => {
			log.write(`\n[runner error] ${error.stack || error.message}\n`);
			resolve(1);
		});
		child.on('close', (code) => {
			resolve(code ?? 1);
		});
	});
	log.end();

	const durationMs = Date.now() - startTime;
	let parsed = null;
	let summary = {};
	let parseError = null;
	try {
		parsed = await parseJsonFile(jsonPath);
		summary = suite.type === 'vitest' ? summarizeVitest(parsed) : summarizePlaywright(parsed);
	} catch (error) {
		parseError = error.message;
	}

	return {
		name,
		label: suite.label,
		type: suite.type,
		exitCode,
		status: exitCode === 0 ? 'passed' : 'failed',
		durationMs: summary.durationMs ?? durationMs,
		total: summary.total,
		passed: summary.passed,
		failed: summary.failed,
		skipped: summary.skipped,
		jsonPath,
		logPath,
		parseError
	};
}

function markdownReport(results, startedAt, finishedAt, reportDir) {
	const failed = results.filter((item) => item.status !== 'passed');
	const totalTests = results.reduce((sum, item) => sum + (item.total || 0), 0);
	const passedTests = results.reduce((sum, item) => sum + (item.passed || 0), 0);
	const failedTests = results.reduce((sum, item) => sum + (item.failed || 0), 0);
	const skippedTests = results.reduce((sum, item) => sum + (item.skipped || 0), 0);

	const lines = [
		'# Regression Test Report',
		'',
		`- Started: ${startedAt.toISOString()}`,
		`- Finished: ${finishedAt.toISOString()}`,
		`- Duration: ${durationText(finishedAt.getTime() - startedAt.getTime())}`,
		`- Suites: ${results.length}`,
		`- Status: ${failed.length === 0 ? 'PASSED' : 'FAILED'}`,
		`- Tests: ${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped, ${totalTests} total`,
		'',
		'| Suite | Status | Passed | Failed | Skipped | Total | Duration | Artifacts |',
		'| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |'
	];

	for (const item of results) {
		const artifacts = [`[log](${path.relative(reportDir, item.logPath).replace(/\\/g, '/')})`];
		if (existsSync(item.jsonPath)) {
			artifacts.push(`[json](${path.relative(reportDir, item.jsonPath).replace(/\\/g, '/')})`);
		}
		lines.push([
			item.label,
			item.status.toUpperCase(),
			item.passed ?? '-',
			item.failed ?? '-',
			item.skipped ?? '-',
			item.total ?? '-',
			durationText(item.durationMs),
			artifacts.join(', ')
		].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
	}

	const parseErrors = results.filter((item) => item.parseError);
	if (parseErrors.length > 0) {
		lines.push('', '## Result Parse Warnings', '');
		for (const item of parseErrors) {
			lines.push(`- ${item.label}: ${item.parseError}`);
		}
	}

	return lines.join('\n') + '\n';
}

function htmlReport(markdown, results) {
	const rows = results.map((item) => `
		<tr class="${item.status}">
			<td>${escapeHtml(item.label)}</td>
			<td>${escapeHtml(item.status.toUpperCase())}</td>
			<td>${escapeHtml(item.passed ?? '-')}</td>
			<td>${escapeHtml(item.failed ?? '-')}</td>
			<td>${escapeHtml(item.skipped ?? '-')}</td>
			<td>${escapeHtml(item.total ?? '-')}</td>
			<td>${escapeHtml(durationText(item.durationMs))}</td>
			<td><a href="${encodeURI(`${item.name}/output.log`)}">log</a>${existsSync(item.jsonPath) ? `, <a href="${encodeURI(`${item.name}/results.json`)}">json</a>` : ''}</td>
		</tr>`).join('');

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>Regression Test Report</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 32px; color: #222; }
		table { border-collapse: collapse; width: 100%; margin-top: 24px; }
		th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
		th { background: #f4f4f4; }
		.passed td:nth-child(2) { color: #116329; font-weight: 700; }
		.failed td:nth-child(2) { color: #b42318; font-weight: 700; }
		pre { white-space: pre-wrap; background: #f7f7f7; padding: 16px; overflow: auto; }
	</style>
</head>
<body>
	<h1>Regression Test Report</h1>
	<table>
		<thead>
			<tr>
				<th>Suite</th>
				<th>Status</th>
				<th>Passed</th>
				<th>Failed</th>
				<th>Skipped</th>
				<th>Total</th>
				<th>Duration</th>
				<th>Artifacts</th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>
	<h2>Markdown Summary</h2>
	<pre>${escapeHtml(markdown)}</pre>
</body>
</html>`;
}

async function main() {
	const { list, suites } = parseArgs(process.argv.slice(2));
	if (list) {
		printHelp();
		return;
	}

	const reportDir = path.join(reportsRoot, `regression-${timestamp()}`);
	await mkdir(reportDir, { recursive: true });

	const startedAt = new Date();
	const results = [];
	for (const suite of suites) {
		results.push(await runSuite(suite, reportDir));
	}
	const finishedAt = new Date();

	const summaryJsonPath = path.join(reportDir, 'summary.json');
	const summaryMdPath = path.join(reportDir, 'summary.md');
	const summaryHtmlPath = path.join(reportDir, 'summary.html');
	const summaryJson = {
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		durationMs: finishedAt.getTime() - startedAt.getTime(),
		status: results.every((item) => item.status === 'passed') ? 'passed' : 'failed',
		results
	};
	const markdown = markdownReport(results, startedAt, finishedAt, reportDir);

	await writeFile(summaryJsonPath, JSON.stringify(summaryJson, null, 2), 'utf8');
	await writeFile(summaryMdPath, markdown, 'utf8');
	await writeFile(summaryHtmlPath, htmlReport(markdown, results), 'utf8');

	console.log('\nRegression report generated:');
	console.log(`  ${summaryMdPath}`);
	console.log(`  ${summaryHtmlPath}`);

	if (summaryJson.status !== 'passed') {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
