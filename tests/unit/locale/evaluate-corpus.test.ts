import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'locale', 'evaluate-corpus.mjs');

function run(corpus: string, ...args: string[]): Promise<{ status: number; stdout: string }> {
	return new Promise((done) =>
		execFile(
			process.execPath,
			[SCRIPT, '--no-write', ...args],
			{ env: { ...process.env, SCRIVENER_PTBR_CORPUS_DIR: corpus }, timeout: 30_000 },
			(error, stdout) => done({ status: error ? Number(error.code ?? 1) : 0, stdout })
		)
	);
}

describe('evaluate-corpus.mjs (SPEC §12.3)', () => {
	let corpus: string;
	beforeEach(() => {
		corpus = mkdtempSync(join(tmpdir(), 'corpus-'));
		mkdirSync(join(corpus, 'contemporaneos'));
	});
	afterEach(() => rmSync(corpus, { recursive: true, force: true }));

	function write(status: 'draft' | 'reviewed', text: string, spans: object[]) {
		writeFileSync(join(corpus, 'contemporaneos', 'a.txt'), text);
		writeFileSync(
			join(corpus, 'contemporaneos', 'a.annotations.json'),
			JSON.stringify({
				schema: 'scrivener-ptbr-corpus/1',
				text: 'a.txt',
				sha256: createHash('sha256').update(text).digest('hex'),
				layer: 'contemporaneos',
				status,
				reviewedBy: status === 'reviewed' ? { name: 'teste', date: '2026-11-02' } : null,
				scope: ['dialogue.speech'],
				spans,
			})
		);
	}

	const TEXT = '— Vamos embora — disse Ana.\n— Agora não — respondeu Pedro.\nEla saiu.';
	const speech = (text: string) => {
		const start = TEXT.indexOf(text);
		return {
			id: text,
			detector: 'dialogue.speech',
			start,
			end: start + text.length,
			text,
			label: 'positive',
		};
	};

	it('counts true and false positives with the 50% overlap rule, reviewed texts only', async () => {
		write('reviewed', TEXT, [speech('Vamos embora')]);
		const report = JSON.parse((await run(corpus, '--layer', 'contemporaneos')).stdout);
		const s = report.layers.contemporaneos.detectors['dialogue.speech'];
		expect(s).toMatchObject({
			predictions: 2,
			tp: 1,
			fp: 1,
			positives: 1,
			status: 'insufficient-sample',
		});
		expect(s.precision).toBe(0.5);
		expect(s).not.toHaveProperty('texts');
	});

	it('ignores drafts', async () => {
		write('draft', TEXT, [speech('Vamos embora')]);
		const report = JSON.parse((await run(corpus, '--layer', 'contemporaneos')).stdout);
		expect(report.layers.contemporaneos.detectors).toEqual({});
		expect(report.layers.contemporaneos.skipped).toEqual([
			{ file: 'a.annotations.json', reason: 'not-reviewed' },
		]);
	});

	it('fails when an annotation text does not match its slice', async () => {
		write('reviewed', TEXT, [{ ...speech('Vamos embora'), text: 'outra coisa' }]);
		expect((await run(corpus, '--layer', 'contemporaneos')).status).toBe(1);
	});
});
