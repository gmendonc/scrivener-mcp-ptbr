import {
	localeSuggestionText,
	parseProjectLocale,
	PROJECT_LOCALE_KEY,
	readProjectLocale,
	writeProjectLocale,
} from '../../../src/locale/project-locale.js';

function memoryWith(value: unknown) {
	return { getCustomContext: jest.fn(() => value) };
}

describe('project locale (R1.7)', () => {
	it('parses a valid locale', () => {
		expect(parseProjectLocale({ primary: 'pt-BR', embedded: ['en'] })).toEqual({
			primary: 'pt-BR',
			embedded: ['en'],
		});
	});

	it('names the invalid field', () => {
		expect(() => parseProjectLocale({ primary: 'fr' })).toThrow(/primary/);
		expect(() => parseProjectLocale({ primary: 'en', documents: { d: 'fr' } })).toThrow(
			/documents\.d/
		);
		expect(() => parseProjectLocale({ primary: 'en', embedded: 'en' })).toThrow(/embedded/);
	});

	it('reads an invalid stored value as undefined', () => {
		expect(readProjectLocale(memoryWith({ primary: 'fr' }))).toBeUndefined();
		expect(readProjectLocale(memoryWith(undefined))).toBeUndefined();
		expect(readProjectLocale(null)).toBeUndefined();
		expect(readProjectLocale(memoryWith({ primary: 'pt-BR' }))).toEqual({ primary: 'pt-BR' });
	});

	it('writes with setCustomContext and then saveMemory', async () => {
		const calls: string[] = [];
		const memory = {
			setCustomContext: jest.fn((key: string) => calls.push(`set:${key}`)),
			saveMemory: jest.fn(async () => {
				calls.push('save');
			}),
		};
		await writeProjectLocale(memory, { primary: 'pt-BR' });
		expect(memory.setCustomContext).toHaveBeenCalledWith(PROJECT_LOCALE_KEY, {
			primary: 'pt-BR',
		});
		expect(calls).toEqual(['set:locale', 'save']);
	});
});

describe('localeSuggestionText (SPEC §6.10)', () => {
	const pt = async () => 'Ela abriu a porta da casa e viu que o jardim estava coberto de neve.';
	const en = async () => 'She opened the door of the house and saw that the garden was white.';

	it('suggests pt-BR for an unconfigured Portuguese project', async () => {
		expect(await localeSuggestionText(memoryWith(undefined), pt)).toMatch(
			/^\n\nDetected language: pt-BR \(margin \d\.\d\d\)\. Save it with set_project_language\.$/
		);
	});

	it('never throws, so opening a project cannot fail because of it', async () => {
		const brokenMemory = {} as Parameters<typeof localeSuggestionText>[0];
		expect(await localeSuggestionText(brokenMemory, pt)).toBe('');
		const failingSample = async (): Promise<string> => {
			throw new Error('unreadable');
		};
		expect(await localeSuggestionText(memoryWith(undefined), failingSample)).toBe('');
	});

	it('stays silent for English or an already configured project', async () => {
		expect(await localeSuggestionText(memoryWith(undefined), en)).toBe('');
		expect(await localeSuggestionText(memoryWith({ primary: 'en' }), pt)).toBe('');
	});
});
