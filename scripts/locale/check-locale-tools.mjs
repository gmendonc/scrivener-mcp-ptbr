#!/usr/bin/env node
// Confere que o fork só toca arquivos do upstream nos pontos de injeção da SPEC §9 (R1.14).
//
// Uso:
//   node scripts/locale/check-locale-tools.mjs                 compara com upstream/main
//   node scripts/locale/check-locale-tools.mjs --list-imports  nomes de valor importados das fachadas
//   --base <ref>  base da comparação (padrão: upstream/main)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

// Fases entregues; cada uma libera os arquivos do upstream que a SPEC §9 lista para ela.
const DELIVERED_PHASES = [1, 'C', 2];

const INJECTION_POINTS = {
	1: [
		// §9.A — troca de import nativo → fachada
		'src/analysis/advanced-readability.ts',
		'src/analysis/base-analyzer.ts',
		'src/analysis/context-analyzer.ts',
		'src/analysis/ml-word-classifier-pro.ts',
		'src/analysis/analyzers/metrics-analyzer.ts',
		'src/analysis/analyzers/pacing-analyzer.ts',
		'src/analysis/analyzers/quality-analyzer.ts',
		'src/analysis/analyzers/structure-analyzer.ts',
		'src/analysis/analyzers/style-analyzer.ts',
		'src/analysis/analyzers/suggestion-generator.ts',
		'src/handlers/analysis-handlers/document-analysis.ts',
		'src/handlers/bluepencil-handlers.ts',
		'src/handlers/narrative-lens-handlers.ts',
		'src/services/analysis/nlp-sentiment-analyzer.ts',
		'src/services/editorial/narrative-analysis.ts',
		'src/services/editorial/workflow-service.ts',
		'src/services/enhancements/ai-content-enhancer.ts',
		'src/services/queue/job-queue.ts',
		'src/utils/text-metrics.ts',
		// §9.B — text-metrics → fachada
		'src/analysis/analyzers/emotion-analyzer.ts',
		'src/handlers/analysis-handlers/content-generation.ts',
		'src/handlers/compilation-handlers.ts',
		'src/services/compilation-service.ts',
		'src/services/compilation/ai-compiler.ts',
		'src/services/document-indexer.ts',
		'src/services/project-reports.ts',
		'src/services/project-snapshots.ts',
		// reexportação de text-metrics que contornava a fachada (Desvios, estágio 2)
		'src/utils/common.ts',
		// §9.C, §9.D, §9.E, §9.F
		'src/handlers/skill-registry.ts',
		'eslint.config.js',
		'src/handlers/project-handlers/lifecycle.ts',
	],
	3: [
		// §9.G
		'src/analysis/ai-document-analyzer.ts',
		'src/services/agents/ai-collaboration.ts',
		'src/services/ai/ai-writing-service.ts',
	],
	4: ['src/services/editorial/passage-search.ts', 'src/services/editorial/continuity-service.ts'],
	C: [
		// §9.L — correções do upstream (D21)
		'src/services/parsers/rtf-handler.ts',
		'src/services/parsers/rtf-splice.ts',
		'src/services/project-writer.ts',
		'src/services/binder-editor.ts',
		'src/services/document-manager-helpers.ts',
		'src/services/project-trash.ts',
		'src/services/project-reports.ts',
		'src/handlers/compilation-handlers.ts',
		'src/services/ai/ai-client.ts',
		'src/services/ai/writing-suggestions.ts',
		'src/core/response-formatter.ts',
		'src/handlers/async-handlers.ts',
		'src/services/queue/job-queue.ts',
		// testes do upstream que afirmavam o defeito (Desvios do estágio C)
		'tests/unit/services/document-manager.test.ts',
		'tests/unit/services/document-manager-binder-moves.test.ts',
	],
};

// Arquivos e diretórios próprios do fork (SPEC §0).
const FORK_PATHS = [
	'src/locale/',
	'src/fixes/',
	'scripts/locale/',
	'tests/unit/locale/',
	'tests/integration/locale/',
	'tests/unit/fixes/',
	'tests/integration/fixes/',
	'tests/fixtures/pt-BR/',
	'tests/fixtures/fixes/',
	'docs/pt-br/',
	'docs/adr/',
	'.github/workflows/ptbr.yml',
	'SPEC.md',
	'PLAN.md',
];

const FACADES = ['narrative-lens', 'bluepencil', 'compromise', 'compromise-pos', 'text-metrics'];

function git(...args) {
	return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' })
		.split('\n')
		.filter(Boolean);
}

function argValue(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? undefined : process.argv[i + 1];
}

function* walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(path);
		else if (/\.c?ts$/.test(entry.name) && !entry.name.endsWith('.d.ts')) yield path;
	}
}

