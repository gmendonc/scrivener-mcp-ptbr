import * as native from 'bluepencil-node';
import { createCallContext, currentLocale, runWithLocale } from '../../../src/locale/context.js';
import {
	analyzeRhythm,
	findEchoes,
	findRepeats,
	sentenceStarters,
} from '../../../src/locale/engines/bluepencil.js';
import { countWords } from '../../../src/locale/engines/text-metrics.js';

function inPortuguese<T>(fn: () => T): T {
	return runWithLocale(
		createCallContext({ toolName: 'test', project: { primary: 'pt-BR' } }),
		fn
	);
}

describe('bluepencil adapter for pt-BR (R3.12, D18)', () => {
	it('keeps "Dra." inside its sentence', () => {
		const text = 'A Dra. Ana chegou. Ela saiu.';
		expect(native.analyzeRhythm(text).lengths).toHaveLength(3);
		expect(inPortuguese(() => analyzeRhythm(text)).lengths).toEqual([4, 2]);
	});

	it('keeps line, column and offset of findings and restores the dot in excerpts', () => {
		const text =
			'A Dra. Ana olhou a chuva.\nA Dra. Ana olhou a chuva de novo.\nE a Dra. Ana olhou a chuva.';
		const repeats = inPortuguese(() => findRepeats(text));
		const phrase = repeats.find((r) => r.phrase.includes('ana olhou'))!;
		expect(phrase).toBeDefined();
		for (const location of phrase.locations) {
			expect(
				text.slice(location.offset, location.offset + location.length).toLowerCase()
			).toContain('ana olhou');
			expect(location.excerpt).not.toContain('․');
		}
		const echoes = inPortuguese(() => findEchoes(text));
		for (const echo of echoes) {
			const line = text.split('\n')[echo.first.line - 1];
			expect(
				line
					.slice(echo.first.column - 1)
					.toLowerCase()
					.startsWith(echo.word)
			).toBe(true);
		}
	});

	it('ignores Portuguese function words as echoes', () => {
		const text =
			'Ela olhou para a janela e voltou para a cama. Depois foi para a cozinha olhar para a rua.';
		const words = inPortuguese(() => findEchoes(text)).map((e) => e.word);
		expect(native.findEchoes(text).map((e) => e.word)).toContain('para');
		expect(words).not.toContain('para');
	});

	it('runs sentence starters on the adapted text', () => {
		const text = 'Ela abriu. Ela olhou. Ela saiu. A Dra. Ana ficou.';
		const report = inPortuguese(() => sentenceStarters(text));
		expect(report.sentence.find((w) => w.word === 'ela')?.count).toBe(3);
	});
});

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
