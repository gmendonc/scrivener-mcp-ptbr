import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Third-party datasets fetched by `scripts/locale/fetch-data.mjs` outside the repository (SPEC
 * §11.3, D9). A feature that needs a missing dataset throws
 * `LanguageUnsupportedError(…, 'data-missing', fetchCommand(id))`.
 */
export interface Dataset {
	id: string;
	version: string;
	dir: string;
	files: readonly string[];
	read(name: string): string;
}

interface Lock {
	id: string;
	version: string;
	files: Array<{ name: string; sha256: string }>;
}

export const DATA_DIR_ENV = 'SCRIVENER_MCP_LOCALE_DATA_DIR';

export function dataDir(): string {
	return process.env[DATA_DIR_ENV] ?? join(homedir(), '.scrivener-mcp', 'locale', 'pt-BR');
}

// Versões fixadas no manifesto (scripts/locale/sources.json); o loader não lê o manifesto em
// runtime, porque scripts/ não vai para o pacote.
export const DATASET_VERSIONS: Readonly<Record<string, string>> = {
	'portilexicon-ud': '315e063da1f89c89e2097c6e72428ebefb9ab1d1',
};

const cache = new Map<string, Dataset | undefined>();

export function loadDataset(id: string): Dataset | undefined {
	const key = `${dataDir()}::${id}`;
	if (cache.has(key)) return cache.get(key);
	const version = DATASET_VERSIONS[id];
	const dir = version ? join(dataDir(), id, version) : undefined;
	const lockPath = dir ? join(dir, 'manifest.lock.json') : undefined;
	let dataset: Dataset | undefined;
	if (dir && lockPath && existsSync(lockPath)) {
		const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as Lock;
		const files = lock.files.map((f) => f.name).filter((name) => existsSync(join(dir, name)));
		if (lock.id === id && lock.version === version && files.length === lock.files.length) {
			const texts = new Map<string, string>();
			dataset = {
				id,
				version,
				dir,
				files,
				read: (name) => {
					if (!files.includes(name)) throw new Error(`${id} has no file ${name}`);
					if (!texts.has(name)) texts.set(name, readFileSync(join(dir, name), 'utf8'));
					return texts.get(name)!;
				},
			};
		}
	}
	cache.set(key, dataset);
	return dataset;
}

export function fetchCommand(id: string): string {
	return `node scripts/locale/fetch-data.mjs --only ${id}`;
}

/** Testes: esquece o cache (o diretório de dados muda entre casos). */
export function clearDatasetCache(): void {
	cache.clear();
}
