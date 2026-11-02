import { AIClient } from '../../../src/services/ai/ai-client.js';
import { isReasoningModel, openAICompletionParams } from '../../../src/fixes/openai-params.js';

describe('OpenAI parameters per model family (RC.10)', () => {
	const env = { ...process.env };
	afterEach(() => {
		process.env = { ...env };
	});

	it('keeps max_tokens and temperature for classic models', () => {
		expect(openAICompletionParams('gpt-4o-mini', 1024, 0.2)).toEqual({
			max_tokens: 1024,
			temperature: 0.2,
		});
		expect(isReasoningModel('gpt-4.1')).toBe(false);
	});

	it.each(['gpt-5', 'gpt-6.1-terra', 'gpt-10', 'o3', 'o4-mini', 'openai/gpt-5'])(
		'sends max_completion_tokens and reasoning_effort without temperature for %s',
		(model) => {
			expect(openAICompletionParams(model, 1024, 0.8)).toEqual({
				max_completion_tokens: 4096,
				reasoning_effort: 'low',
			});
		}
	);

	it('keeps a 4000-token floor and honors OPENAI_REASONING_EFFORT', () => {
		process.env.OPENAI_REASONING_EFFORT = 'high';
		expect(openAICompletionParams('o3', 200, 0.7)).toEqual({
			max_completion_tokens: 4000,
			reasoning_effort: 'high',
		});
		process.env.OPENAI_REASONING_EFFORT = 'bogus';
		expect(openAICompletionParams('o3', 200, 0.7)).toMatchObject({ reasoning_effort: 'low' });
	});

	it('reaches the OpenAI client through AIClient.chat', async () => {
		process.env.OPENAI_MODEL = 'gpt-6.1-terra';
		delete process.env.AI_PROVIDER;
		const client = new AIClient({
			anthropicApiKey: '',
			openaiApiKey: 'sk-test',
			provider: 'openai',
		});
		const create = jest.fn().mockResolvedValue({
			choices: [{ finish_reason: 'stop', message: { content: 'ok' } }],
		});
		(client as unknown as { openai: { chat: { completions: { create: jest.Mock } } } }).openai =
			{ chat: { completions: { create } } };
		await expect(
			client.chat('Revise a cena.', { maxTokens: 500, temperature: 0.2 })
		).resolves.toBe('ok');
		const params = create.mock.calls[0][0];
		expect(params).toMatchObject({ model: 'gpt-6.1-terra', max_completion_tokens: 4000 });
		expect(params).not.toHaveProperty('max_tokens');
		expect(params).not.toHaveProperty('temperature');
	});
});
