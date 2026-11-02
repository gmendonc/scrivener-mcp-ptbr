import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JobQueueService } from '../../../src/services/queue/job-queue.js';
import { AIClient } from '../../../src/services/ai/ai-client.js';

jest.mock('../../../src/services/queue/keydb-detector.js', () => ({
	detectConnection: async () => ({ isAvailable: false, type: 'none' }),
	createBullMQConnection: () => {
		throw new Error('Embedded execution must not open an external queue connection');
	},
}));

describe('AI tools explain how to configure a provider (RC.12)', () => {
	let directory: string;
	let queue: JobQueueService;

	beforeEach(async () => {
		jest.spyOn(AIClient.prototype, 'isAvailable', 'get').mockReturnValue(false);
		directory = await mkdtemp(join(tmpdir(), 'fixes-provider-'));
		queue = new JobQueueService(directory);
		await queue.initialize({ sqliteOnly: true });
	});

	afterEach(async () => {
		await queue.shutdown();
		await rm(directory, { recursive: true, force: true });
		jest.restoreAllMocks();
	});

	it('names the provider variables and the sampling caveat in analyze_writing_style', async () => {
		const error = await queue.analyzeWritingStyle(['Ana abriu a janela.']).catch((e) => e);
		expect(error).toBeInstanceOf(Error);
		const { message } = error as Error;
		expect(message).toMatch(/^AI writing provider is unavailable/);
		for (const name of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'])
			expect(message).toContain(name);
		expect(message).toMatch(/sampling/);
	});
});
