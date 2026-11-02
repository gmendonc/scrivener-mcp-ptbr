#!/usr/bin/env node
// Avalia os detectores pt-BR contra as anotações revisadas do corpus (SPEC §12.3; D5, D6, D16).
//
// Uso:
//   node scripts/locale/evaluate-corpus.mjs --layer <classicos|contemporaneos|autor|all>
//        [--detector <id>] [--check] [--out <arquivo>] [--no-write]
// Só anotações "reviewed" com sha256 válido contam. Casamento: sobreposição ≥ 50% do menor
// trecho; cada anotação casa uma predição. Promoção por camada: ≥ 30 predições e precisão ≥ 0,80.
// --check: exit 1 se um detector de scripts/locale/implemented.json não cumprir a regra.
// Saída: só números e ids. Requer `npm run build` (usa dist/).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
	const i = argv.indexOf(name);
	return i === -1 ? undefined : argv[i + 1];
};
const fail = (message) => {
	console.error(`evaluate-corpus: ${message}`);
	process.exit(1);
};

const MIN_PREDICTIONS = 30;
const MIN_PRECISION = 0.8;
const LAYERS = ['classicos', 'contemporaneos', 'autor'];

const layerArg = value('--layer');
if (!layerArg || ![...LAYERS, 'all'].includes(layerArg))
	fail('--layer must be classicos, contemporaneos, autor or all');
const layers = layerArg === 'all' ? LAYERS : [layerArg];
const only = value('--detector');
const { DETECTORS } = await import(
	pathToFileURL(join(ROOT, 'dist/locale/pt-BR/detectors.js')).href
);

function layerDir(layer) {
	if (layer === 'classicos') return join(ROOT, 'tests/fixtures/pt-BR/classicos');
	const base = process.env.SCRIVENER_PTBR_CORPUS_DIR;
	return base ? join(base, layer) : undefined;
}

function wilsonLower(tp, n, z = 1.96) {
	if (!n) return 0;
	const p = tp / n;
	const denom = 1 + (z * z) / n;
	const center = p + (z * z) / (2 * n);
	const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
	return Math.max(0, (center - margin) / denom);
}

function overlaps(a, b) {
	const inter = Math.min(a.end, b.end) - Math.max(a.start, b.start);
	return inter > 0 && inter >= 0.5 * Math.min(a.end - a.start, b.end - b.start);
}

const report = { date: new Date().toISOString().slice(0, 10), layers: {} };
for (const layer of layers) {
	const dir = layerDir(layer);
	const stats = {};
	const skipped = [];
	if (dir && existsSync(dir)) {
		for (const file of readdirSync(dir)
			.filter((f) => f.endsWith('.annotations.json'))
			.sort()) {
			const ann = JSON.parse(readFileSync(join(dir, file), 'utf8'));
			if (ann.schema !== 'scrivener-ptbr-corpus/1') fail(`${file}: unknown schema`);
			const text = readFileSync(join(dir, ann.text), 'utf8');
			if (createHash('sha256').update(text).digest('hex') !== ann.sha256) {
				skipped.push({ file, reason: 'sha256-mismatch' });
				continue;
			}
			for (const span of ann.spans)
				if (text.slice(span.start, span.end) !== span.text)
					fail(`${file}: span ${span.id} text does not match the slice`);
			if (ann.status !== 'reviewed') {
				skipped.push({ file, reason: 'not-reviewed' });
				continue;
			}
			for (const detector of ann.scope) {
				if (only && detector !== only) continue;
				if (!DETECTORS[detector]) fail(`${file}: unknown detector ${detector}`);
				const predictions = DETECTORS[detector](text, { embedded: ann.embedded });
				const positives = ann.spans.filter(
					(s) => s.detector === detector && s.label === 'positive'
				);
				const used = new Set();
				let tp = 0;
				for (const p of predictions) {
					const hit = positives.findIndex((s, i) => !used.has(i) && overlaps(p, s));
					if (hit >= 0) {
						used.add(hit);
						tp++;
					}
				}
				const s = (stats[detector] ??= {
					predictions: 0,
					tp: 0,
					fp: 0,
					positives: 0,
					texts: [],
				});
				s.predictions += predictions.length;
				s.tp += tp;
				s.fp += predictions.length - tp;
				s.positives += positives.length;
				s.texts.push(ann.text);
			}
		}
	} else
		skipped.push({
			dir: dir ?? '(SCRIVENER_PTBR_CORPUS_DIR not set)',
			reason: 'missing-layer',
		});
	for (const s of Object.values(stats)) {
		s.precision = s.predictions ? s.tp / s.predictions : 0;
		s.recall = s.positives ? s.tp / s.positives : 0;
		s.wilsonLower95 = wilsonLower(s.tp, s.predictions);
		s.status =
			s.predictions < MIN_PREDICTIONS
				? 'insufficient-sample'
				: s.precision >= MIN_PRECISION
					? 'meets-rule'
					: 'below-rule';
		// Camadas fora do repositório: só números, sem nomes de texto.
		if (layer !== 'classicos') delete s.texts;
	}
	report.layers[layer] = { detectors: stats, skipped };
}

const json = `${JSON.stringify(report, null, 2)}\n`;
const out = value('--out');
if (out) writeFileSync(out, json);
for (const layer of flag('--no-write') ? [] : layers.filter((l) => l !== 'classicos')) {
	const dets = report.layers[layer].detectors;
	if (!Object.keys(dets).length) continue;
	const dir = join(ROOT, 'docs/pt-br/avaliacao');
	mkdirSync(dir, { recursive: true });
	for (const [detector, s] of Object.entries(dets))
		writeFileSync(
			join(dir, `${report.date}-${layer}-${detector}.json`),
			`${JSON.stringify(s, null, 2)}\n`
		);
}
process.stdout.write(json);

if (flag('--check')) {
	const implementedPath = join(ROOT, 'scripts/locale/implemented.json');
	const implemented = existsSync(implementedPath)
		? JSON.parse(readFileSync(implementedPath, 'utf8'))
		: [];
	const failing = [];
	for (const detector of implemented)
		for (const layer of layers) {
			const s = report.layers[layer].detectors[detector];
			if (!s || s.status !== 'meets-rule')
				failing.push(`${detector}@${layer}: ${s?.status ?? 'no-data'}`);
		}
	if (failing.length) {
		console.error(
			`evaluate-corpus: implemented detectors below the rule:\n  ${failing.join('\n  ')}`
		);
		process.exit(1);
	}
}
