#!/usr/bin/env node
// Pré-anota um texto do corpus com os detectores pt-BR atuais (SPEC §12.4, D6).
//
// Uso:
//   node scripts/locale/preannotate.mjs <texto.txt> --layer <camada> --scope <d1,d2,…>
//        [--source '<json com title, author, year, rights, url>'] [--embedded en,fr]
// Grava <texto>.annotations.json ao lado do texto com status "draft". Nunca sobrescreve um
// arquivo já revisado ("reviewed": exit 1). Requer `npm run build` (usa dist/).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const argv = process.argv.slice(2);
const value = (name) => {
	const i = argv.indexOf(name);
	return i === -1 ? undefined : argv[i + 1];
};
const fail = (message) => {
	console.error(`preannotate: ${message}`);
	process.exit(1);
};

const textPath = argv.find((a) => a.endsWith('.txt'));
if (!textPath) fail('missing <texto.txt>');
const layer = value('--layer');
if (!['classicos', 'contemporaneos', 'autor'].includes(layer))
	fail('--layer must be classicos, contemporaneos or autor');
const scope = (value('--scope') ?? '').split(',').filter(Boolean);
if (!scope.length) fail('--scope needs at least one detector');

const { DETECTORS } = await import(
	pathToFileURL(join(ROOT, 'dist/locale/pt-BR/detectors.js')).href
);
for (const d of scope) if (!DETECTORS[d]) fail(`unknown detector ${d}`);

const outPath = textPath.replace(/\.txt$/, '.annotations.json');
const previous = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : undefined;
if (previous?.status === 'reviewed') fail(`${outPath} is reviewed; refusing to overwrite`);

const text = readFileSync(textPath, 'utf8');
const embedded = (value('--embedded') ?? '').split(',').filter(Boolean);
const spans = [];
for (const detector of scope)
	for (const p of DETECTORS[detector](text, { embedded })) {
		spans.push({
			id: `${detector.replace(/\W/g, '')}-${spans.length + 1}`,
			detector,
			start: p.start,
			end: p.end,
			text: text.slice(p.start, p.end),
			label: 'positive',
			...(p.value ? { value: p.value } : {}),
		});
	}

let commit = 'unknown';
try {
	commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
	// fora de um repositório git
}

const annotation = {
	schema: 'scrivener-ptbr-corpus/1',
	text: basename(textPath),
	sha256: createHash('sha256').update(text).digest('hex'),
	layer,
	source: value('--source') ? JSON.parse(value('--source')) : (previous?.source ?? null),
	status: 'draft',
	preannotatedBy: {
		tool: 'scripts/locale/preannotate.mjs',
		commit,
		date: new Date().toISOString().slice(0, 10),
	},
	reviewedBy: null,
	scope,
	...(embedded.length ? { embedded } : {}),
	spans,
	queries: previous?.queries ?? [],
};
writeFileSync(outPath, `${JSON.stringify(annotation, null, 2)}\n`);
console.log(`${basename(outPath)}: ${spans.length} draft spans (${scope.join(', ')})`);