/** Nomes de valor que o código do upstream importa de cada fachada. */
function listImports() {
	const imports = Object.fromEntries(FACADES.map((f) => [f, new Set()]));
	const re = /import\s+(?!type\s)([^;]*?)\s+from\s*['"][./]*locale\/engines\/([\w-]+)\.js['"]/gs;
	for (const file of walk(join(ROOT, 'src'))) {
		const rel = relative(ROOT, file).split(sep).join('/');
		if (rel.startsWith('src/locale/')) continue;
		for (const [, clause, facade] of readFileSync(file, 'utf8').matchAll(re)) {
			const names = imports[facade];
			if (!names) throw new Error(`${rel}: unknown facade ${facade}`);
			const named = clause.match(/\{([^}]*)\}/s);
			const defaultName = clause.replace(/\{[^}]*\}/s, '').replace(/,/g, '').trim();
			if (defaultName) names.add('default');
			for (const spec of named ? named[1].split(',') : []) {
				const s = spec.trim();
				if (!s || s.startsWith('type ')) continue;
				names.add(s.split(/\s+as\s+/)[0].trim());
			}
		}
	}
	return Object.fromEntries(Object.entries(imports).map(([k, v]) => [k, [...v].sort()]));
}

if (process.argv.includes('--list-imports')) {
	console.log(JSON.stringify(listImports(), null, 2));
	process.exit(0);
}

const base = argValue('--base') ?? 'upstream/main';
const allowed = new Set(DELIVERED_PHASES.flatMap((p) => INJECTION_POINTS[p] ?? []));
const changed = new Set([
	...git('diff', '--name-only', `${base}...HEAD`),
	// Mudanças ainda não commitadas também contam, para o script valer antes do commit.
	...git('diff', '--name-only', 'HEAD'),
	...git('ls-files', '--others', '--exclude-standard'),
]);
const extras = [...changed]
	.filter((f) => !allowed.has(f) && !FORK_PATHS.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)))
	.sort();

if (extras.length) {
	console.error(`Upstream files changed outside SPEC §9 (phases ${DELIVERED_PHASES.join(', ')}):`);
	for (const f of extras) console.error(`  ${f}`);
	process.exit(1);
}
const touched = [...changed].filter((f) => allowed.has(f)).length;
console.log(`Locale tools: ${touched} upstream injection points touched, none outside SPEC §9.`);

// R2.2 — fachadas, coverage.ts e LOCALE_TOOLS consistentes com o código do upstream.
const problems = [];
const coverageKeys = new Set(
	[...readFileSync(join(ROOT, 'src/locale/pt-BR/coverage.ts'), 'utf8').matchAll(/^\t'([\w-]+\.\w+)':/gm)].map(
		(m) => m[1]
	)
);
const imports = listImports();
for (const facade of ['narrative-lens', 'bluepencil', 'text-metrics', 'compromise-pos']) {
	const source = readFileSync(join(ROOT, `src/locale/engines/${facade}.ts`), 'utf8');
	const exported = new Set(
		[...source.matchAll(/^export function (\w+)/gm)].map((m) => m[1]).concat(
			/^export default /m.test(source) ? ['default'] : []
		)
	);
	for (const name of imports[facade]) {
		if (!exported.has(name)) problems.push(`${facade}: upstream imports ${name}, facade lacks it`);
		const key = facade === 'compromise-pos' && name === 'default' ? 'compromise-pos.nlp' : `${facade}.${name}`;
		if (!coverageKeys.has(key)) problems.push(`coverage.ts lacks ${key}`);
	}
}
// Ninguém fora das fachadas importa ou reexporta src/utils/text-metrics.ts direto: um caminho
// assim contorna o gate sem aparecer na lista de imports das fachadas.
const DIRECT = /(?:import|export)\s[^;]*?from\s*['"][./]*(?:utils\/)?text-metrics\.js['"]/gs;
for (const file of walk(join(ROOT, 'src'))) {
	const rel = relative(ROOT, file).split(sep).join('/');
	if (rel.startsWith('src/locale/') || rel === 'src/utils/text-metrics.ts') continue;
	for (const m of readFileSync(file, 'utf8').matchAll(DIRECT))
		if (!/locale\/engines\//.test(m[0])) problems.push(`${rel}: imports utils/text-metrics.js directly`);
}
const dist = join(ROOT, 'dist');
try {
	process.env.SCRIVENER_MCP_EAGER_TOOLS = '1';
	const registry = await import(pathToFileURL(join(dist, 'handlers/skill-registry.js')).href);
	const { LOCALE_TOOLS } = await import(pathToFileURL(join(dist, 'locale/tool-policies.js')).href);
	registry.initializeSkillRegistry();
	const registered = new Set(registry.getRegisteredTools().map((t) => t.name));
	for (const name of Object.keys(LOCALE_TOOLS))
		if (!registered.has(name)) problems.push(`LOCALE_TOOLS names ${name}, not in the registry`);
} catch (error) {
	problems.push(`cannot load dist/ (run npm run build): ${error.message}`);
}
if (problems.length) {
	console.error('Locale tools inconsistent (R2.2):');
	for (const p of problems) console.error(`  ${p}`);
	process.exit(1);
}
console.log(`Locale tools: facades, coverage.ts (${coverageKeys.size} entries) and LOCALE_TOOLS consistent.`);
process.exit(0);
