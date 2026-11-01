#!/usr/bin/env node
// Falha quando algum arquivo de src/, fora de src/locale/engines/, carrega uma biblioteca nativa
// só-inglês sem passar pela fachada (SPEC §8.3). A regra de lint cobre `import ... from`; este
// script cobre também require, require.resolve, createRequire(...).resolve e import().
//
// Uso: node scripts/locale/check-native-escapes.mjs [--root <dir>]
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const NATIVE = String.raw`(?:narrative-lens|bluepencil-node|compromise)(?:/[^'"\x60]*)?`;
const QUOTED = String.raw`['"\x60]${NATIVE}['"\x60]`;
const PATTERNS = [
	{ kind: 'import from', re: new RegExp(String.raw`(?:^|[\n;])\s*import\s+(?!type\s)[^'";]*?from\s*${QUOTED}`, 'g') },
	{ kind: 'export from', re: new RegExp(String.raw`(?:^|[\n;])\s*export\s+(?!type\s)[^'";]*?from\s*${QUOTED}`, 'g') },
	{ kind: 'side-effect import', re: new RegExp(String.raw`(?:^|[\n;])\s*import\s*${QUOTED}`, 'g') },
	{ kind: 'dynamic import', re: new RegExp(String.raw`import\s*\(\s*${QUOTED}\s*\)`, 'g') },
	{ kind: 'require', re: new RegExp(String.raw`require\s*\(\s*${QUOTED}\s*\)`, 'g') },
	{ kind: 'resolve', re: new RegExp(String.raw`\.resolve\s*\(\s*${QUOTED}`, 'g') },
];

// Exceções fixas, cada uma com o motivo.
const EXCEPTIONS = new Map([
	[
		'src/services/editorial/lens-native.cts',
		'resolves narrative-lens for the child process; gated per tool by withLocale (SPEC §8.1)',
	],
]);

function argValue(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? undefined : process.argv[i + 1];
}

function* walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(path);
		else if (/\.(?:[cm]?ts|[cm]?js)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) yield path;
	}
}

const root = argValue('--root') ?? join(fileURLToPath(import.meta.url), '..', '..', '..');
const findings = [];
for (const file of walk(join(root, 'src'))) {
	const rel = relative(root, file).split(sep).join('/');
	if (rel.startsWith('src/locale/engines/') || EXCEPTIONS.has(rel)) continue;
	const source = readFileSync(file, 'utf8');
	for (const { kind, re } of PATTERNS) {
		for (const match of source.matchAll(re)) {
			const line = source.slice(0, match.index + match[0].search(/\S/)).split('\n').length;
			findings.push(`${rel}:${line} ${kind}: ${match[0].trim().replace(/\s+/g, ' ')}`);
		}
	}
}

if (findings.length) {
	console.error('Native library loaded outside src/locale/engines/:');
	for (const f of findings) console.error(`  ${f}`);
	process.exit(1);
}
console.log(`Native escapes: none (exceptions: ${[...EXCEPTIONS.keys()].join(', ')}).`);
