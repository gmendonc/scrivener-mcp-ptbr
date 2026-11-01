import type { HandlerContext } from '../../../src/handlers/types.js';
import { setProjectLanguageHandler } from '../../../src/locale/set-project-language.js';

function memory(initial?: unknown) {
	const store: Record<string, unknown> = initial === undefined ? {} : { locale: initial };
	return {
		store,
		getCustomContext: jest.fn((key: string) => store[key]),
		setCustomContext: jest.fn((key: string, value: unknown) => {
			store[key] = value;
		}),
		saveMemory: jest.fn(async () => undefined),
	};
}

function context(mem: ReturnType<typeof memory> | null, project = true): HandlerContext {
	return {
		project: project ? ({} as HandlerContext['project']) : null,
		memoryManager: mem as unknown as HandlerContext['memoryManager'],
		contentAnalyzer: {} as HandlerContext['contentAnalyzer'],
	};
}

describe('set_project_language (R1.11)', () => {
	const run = setProjectLanguageHandler.handler;

	it('requires an open project', async () => {
		await expect(run({ primary: 'pt-BR' }, context(memory(), false))).rejects.toThrow(
			/No project is currently open/
		);
	});

	it('saves the locale and reports the previous one', async () => {
		const mem = memory();
		const result = await run({ primary: 'pt-BR', embedded: ['en'] }, context(mem));
		expect(mem.store.locale).toEqual({ primary: 'pt-BR', embedded: ['en'] });
		expect(mem.saveMemory).toHaveBeenCalled();
		expect(result.structuredContent).toEqual({
			locale: { primary: 'pt-BR', embedded: ['en'] },
		});
		expect(result.structuredContent?.previous).toBeUndefined();
	});

	it('clears the saved locale', async () => {
		const mem = memory({ primary: 'pt-BR' });
		const result = await run({ clear: true }, context(mem));
		expect(mem.store.locale).toBeUndefined();
		expect(result.structuredContent).toEqual({ locale: null, previous: { primary: 'pt-BR' } });
	});

	it('rejects an invalid language with INVALID_ARGUMENT', async () => {
		await expect(run({ primary: 'xx' }, context(memory()))).rejects.toMatchObject({
			code: 'INVALID_ARGUMENT',
		});
	});

	it('is registered with a described schema', () => {
		expect(setProjectLanguageHandler.description.length).toBeGreaterThanOrEqual(60);
		for (const prop of Object.values(setProjectLanguageHandler.inputSchema.properties)) {
			expect((prop as { description?: string }).description).toBeTruthy();
		}
	});
});
