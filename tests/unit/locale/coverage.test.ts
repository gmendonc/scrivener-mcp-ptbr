import * as bluepencil from '../../../src/locale/engines/bluepencil.js';
import * as narrativeLens from '../../../src/locale/engines/narrative-lens.js';
import * as textMetrics from '../../../src/locale/engines/text-metrics.js';
import { PT_BR_COVERAGE, coverageOf } from '../../../src/locale/pt-BR/coverage.js';

function valueFunctions(prefix: string, facade: Record<string, unknown>): string[] {
	return Object.entries(facade)
		.filter(([, value]) => typeof value === 'function')
		.map(([name]) => `${prefix}.${name}`);
}

const FACADE_FEATURES = [
	...valueFunctions('narrative-lens', narrativeLens),
	...valueFunctions('bluepencil', bluepencil),
	...valueFunctions('text-metrics', textMetrics),
	'compromise-pos.nlp',
].sort();

// SPEC R2.1, mais splitIntoWords e getWordPairs (tokenização do compromise; Desvios, estágio 2).
const NEUTRAL = [
	'text-metrics.getAccurateWordCount',
	'text-metrics.countWords',
	'text-metrics.getCharacterCount',
	'text-metrics.getAccurateParagraphCount',
	'text-metrics.splitIntoWords',
	'text-metrics.getWordPairs',
	'narrative-lens.listManuscriptRules',
	'narrative-lens.listStructureTemplates',
	'narrative-lens.genreFromLabel',
	'narrative-lens.parseManuscriptReport',
	// R3.13: neutras com adaptador (D18).
	'bluepencil.analyzeRhythm',
	'bluepencil.findEchoes',
	'bluepencil.findRepeats',
	'bluepencil.sentenceStarters',
].sort();

describe('pt-BR coverage (R2.1)', () => {
	it('has exactly one entry per facade value function, in both directions', () => {
		expect(Object.keys(PT_BR_COVERAGE).sort()).toEqual(FACADE_FEATURES);
	});

	it('marks only the listed functions language-neutral and the rest unavailable', () => {
		const neutral = Object.entries(PT_BR_COVERAGE)
			.filter(([, c]) => c.state === 'language-neutral')
			.map(([name]) => name)
			.sort();
		expect(neutral).toEqual(NEUTRAL);
		for (const [name, c] of Object.entries(PT_BR_COVERAGE)) {
			if (c.state === 'language-neutral') continue;
			expect({ name, state: c.state }).toEqual({ name, state: 'unavailable' });
			expect(c.reason).toBeDefined();
			expect(c.alternative).toEqual(expect.any(String));
		}
	});

	it('throws for an unknown feature', () => {
		expect(() => coverageOf('bluepencil.nope')).toThrow('No pt-BR coverage entry');
	});
});
