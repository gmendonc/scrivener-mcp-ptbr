import {
	detectLanguage,
	ENV_VAR,
	resolveLanguage,
	type RequestedLanguage,
} from '../../../src/locale/language.js';
import { createCallContext, runWithLocale } from '../../../src/locale/context.js';
import type { ProjectLocale } from '../../../src/locale/project-locale.js';

const PT_NARRATIVE = 'Ela abriu a porta da casa e viu que o jardim estava coberto de neve.';
const EN_TEXT = 'I told you, this is not the place for that';
const ES_TEXT = 'No sé lo que quieres de mí, pero no voy a quedarme aquí';

describe('detectLanguage (R1.1)', () => {
	it('detects a 13-word Portuguese narrative', () => {
		const thirteen = 'Ela abriu a porta da casa e viu que o jardim estava coberto.';
		const detection = detectLanguage(thirteen);
		expect(detection.tokens).toBe(13);
		expect(detection.language).toBe('pt-BR');
		expect(detection.margin).toBeGreaterThan(0);
	});

	it('detects English', () => {
		expect(detectLanguage(EN_TEXT).language).toBe('en');
	});

	it('detects Spanish', () => {
		expect(detectLanguage(ES_TEXT).language).toBe('es');
	});

	it('leaves short text undetermined', () => {
		expect(detectLanguage('Okay.').language).toBe('undetermined');
	});

	it('leaves empty text undetermined with zero tokens', () => {
		const detection = detectLanguage('');
		expect(detection).toMatchObject({ language: 'undetermined', tokens: 0 });
	});

	it('breaks a tie only with a declared embedded language', () => {
		const tie = 'de que a de que a de que a';
		expect(detectLanguage(tie).language).toBe('undetermined');
		expect(
			detectLanguage(tie, { candidates: ['pt-BR', 'es'], embedded: ['es'] }).language
		).toBe('es');
	});
});

describe('resolveLanguage precedence (R1.2)', () => {
	const saved = process.env[ENV_VAR];
	afterEach(() => {
		if (saved === undefined) delete process.env[ENV_VAR];
		else process.env[ENV_VAR] = saved;
	});

	function resolveIn(
		text: string,
		call: { requested?: RequestedLanguage; project?: ProjectLocale; documentId?: string },
		hint?: RequestedLanguage
	) {
		return runWithLocale(createCallContext({ toolName: 't', ...call }), () =>
			resolveLanguage(text, hint)
		);
	}

	it.each([
		[
			'hint beats project, env and text',
			{
				env: 'en',
				text: EN_TEXT,
				call: { project: { primary: 'en' as const } },
				hint: 'pt-BR',
			},
			['pt-BR', 'argument'],
		],
		[
			'project without hint',
			{ text: EN_TEXT, call: { project: { primary: 'pt-BR' as const } } },
			['pt-BR', 'project'],
		],
		[
			'document override in the project',
			{
				text: PT_NARRATIVE,
				call: {
					project: { primary: 'pt-BR' as const, documents: { d1: 'en' as const } },
					documentId: 'd1',
				},
			},
			['en', 'project'],
		],
		['env only', { env: 'pt-BR', text: EN_TEXT, call: {} }, ['pt-BR', 'env']],
		[
			'auto skips project and env',
			{
				env: 'en',
				text: PT_NARRATIVE,
				call: { project: { primary: 'en' as const } },
				hint: 'auto',
			},
			['pt-BR', 'detected'],
		],
		['nothing applies', { text: 'Okay.', call: {} }, ['en', 'default']],
		['invalid env is ignored', { env: 'fr', text: 'Okay.', call: {} }, ['en', 'default']],
	] as const)('%s', (_name, input, [language, source]) => {
		if ('env' in input) process.env[ENV_VAR] = input.env;
		else delete process.env[ENV_VAR];
		const hint = 'hint' in input ? (input.hint as RequestedLanguage) : undefined;
		const resolution = resolveIn(input.text, input.call, hint);
		expect(resolution).toMatchObject({ language, source });
	});

	it('records each resolution in the open context', () => {
		delete process.env[ENV_VAR];
		const ctx = createCallContext({ toolName: 't' });
		runWithLocale(ctx, () => {
			resolveLanguage(PT_NARRATIVE);
			resolveLanguage(EN_TEXT);
		});
		expect(ctx.resolutions.map((r) => r.language)).toEqual(['pt-BR', 'en']);
	});

	it('works outside a context without the project step', () => {
		delete process.env[ENV_VAR];
		expect(resolveLanguage(PT_NARRATIVE)).toMatchObject({
			language: 'pt-BR',
			source: 'detected',
		});
	});
});
