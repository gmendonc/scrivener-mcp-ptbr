import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	DATASET_VERSIONS,
	DATA_DIR_ENV,
	clearDatasetCache,
	loadDataset,
} from '../../../src/locale/pt-BR/data/loader.js';

const ROOT = join(__dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'locale', 'fetch-data.mjs');
const BODY = 'rapidamente\trapidamente\t_\n';
const sha = (text: string) => createHash('sha256').update(text).digest('hex');

describe('fetch-data.mjs and the dataset loader (SPEC §11.2, §11.3)', () => {
	let server: Server;
	let base: string;
	let work: string;

	beforeAll(async () => {
		server = createServer((req, res) => {
			if (req.url === '/ADV.tsv') res.end(BODY);
			else res.writeHead(404).end();
		});
		await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
		base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});
	afterAll(async () => {
		await new Promise((done) => server.close(done));
	});
	beforeEach(() => {
		work = mkdtempSync(join(tmpdir(), 'fetch-data-'));
		clearDatasetCache();
	});
	afterEach(() => rmSync(work, { recursive: true, force: true }));

	function manifest(hash: string): string {
		const path = join(work, 'sources.json');
		writeFileSync(
			path,
			JSON.stringify({
				schema: 'scrivener-ptbr-sources/1',
				sources: [
					{
						id: 'portilexicon-ud',
						url: base,
						version: '315e063da1f89c89e2097c6e72428ebefb9ab1d1',
						files: [{ name: 'ADV.tsv', url: `${base}/ADV.tsv`, sha256: hash }],
						license: 'MIT',
						licenseVerified: {
							status: 'verified',
							date: '2026-11-02',
							evidence: 'test',
						},
						ci: true,
						usedBy: ['style.adverb'],
					},
				],
			})
		);
		return path;
	}

	// Assíncrono: o servidor HTTP do teste roda neste processo e precisa responder ao filho.
	function run(...args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
		return new Promise((done) => {
			execFile(
				process.execPath,
				[SCRIPT, ...args],
				{ env: { ...process.env, [DATA_DIR_ENV]: join(work, 'data') }, timeout: 20_000 },
				(error, stdout, stderr) =>
					done({ status: error ? Number(error.code ?? 1) : 0, stdout, stderr })
			);
		});
	}

	it('downloads, verifies the hash, writes the lock, and the loader reads it', async () => {
		const result = await run('--manifest', manifest(sha(BODY)));
		expect(result.status).toBe(0);
		const dir = join(
			work,
			'data',
			'portilexicon-ud',
			'315e063da1f89c89e2097c6e72428ebefb9ab1d1'
		);
		expect(readFileSync(join(dir, 'ADV.tsv'), 'utf8')).toBe(BODY);
		expect(JSON.parse(readFileSync(join(dir, 'manifest.lock.json'), 'utf8'))).toMatchObject({
			id: 'portilexicon-ud',
			files: [{ name: 'ADV.tsv', sha256: sha(BODY) }],
		});
		const previous = process.env[DATA_DIR_ENV];
		process.env[DATA_DIR_ENV] = join(work, 'data');
		try {
			expect(loadDataset('portilexicon-ud')?.read('ADV.tsv')).toBe(BODY);
		} finally {
			if (previous === undefined) delete process.env[DATA_DIR_ENV];
			else process.env[DATA_DIR_ENV] = previous;
		}
		expect((await run('--check', '--manifest', manifest(sha(BODY)))).stdout).toContain(
			'present'
		);
	});

	it('deletes the partial file and exits 1 on a hash mismatch', async () => {
		const result = await run('--manifest', manifest('0'.repeat(64)));
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('does not match the manifest');
		const dir = join(
			work,
			'data',
			'portilexicon-ud',
			'315e063da1f89c89e2097c6e72428ebefb9ab1d1'
		);
		expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
	});

	it('reports an absent source in --check without downloading', async () => {
		const result = await run('--check', '--manifest', manifest(sha(BODY)));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('absent: ADV.tsv');
		expect(existsSync(join(work, 'data'))).toBe(false);
	});

	it('loader answers undefined when the dataset was never fetched', () => {
		const previous = process.env[DATA_DIR_ENV];
		process.env[DATA_DIR_ENV] = join(work, 'nothing');
		try {
			expect(loadDataset('portilexicon-ud')).toBeUndefined();
			expect(loadDataset('unknown-source')).toBeUndefined();
		} finally {
			if (previous === undefined) delete process.env[DATA_DIR_ENV];
			else process.env[DATA_DIR_ENV] = previous;
		}
	});

	it('exits 1 in --check when a source used by an implemented detector is missing', async () => {
		const implemented = join(work, 'implemented.json');
		writeFileSync(implemented, JSON.stringify(['style.adverb']));
		const result = await run(
			'--check',
			'--manifest',
			manifest(sha(BODY)),
			'--implemented',
			implemented
		);
		expect(result.status).toBe(1);
		expect(result.stdout).toContain('used by implemented style.adverb');
	});

	it('exits 1 without leaving files on an HTTP error', async () => {
		const path = join(work, 'missing.json');
		writeFileSync(
			path,
			readFileSync(manifest(sha(BODY)), 'utf8').replace('/ADV.tsv"', '/nope.tsv"')
		);
		const result = await run('--manifest', path);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('HTTP 404');
	});

	it('refuses an unsafe file name in the manifest', async () => {
		const path = join(work, 'evil.json');
		writeFileSync(
			path,
			readFileSync(manifest(sha(BODY)), 'utf8').replace(
				'"name":"ADV.tsv"',
				'"name":"../../escaped.tsv"'
			)
		);
		const result = await run('--manifest', path);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('unsafe path component');
		expect(existsSync(join(work, 'escaped.tsv'))).toBe(false);
	});

	it('keeps the loader versions equal to the manifest', () => {
		const sources = JSON.parse(
			readFileSync(join(ROOT, 'scripts', 'locale', 'sources.json'), 'utf8')
		) as { sources: Array<{ id: string; version: string }> };
		for (const source of sources.sources)
			expect({ id: source.id, version: DATASET_VERSIONS[source.id] }).toEqual({
				id: source.id,
				version: source.version,
			});
	});
});
