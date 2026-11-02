import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('spool directory (RC.11)', () => {
	const env = { ...process.env };
	afterEach(() => {
		process.env = { ...env };
	});

	function spoolLargeResult(): string {
		let filepath = '';
		jest.isolateModules(() => {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const formatter = require('../../../src/core/response-formatter.js');
			const text: string = formatter.formatPayload({ blob: 'x'.repeat(5000) }, 'probe');
			filepath = (JSON.parse(text) as { _file: string })._file;
		});
		return filepath;
	}

	it('spills inside SCRIVENER_MCP_SPOOL_DIR when set', () => {
		const base = mkdtempSync(join(tmpdir(), 'spool-base-'));
		const target = join(base, 'nested', 'spool');
		try {
			process.env.SCRIVENER_MCP_SPOOL_DIR = target;
			const reference = spoolLargeResult();
			const dirs = readdirSync(target).filter((name) =>
				name.startsWith('scrivener-mcp-spool-')
			);
			expect(dirs).toHaveLength(1);
			expect(readdirSync(join(target, dirs[0])).some((f) => f.startsWith('probe-'))).toBe(
				true
			);
			expect(reference).toContain(target);
		} finally {
			rmSync(base, { recursive: true, force: true });
		}
	});

	it('keeps os.tmpdir() when the variable is absent', async () => {
		delete process.env.SCRIVENER_MCP_SPOOL_DIR;
		const { spoolBaseDir } = await import('../../../src/fixes/spool.js');
		expect(spoolBaseDir()).toBe(tmpdir());
	});
});
