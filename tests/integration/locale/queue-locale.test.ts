import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JobQueueService, JobType } from '../../../src/services/queue/job-queue.js';
import { AIClient } from '../../../src/services/ai/ai-client.js';
import * as context from '../../../src/locale/context.js';

jest.mock('../../../src/services/queue/keydb-detector.js', () => ({
	detectConnection: async () => ({ isAvailable: false, type: 'none' }),
	createBullMQConnection: () => {
		throw new Error('Embedded execution must not open an external queue connection');
	},
}));

describe('locale through the embedded queue (R1.13, §8.2)', () => {
	let directory: string;
	let queue: JobQueueService;

	beforeEach(async () => {
		jest.spyOn(AIClient.prototype, 'isAvailable', 'get').mockReturnValue(false);
		directory = await mkdtemp(join(tmpdir(), 'locale-queue-'));
		queue = new JobQueueService(directory);
		await queue.initialize({ sqliteOnly: true });
	});

	afterEach(async () => {
		await queue.shutdown();
		await rm(directory, { recursive: true, force: true });
		jest.restoreAllMocks();
	});

	function inPortugueseProject<T>(fn: () => Promise<T>): Promise<T> {
		const ctx = context.createCallContext({
			toolName: 'queue_document_analysis',
			project: { primary: 'pt-BR' },
		});
		return context.runWithLocale(ctx, fn);
	}

	it('reopens the pt-BR context in the worker and completes the job', async () => {
		const created = jest.spyOn(context, 'createCallContext');
		const id = await inPortugueseProject(() =>
			queue.addJob(JobType.ANALYZE_DOCUMENT, {
				documentId: '00000000-0000-4000-8000-000000000001',
				content: 'Ana abriu a janela e viu que a rua ainda estava molhada da chuva.',
			})
		);
		expect(await queue.waitForJob(JobType.ANALYZE_DOCUMENT, id)).toMatchObject({
			state: 'completed',
		});
		const worker = created.mock.results
			.map((r) => r.value as context.LocaleCallContext)
			.find((ctx) => ctx.toolName === JobType.ANALYZE_DOCUMENT);
		expect(worker?.project).toEqual({ primary: 'pt-BR' });
		expect(worker?.resolutions.length).toBeGreaterThan(0);
		expect(worker?.resolutions.every((r) => r.language === 'pt-BR')).toBe(true);
	});

	it('does not leak __locale into payloads that reject unknown fields', async () => {
		const id = await inPortugueseProject(() =>
			queue.addJob(JobType.GENERATE_SUGGESTIONS, { prompt: 'Revise esta cena.' })
		);
		const status = (await queue.waitForJob(JobType.GENERATE_SUGGESTIONS, id)) as {
			state: string;
			error?: string;
		};
		// Sem provedor de IA o job falha mesmo no upstream; o que não pode é falhar pela chave extra.
		expect(status.error ?? '').not.toMatch(/unsupported fields/);
	});
});
