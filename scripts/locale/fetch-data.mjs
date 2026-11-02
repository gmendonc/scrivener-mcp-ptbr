#!/usr/bin/env node
// Baixa os dados de terceiros do manifesto para fora do repositório (SPEC §11.2, D9).
//
// Uso:
//   node scripts/locale/fetch-data.mjs                baixa o que falta
//   --only <id>     só uma fonte
//   --ci            só fontes com "ci": true
//   --check         não baixa; lista presente/ausente/hash divergente; exit 1 se faltar fonte
//                   usada por detector implementado (scripts/locale/implemented.json)
//   --force         baixa de novo mesmo com o lock válido
//   --manifest <f>  outro manifesto (testes)
//   --implemented <f>  outra lista de detectores implementados (testes)
// Destino: ${SCRIVENER_MCP_LOCALE_DATA_DIR ?? ~/.scrivener-mcp/locale/pt-BR}/<id>/<version>/
import { createHash } from 'node:crypto';
import {
	createWriteStream,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
	const i = argv.indexOf(name);
	return i === -1 ? undefined : argv[i + 1];
};

const manifestPath = resolve(value('--manifest') ?? join(ROOT, 'scripts/locale/sources.json'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.schema !== 'scrivener-ptbr-sources/1')
	fail(`unknown manifest schema in ${manifestPath}`);
const dataDir = resolve(
	process.env.SCRIVENER_MCP_LOCALE_DATA_DIR ??
		join(homedir(), '.scrivener-mcp', 'locale', 'pt-BR')
);
// Comparação sem caixa: no APFS e no NTFS padrão, caixa diferente é o mesmo caminho.
if (
	dataDir.toLowerCase() === ROOT.toLowerCase() ||
	dataDir.toLowerCase().startsWith((ROOT + sep).toLowerCase())
)
	fail(`refusing to write inside the repository: ${dataDir}`);
// id, versão e nome de arquivo viram caminho: só caracteres seguros, sem separador nem "..".
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
for (const source of manifest.sources)
	for (const part of [source.id, source.version, ...(source.files ?? []).map((f) => f.name)])
		if (typeof part !== 'string' || !SAFE.test(part) || part.includes('..'))
			fail(`unsafe path component in the manifest: ${JSON.stringify(part)}`);

const only = value('--only');
const sources = manifest.sources.filter(
	(s) => (!only || s.id === only) && (!flag('--ci') || s.ci === true)
);
if (only && !sources.length) fail(`no source ${only} in the manifest`);

function fail(message) {
	console.error(`fetch-data: ${message}`);
	process.exit(1);
}

function filesOf(source) {
	return (
		source.files ?? [
			{ name: source.url.split('/').pop(), url: source.url, sha256: source.sha256 },
		]
	);
}

function sha256(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function destination(source) {
	return join(dataDir, source.id, source.version);
}

function status(source) {
	const dir = destination(source);
	const missing = [];
	const mismatched = [];
	for (const file of filesOf(source)) {
		const path = join(dir, file.name);
		if (!existsSync(path)) missing.push(file.name);
		else if (sha256(path) !== file.sha256) mismatched.push(file.name);
	}
	return { dir, missing, mismatched, ok: !missing.length && !mismatched.length };
}

async function download(file, dir) {
	const target = join(dir, file.name);
	const partial = `${target}.partial`;
	const response = await fetch(file.url);
	if (!response.ok || !response.body) fail(`${file.url}: HTTP ${response.status}`);
	try {
		await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
	} catch (error) {
		rmSync(partial, { force: true });
		fail(`${file.url}: download interrupted (${error.message})`);
	}
	const actual = sha256(partial);
	if (actual !== file.sha256) {
		rmSync(partial, { force: true });
		fail(`${file.name}: sha256 ${actual} does not match the manifest (${file.sha256})`);
	}
	renameSync(partial, target);
}

if (flag('--check')) {
	const implementedPath = resolve(
		value('--implemented') ?? join(ROOT, 'scripts/locale/implemented.json')
	);
	const implemented = new Set(
		existsSync(implementedPath) ? JSON.parse(readFileSync(implementedPath, 'utf8')) : []
	);
	let blocking = false;
	for (const source of sources) {
		const s = status(source);
		const state = s.ok
			? 'present'
			: s.mismatched.length
				? `hash mismatch: ${s.mismatched.join(', ')}`
				: `absent: ${s.missing.join(', ')}`;
		const needed = (source.usedBy ?? []).filter((d) => implemented.has(d));
		console.log(
			`${source.id}@${source.version.slice(0, 12)}: ${state}${needed.length ? ` (used by implemented ${needed.join(', ')})` : ''}`
		);
		if (!s.ok && needed.length) blocking = true;
	}
	process.exit(blocking ? 1 : 0);
}

for (const source of sources) {
	if (source.licenseVerified?.status === 'unclear')
		console.warn(
			`fetch-data: ${source.id}: license unclear (D8); listed in docs/pt-br/SOURCES.md`
		);
	const before = status(source);
	if (before.ok && !flag('--force') && existsSync(join(before.dir, 'manifest.lock.json'))) {
		console.log(`${source.id}: up to date`);
		continue;
	}
	mkdirSync(before.dir, { recursive: true });
	for (const file of filesOf(source)) await download(file, before.dir);
	if (source.derive)
		execFileSync(process.execPath, [join(ROOT, source.derive), before.dir], {
			stdio: 'inherit',
		});
	writeFileSync(
		join(before.dir, 'manifest.lock.json'),
		`${JSON.stringify(
			{
				id: source.id,
				version: source.version,
				files: filesOf(source).map(({ name, sha256: hash }) => ({ name, sha256: hash })),
				license: source.license,
				fetchedAt: new Date().toISOString(),
			},
			null,
			2
		)}\n`
	);
	console.log(`${source.id}: fetched into ${before.dir}`);
}
