import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enhanceContentHandler } from '../../../src/handlers/analysis-handlers/content-enhancement.js';
import {
	closeProjectHandler,
	openProjectHandler,
} from '../../../src/handlers/project-handlers/lifecycle.js';
import type { HandlerContext } from '../../../src/handlers/types.js';
import { setProjectLanguageHandler } from '../../../src/locale/set-project-language.js';
import { withLocale } from '../../../src/locale/with-locale.js';
import { AIClient } from '../../../src/services/ai/ai-client.js';

const ROOT = join(__dirname, '..', '..', '..');
const PT_FIXTURE = join(ROOT, 'tests', 'fixtures', 'pt-BR', 'sample-project-pt.scriv');
const CHAPTER_2 = 'A1B2C3D4-0001-4000-8000-000000000002';
const SPEECH = 'I told you, this is not the place for that';

describe('enhance_content rejects a rewrite that translates a foreign speech (R3.11, D4)', () => {
	let dir: string;
	let context: HandlerContext;
	const env = { ...process.env };

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'locale-enhance-'));
		delete process.env.SCRIVENER_LOCAL_ONLY;
		process.env.SCRIVENER_DATA_DIR = join(dir, 'state');
		const path = join(dir, 'sample-project-pt.scriv');
		await cp(PT_FIXTURE, path, { recursive: true });
		context = { project: null, memoryManager: null, contentAnalyzer: {} as never };
		await openProjectHandler.handler({ path }, context);
		await setProjectLanguageHandler.handler({ primary: 'pt-BR', embedded: ['en'] }, context);
		jest.spyOn(AIClient.prototype, 'isAvailable', 'get').mockReturnValue(true);
	});
	afterEach(async () => {
		jest.restoreAllMocks();
		await closeProjectHandler.handler({}, context);
		process.env = { ...env };
		await rm(dir, { recursive: true, force: true });
	});

	async function enhanceWith(rewrite: (original: string) => string) {
		const original = await context.project!.readDocument(CHAPTER_2);
		jest.spyOn(AIClient.prototype, 'chat').mockResolvedValue(rewrite(original));
		return withLocale(enhanceContentHandler).handler(
			{ documentId: CHAPTER_2, enhancementType: 'grammar' },
			context
		);
	}

	// O enhance_content da 0.14 não cria proposta em review_changes: devolve a reescrita na resposta.
	// A rejeição se prova pela ausência da reescrita (Desvios, estágio 3b).
	it('answers foreign-span-changed without returning the rewrite when the speech is translated', async () => {
		const result = await enhanceWith((text) =>
			text.replace(SPEECH, 'Eu te disse que este não é o lugar para isso')
		);
		expect(result.isError).toBe(false);
		const locale = (result.structuredContent as { locale: Record<string, unknown> }).locale;
		expect(locale).toMatchObject({ available: false, reason: 'foreign-span-changed' });
		expect(locale.changedSpans).toEqual([
			expect.objectContaining({
				before: SPEECH,
				languageBefore: 'en',
				languageAfter: 'pt-BR',
			}),
		]);
		expect(result.structuredContent).not.toHaveProperty('enhanced');
		// Só o bloco locale: a reescrita não volta (o trecho trocado aparece em changedSpans.after).
		expect(Object.keys(result.structuredContent ?? {})).toEqual(['locale']);
		expect(JSON.stringify(result.content)).not.toContain('Eu te disse');
	});

	it('answers normally when the rewrite keeps the speech', async () => {
		const result = await enhanceWith((text) => text.replace('demorou', 'tardou'));
		const locale = (result.structuredContent as { locale: Record<string, unknown> }).locale;
		expect(locale.available).toBeUndefined();
		expect(locale.language).toBe('pt-BR');
		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result.structuredContent)).toContain('tardou');
	});
});
