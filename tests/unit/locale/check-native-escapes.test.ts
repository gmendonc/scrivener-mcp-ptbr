import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'locale', 'check-native-escapes.mjs');

function run(root?: string) {
	const args = root ? [SCRIPT, '--root', root] : [SCRIPT];
	return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

function fakeRepo(files: Record<string, string>): string {
	const root = mkdtempSync(join(tmpdir(), 'native-escapes-'));
	for (const [path, source] of Object.entries(files)) {
		mkdirSync(join(root, path, '..'), { recursive: true });
		writeFileSync(join(root, path), source);
	}
	return root;
}

describe('check-native-escapes (R1.18)', () => {
	const roots: string[] = [];
	afterAll(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

	it('passes on the repository', () => {
		const result = run();
		expect(result.stderr).toBe('');
		expect(result.status).toBe(0);
	});

	it.each([
		["createRequire(import.meta.url).resolve('narrative-lens');"],
		["const nlp = require('compromise');"],
		["const m = await import('bluepencil-node');"],
		["import {\n\tcheckStyle,\n} from 'bluepencil-node';"],
		["export { checkGrammar } from 'narrative-lens';"],
	])('fails on %s', (source) => {
		const root = fakeRepo({ 'src/x.ts': source });
		roots.push(root);
		const result = run(root);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('src/x.ts:');
	});

	it('ignores type imports, the facades and the child-process exception', () => {
		const root = fakeRepo({
			'src/x.ts': "import type { ManuscriptContext } from 'narrative-lens';",
			'src/locale/engines/narrative-lens.ts': "import * as native from 'narrative-lens';",
			'src/services/editorial/lens-native.cts':
				"createRequire(__filename).resolve('narrative-lens');",
		});
		roots.push(root);
		expect(run(root).status).toBe(0);
	});
});
