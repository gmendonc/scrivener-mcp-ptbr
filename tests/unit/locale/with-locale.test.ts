import type { HandlerContext, ToolDefinition } from '../../../src/handlers/types.js';
import { ENV_VAR } from '../../../src/locale/language.js';
import { LanguageUnsupportedError, ForeignSpanChangedError } from '../../../src/locale/errors.js';
import { checkStyle } from '../../../src/locale/engines/bluepencil.js';
import { countWords } from '../../../src/locale/engines/text-metrics.js';
import { withLocale } from '../../../src/locale/with-locale.js';

function tool(name: string, overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		name,
		description: 'A test tool used to check the locale wrapper behaviour in isolation.',
		inputSchema: {
			type: 'object',
			properties: { documentId: { type: 'string', description: 'Doc.' } },
			required: ['documentId'],
		},
		outputSchema: {
			type: 'object',
			properties: { a: { type: 'number', description: 'A.' } },
			required: ['a'],
		},
		handler: jest.fn(async () => ({
			content: [{ type: 'text', text: 'X' }],
			structuredContent: { a: 1 },
		})),
		...overrides,
	};
}

function context(locale?: unknown): HandlerContext {
	return {
		project: null,
		memoryManager: locale
			? ({ getCustomContext: () => locale } as unknown as HandlerContext['memoryManager'])
			: null,
		contentAnalyzer: {} as HandlerContext['contentAnalyzer'],
	};
}

const saved = process.env[ENV_VAR];
beforeEach(() => delete process.env[ENV_VAR]);
afterAll(() => {
	if (saved !== undefined) process.env[ENV_VAR] = saved;
});

describe('withLocale identity and memoization (R1.8)', () => {
	it('returns the same object for tools outside LOCALE_TOOLS', () => {
		const t = tool('list_documents');
		expect(withLocale(t)).toBe(t);
	});

	it('wraps once and memoizes', () => {
		const t = tool('check_style_local');
		const wrapped = withLocale(t);
		expect(wrapped).not.toBe(t);
		expect(withLocale(t)).toBe(wrapped);
		expect(withLocale(wrapped)).toBe(wrapped);
	});

	it('adds an optional language argument and strips it before the handler', async () => {
		const t = tool('check_style_local');
		const wrapped = withLocale(t);
		const language = wrapped.inputSchema.properties.language as { enum: string[] };
		expect(language.enum).toEqual(['en', 'pt-BR', 'auto']);
		expect(wrapped.inputSchema.required).toEqual(['documentId']);
		expect(wrapped.description.startsWith(t.description)).toBe(true);
		await wrapped.handler({ documentId: 'd', language: 'en' }, context());
		expect(t.handler).toHaveBeenCalledWith({ documentId: 'd' }, expect.anything(), undefined);
	});

	it('does not create an outputSchema for text-only tools', () => {
		expect(withLocale(tool('generate_content', { outputSchema: undefined })).outputSchema).toBe(
			undefined
		);
	});
});

describe('output fields in English (R1.9, D15)', () => {
	it('keeps content identical and appends the locale summary', async () => {
		const result = await withLocale(tool('check_style_local')).handler(
			{ documentId: 'd' },
			context()
		);
		expect(result.content).toEqual([{ type: 'text', text: 'X' }]);
		expect(result.structuredContent).toEqual({
			a: 1,
			locale: { language: 'en', languageSource: 'default', coverage: 1, excludedSpans: [] },
		});
	});

	it('adds the locale block to isError results that carry structured content', async () => {
		const handler = jest.fn(async () => ({
			isError: true,
			content: [{ type: 'text', text: 'failed' }],
			structuredContent: { a: 0 },
		}));
		const result = await withLocale(tool('enhance_content', { handler })).handler(
			{ documentId: 'd' },
			context()
		);
		expect(result.isError).toBe(true);
		expect(result.content).toEqual([{ type: 'text', text: 'failed' }]);
		expect(result.structuredContent).toEqual({
			a: 0,
			locale: { language: 'en', languageSource: 'default', coverage: 1, excludedSpans: [] },
		});
	});

	it('reports the project language and a pt-BR note in Portuguese', async () => {
		const handler = jest.fn(async () => {
			countWords('Ela abriu a porta da casa e viu que o jardim estava coberto de neve.');
			return { content: [{ type: 'text', text: 'X' }], structuredContent: { a: 1 } };
		});
		const result = await withLocale(tool('check_style_local', { handler })).handler(
			{ documentId: 'd' },
			context({ primary: 'pt-BR' })
		);
		expect(result.structuredContent).toMatchObject({
			locale: { language: 'pt-BR', languageSource: 'project' },
		});
		expect(result.content[0].text).toMatch(/^X\n\npt-BR: language pt-BR \(project\)/);
	});
});

