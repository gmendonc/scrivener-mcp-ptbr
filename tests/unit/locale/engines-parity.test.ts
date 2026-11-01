import * as narrativeLens from '../../../src/locale/engines/narrative-lens.js';
import * as bluepencil from '../../../src/locale/engines/bluepencil.js';
import * as textMetrics from '../../../src/locale/engines/text-metrics.js';
import compromisePos from '../../../src/locale/engines/compromise-pos.js';
import * as nativeLens from 'narrative-lens';
import * as nativeBluepencil from 'bluepencil-node';
import * as nativeMetrics from '../../../src/utils/text-metrics.js';
import nativeNlp from 'compromise';

jest.mock('narrative-lens', () => {
	const names = [
		'computeReadability',
		'collectProseExamples',
		'checkGrammar',
		'extractDialogue',
		'analyzeOpeningChecked',
		'wordFrequencies',
		'aggregatePacing',
		'analyzePacing',
		'explainPacing',
		'detectThemesSmart',
		'analyzeForeshadowing',
		'analyzeSyntaxTension',
		'buildTimeline',
		'genreFromLabel',
		'measureVoiceDriftFromText',
		'trackWorldState',
		'listManuscriptRules',
		'listStructureTemplates',
		'parseManuscriptReport',
		'extractNamedEntities',
	];
	return Object.fromEntries(names.map((n) => [n, jest.fn(() => ({ from: n }))]));
});

jest.mock('bluepencil-node', () => {
	const names = [
		'analyzeDialogue',
		'analyzeRhythm',
		'checkStyle',
		'findEchoes',
		'findRepeats',
		'report',
		'sentenceStarters',
	];
	return Object.fromEntries(names.map((n) => [n, jest.fn(() => ({ from: n }))]));
});

jest.mock('../../../src/utils/text-metrics.js', () => {
	const names = [
		'getAccurateWordCount',
		'getAccurateSentenceCount',
		'getAccurateParagraphCount',
		'splitIntoSentences',
		'getWritingTextMetrics',
		'getCharacterCount',
		'getWordFrequency',
		'splitIntoWords',
		'getWordPairs',
		'countWords',
	];
	return Object.fromEntries(names.map((n) => [n, jest.fn(() => ({ from: n }))]));
});

jest.mock('compromise', () => ({ __esModule: true, default: jest.fn(() => ({ from: 'nlp' })) }));

const EN = 'She opened the door and saw that the garden was white with snow.';
const EN2 = 'He told her that it was not the place for that kind of talk.';

type AnyFn = (...args: unknown[]) => unknown;

const LENS_ARGS: Record<string, unknown[]> = {
	computeReadability: [EN],
	collectProseExamples: [[EN, EN2]],
	checkGrammar: [EN],
	extractDialogue: [EN, 1, ['Ana']],
	analyzeOpeningChecked: [EN, 'literary'],
	wordFrequencies: [EN, 10],
	aggregatePacing: [[{ sceneId: 1 }]],
	analyzePacing: [1, 10, 100, 5],
	explainPacing: [0.5, 1, false, 0.1],
	detectThemesSmart: [[EN], [EN.split(' ')]],
	analyzeForeshadowing: [[EN.split(' ')], 1],
	analyzeSyntaxTension: [EN],
	buildTimeline: [[['d1', EN]]],
	genreFromLabel: ['Thriller'],
	measureVoiceDriftFromText: ['Ana', [EN], [EN2]],
	trackWorldState: [[EN], ['Ana']],
	listManuscriptRules: [],
	listStructureTemplates: [],
	parseManuscriptReport: [{ schema: 'x' }],
	extractNamedEntities: [[EN]],
};

const BLUEPENCIL_ARGS: Record<string, unknown[]> = Object.fromEntries(
	[
		'analyzeDialogue',
		'analyzeRhythm',
		'checkStyle',
		'findEchoes',
		'findRepeats',
		'report',
		'sentenceStarters',
	].map((n) => [n, [EN, { limit: 3 }]])
);

const METRICS_ARGS: Record<string, unknown[]> = {
	getAccurateWordCount: [EN],
	getAccurateSentenceCount: [EN],
	getAccurateParagraphCount: [EN],
	splitIntoSentences: [EN],
	getWritingTextMetrics: [EN],
	getCharacterCount: [EN, false],
	getWordFrequency: [EN, true],
	splitIntoWords: [EN],
	getWordPairs: [[EN, EN2]],
	countWords: [EN],
};

describe.each([
	['narrative-lens', narrativeLens, nativeLens, LENS_ARGS],
	['bluepencil', bluepencil, nativeBluepencil, BLUEPENCIL_ARGS],
	['text-metrics', textMetrics, nativeMetrics, METRICS_ARGS],
] as const)('%s facade delegates in English (R1.4)', (_name, facade, native, argsByName) => {
	it('covers every value export', () => {
		const exported = Object.keys(facade).filter(
			(k) => typeof (facade as Record<string, unknown>)[k] === 'function'
		);
		expect(exported.sort()).toEqual(Object.keys(argsByName).sort());
	});

	it.each(Object.keys(argsByName))('%s passes the same arguments and result', (name) => {
		const args = argsByName[name];
		const nativeFn = (native as unknown as Record<string, jest.Mock>)[name];
		nativeFn.mockClear();
		const result = ((facade as Record<string, unknown>)[name] as AnyFn)(...args);
		expect(nativeFn).toHaveBeenCalledTimes(1);
		expect(nativeFn).toHaveBeenCalledWith(...args);
		expect(result).toBe(nativeFn.mock.results[0].value);
	});
});

describe('compromise-pos facade delegates in English (R1.4)', () => {
	it('passes the same arguments and result', () => {
		const nlp = nativeNlp as unknown as jest.Mock;
		nlp.mockClear();
		const result = compromisePos(EN);
		expect(nlp).toHaveBeenCalledWith(EN);
		expect(result).toBe(nlp.mock.results[0].value);
	});
});
