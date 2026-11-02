import { createCallContext, currentLocale, runWithLocale } from '../../../src/locale/context.js';
import { analyzeRhythm } from '../../../src/locale/engines/bluepencil.js';
import { countWords } from '../../../src/locale/engines/text-metrics.js';

function inPortuguese<T>(fn: () => T): T {
	return runWithLocale(
		createCallContext({ toolName: 'test', project: { primary: 'pt-BR' } }),
		fn
	);
}

describe('coverage of foreign spans (R3.5)', () => {
	const english = '— I told you, this is not the place for that — disse John.';
	const portuguese =
		'Ana abriu a janela da cozinha e viu que a rua ainda estava molhada da chuva da noite. ' +
		'O cheiro de terra subia do quintal, e ela ficou ali um tempo, sem pressa, ouvindo os ' +
		'pássaros e pensando no que faria com a carta que tinha chegado na véspera. Depois ' +
		'fechou a janela e voltou para a mesa.';

	it('excludes an English speech from a language-dependent function and records coverage', () => {
		const text = `${portuguese}\n${english}`;
		inPortuguese(() => {
			analyzeRhythm(text);
			const ctx = currentLocale()!;
			const foreign = 'I told you, this is not the place for that'.length;
			expect(ctx.totalChars).toBe(text.length);
			expect(ctx.analyzedChars).toBe(text.length - foreign);
			expect(ctx.excluded).toEqual([
				expect.objectContaining({ language: 'en', reason: 'foreign-language' }),
			]);
			const [span] = ctx.excluded;
			expect(text.slice(span.start, span.end)).toBe(
				'I told you, this is not the place for that'
			);
			expect(ctx.analyzedChars / ctx.totalChars).toBeGreaterThan(0.85);
		});
	});

	it('does not exclude anything for a language-neutral count', () => {
		inPortuguese(() => {
			countWords(`${portuguese}\n${english}`);
			const ctx = currentLocale()!;
			expect(ctx.excluded).toEqual([]);
			expect(ctx.totalChars).toBe(0);
		});
	});
});