describe('unavailable answers', () => {
	it('turns LanguageUnsupportedError into available: false', async () => {
		const handler = jest.fn(async () => {
			throw new LanguageUnsupportedError(
				'bluepencil.checkStyle',
				'pt-BR',
				'not-implemented',
				'analyze_document'
			);
		});
		const result = await withLocale(tool('check_style_local', { handler })).handler(
			{ documentId: 'd' },
			context({ primary: 'pt-BR' })
		);
		expect(result.isError).toBe(false);
		expect(result.structuredContent).toEqual({
			locale: {
				available: false,
				reason: 'not-implemented',
				alternative: 'analyze_document',
				language: 'pt-BR',
				languageSource: 'project',
				coverage: 0,
				excludedSpans: [],
			},
		});
		expect(result.content[0].text).toBe(
			'pt-BR: bluepencil.checkStyle is not available for Brazilian Portuguese yet (not-implemented). Try analyze_document.'
		);
	});

	it('turns ForeignSpanChangedError into foreign-span-changed', async () => {
		const changed = [
			{
				start: 0,
				end: 5,
				before: 'Hello',
				after: 'Olá',
				languageBefore: 'en' as const,
				languageAfter: 'pt-BR' as const,
			},
		];
		const handler = jest.fn(async () => {
			throw new ForeignSpanChangedError(changed);
		});
		const result = await withLocale(tool('enhance_content', { handler })).handler(
			{ documentId: 'd' },
			context({ primary: 'pt-BR' })
		);
		expect(result.structuredContent).toMatchObject({
			locale: { available: false, reason: 'foreign-span-changed', changedSpans: changed },
		});
	});

	it('gates child-process tools before the handler in pt-BR', async () => {
		const t = tool('analyze_manuscript_local');
		const wrapped = withLocale(t);
		const result = await wrapped.handler(
			{ documentId: 'd', action: 'analyze' },
			context({ primary: 'pt-BR' })
		);
		expect(t.handler).not.toHaveBeenCalled();
		expect(result.structuredContent).toMatchObject({
			locale: { available: false, reason: 'child-process' },
		});
		await wrapped.handler(
			{ documentId: 'd', action: 'capabilities' },
			context({ primary: 'pt-BR' })
		);
		expect(t.handler).toHaveBeenCalledTimes(1);
	});

	it('rethrows other errors', async () => {
		const handler = jest.fn(async () => {
			throw new Error('boom');
		});
		await expect(
			withLocale(tool('check_style_local', { handler })).handler(
				{ documentId: 'd' },
				context()
			)
		).rejects.toThrow('boom');
	});
});

