import {
	createCallContext,
	currentLocale,
	recordCoverage,
	recordResolution,
	recordUnavailableMetric,
	runWithLocale,
	summarize,
} from '../../../src/locale/context.js';

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('locale call context (R1.6)', () => {
	it('survives await and setTimeout', async () => {
		const ctx = createCallContext({ toolName: 'a' });
		await runWithLocale(ctx, async () => {
			await tick(1);
			expect(currentLocale()).toBe(ctx);
			await new Promise<void>((resolve) =>
				setTimeout(() => {
					expect(currentLocale()).toBe(ctx);
					resolve();
				}, 1)
			);
		});
	});

	it('keeps concurrent calls apart', async () => {
		const a = createCallContext({ toolName: 'a' });
		const b = createCallContext({ toolName: 'b' });
		await Promise.all([
			runWithLocale(a, async () => {
				await tick(5);
				recordResolution({ language: 'pt-BR', source: 'project' });
			}),
			runWithLocale(b, async () => {
				recordResolution({ language: 'en', source: 'default' });
				await tick(1);
				recordResolution({ language: 'en', source: 'default' });
			}),
		]);
		expect(a.resolutions.map((r) => r.language)).toEqual(['pt-BR']);
		expect(b.resolutions.map((r) => r.language)).toEqual(['en', 'en']);
	});

	it('is undefined outside and record* do not throw', () => {
		expect(currentLocale()).toBeUndefined();
		expect(() => {
			recordResolution({ language: 'en', source: 'default' });
			recordCoverage(1, 2, []);
			recordUnavailableMetric('x');
		}).not.toThrow();
	});
});

describe('summarize', () => {
	it('reports the configured language when no facade ran', () => {
		const ctx = createCallContext({ toolName: 't', project: { primary: 'pt-BR' } });
		expect(summarize(ctx)).toEqual({
			language: 'pt-BR',
			languageSource: 'project',
			coverage: 1,
			excludedSpans: [],
		});
	});

	it('reports mixed with detected source', () => {
		const ctx = createCallContext({ toolName: 't' });
		ctx.resolutions.push({ language: 'en', source: 'default' });
		ctx.resolutions.push({ language: 'pt-BR', source: 'detected' });
		expect(summarize(ctx)).toMatchObject({ language: 'mixed', languageSource: 'detected' });
	});

	it('truncates excluded spans at 200 but counts all in coverage', () => {
		const ctx = createCallContext({ toolName: 't' });
		const spans = Array.from({ length: 250 }, (_, i) => ({
			start: i,
			end: i + 1,
			language: 'en' as const,
			reason: 'foreign-language' as const,
		}));
		runWithLocale(ctx, () => recordCoverage(750, 1000, spans));
		const summary = summarize(ctx);
		expect(summary.excludedSpans).toHaveLength(200);
		expect(summary.coverage).toBe(0.75);
	});
});