describe('augmented output schema', () => {
	it('keeps upstream properties and moves their constraints into an anyOf branch', () => {
		const original = tool('check_style_local');
		const schema = withLocale(original).outputSchema!;
		expect(schema.required).toEqual(['locale']);
		expect(schema.properties!.a).toBe(original.outputSchema!.properties!.a);
		expect(schema.anyOf).toEqual([
			expect.objectContaining({ required: ['a'] }),
			expect.objectContaining({
				properties: {
					locale: expect.objectContaining({
						required: ['available', 'reason', 'language'],
					}),
				},
			}),
		]);
		expect(Object.keys(schema.properties!).sort()).toEqual(['a', 'locale']);
	});

	it('adds the locale key to closed oneOf branches', () => {
		const closed = tool('enhance_content', {
			outputSchema: {
				type: 'object',
				oneOf: [
					{
						type: 'object',
						additionalProperties: false,
						properties: { a: { type: 'number', description: 'A.' } },
					},
				],
			},
		});
		const schema = withLocale(closed).outputSchema!;
		const branch = (schema.anyOf![0] as { oneOf: Array<{ properties: object }> }).oneOf[0];
		expect(Object.keys(branch.properties).sort()).toEqual(['a', 'locale']);
	});

	it('fails loudly if an upstream tool starts returning its own locale field', () => {
		const colliding = tool('semantic_search', {
			outputSchema: {
				type: 'object',
				properties: { locale: { type: 'string', description: 'Upstream locale.' } },
			},
		});
		expect(() => withLocale(colliding)).toThrow(/locale.*collides/);
	});

	it('answers unavailable when a facade refuses and the upstream wraps the error', async () => {
		const handler = jest.fn(async () => {
			try {
				checkStyle('Ela abriu a porta da casa e viu que o jardim estava coberto de neve.');
			} catch (error) {
				throw new Error(`wrapped: ${(error as Error).message}`);
			}
			return { content: [{ type: 'text', text: 'X' }], structuredContent: { a: 1 } };
		});
		const result = await withLocale(tool('check_style_local', { handler })).handler(
			{ documentId: 'd' },
			context({ primary: 'pt-BR' })
		);
		expect(result.isError).toBe(false);
		expect(result.structuredContent).toEqual({
			locale: expect.objectContaining({
				available: false,
				reason: 'not-implemented',
				alternative: 'read_document',
				language: 'pt-BR',
			}),
		});
	});

	it('lists a refused function when the upstream swallows the error', async () => {
		const handler = jest.fn(async () => {
			try {
				checkStyle('Ela abriu a porta da casa e viu que o jardim estava coberto de neve.');
			} catch {
				// upstream degrade path
			}
			return { content: [{ type: 'text', text: 'X' }], structuredContent: { a: 1 } };
		});
		const result = await withLocale(tool('check_style_local', { handler })).handler(
			{ documentId: 'd' },
			context({ primary: 'pt-BR' })
		);
		expect(result.structuredContent).toMatchObject({
			a: 1,
			locale: { language: 'pt-BR', unavailableMetrics: ['bluepencil.checkStyle'] },
		});
	});

	it('keeps an unrelated error thrown after a swallowed refusal', async () => {
		const handler = jest.fn(async () => {
			try {
				checkStyle('Ela abriu a porta da casa e viu que o jardim estava coberto de neve.');
			} catch {
				// upstream degrade path
			}
			throw new Error('AI writing provider is unavailable');
		});
		await expect(
			withLocale(tool('check_style_local', { handler })).handler(
				{ documentId: 'd' },
				context({ primary: 'pt-BR' })
			)
		).rejects.toThrow('AI writing provider is unavailable');
	});

	it('reports a changed foreign span even after a swallowed refusal', async () => {
		const handler = jest.fn(async () => {
			try {
				checkStyle('Ela abriu a porta da casa e viu que o jardim estava coberto de neve.');
			} catch {
				// upstream degrade path
			}
			throw new ForeignSpanChangedError([
				{
					start: 0,
					end: 4,
					before: 'Okay',
					after: 'Certo',
					languageBefore: 'en',
					languageAfter: 'pt-BR',
				},
			]);
		});
		const result = await withLocale(tool('enhance_content', { handler })).handler(
			{ documentId: 'd' },
			context({ primary: 'pt-BR' })
		);
		expect(result.structuredContent).toMatchObject({
			locale: { available: false, reason: 'foreign-span-changed' },
		});
	});
});
