import * as native from 'narrative-lens';
import { recordUnavailableMetric } from '../context.js';
import { excludeForeign } from '../pt-BR/adapt.js';
import { loadDataset } from '../pt-BR/data/loader.js';
import { computeReadabilityPtBR } from '../pt-BR/readability/index.js';
import { joinTexts, routeByContext, routeByText } from './route.js';

// Lista de Biderman para a Dale-Chall (R3.7); fora do manifesto até a decisão do autor.
const SIMPLE_WORDS_DATASET = 'biderman-palavras-simples';

export type * from 'narrative-lens';

type P<F extends (...args: never[]) => unknown> = Parameters<F>;
type R<F extends (...args: never[]) => unknown> = ReturnType<F>;

export function computeReadability(
	...args: P<typeof native.computeReadability>
): R<typeof native.computeReadability> {
	const [text] = args;
	return routeByText(
		'narrative-lens.computeReadability',
		text,
		() => native.computeReadability(...args),
		() => readabilityPtBR(text)
	);
}

/** Legibilidade pt-BR (R3.6–R3.8): mesmo tipo da nativa; campos sem fórmula vão para o bloco locale. */
function readabilityPtBR(text: string): R<typeof native.computeReadability> {
	const simple = loadDataset(SIMPLE_WORDS_DATASET);
	const { result, unavailable } = computeReadabilityPtBR(
		excludeForeign(text),
		simple
			? new Set(simple.read('palavras-simples.txt').split('\n').filter(Boolean))
			: undefined
	);
	// Nome do campo, como na R3.7 ("unavailableMetrics contém daleChall").
	for (const name of unavailable) recordUnavailableMetric(name);
	return result;
}

export function collectProseExamples(
	...args: P<typeof native.collectProseExamples>
): R<typeof native.collectProseExamples> {
	return routeByText('narrative-lens.collectProseExamples', joinTexts(args[0]), () =>
		native.collectProseExamples(...args)
	);
}

export function checkGrammar(
	...args: P<typeof native.checkGrammar>
): R<typeof native.checkGrammar> {
	return routeByText('narrative-lens.checkGrammar', args[0], () => native.checkGrammar(...args));
}

export function extractDialogue(
	...args: P<typeof native.extractDialogue>
): R<typeof native.extractDialogue> {
	return routeByText('narrative-lens.extractDialogue', args[0], () =>
		native.extractDialogue(...args)
	);
}

export function analyzeOpeningChecked(
	...args: P<typeof native.analyzeOpeningChecked>
): R<typeof native.analyzeOpeningChecked> {
	return routeByText('narrative-lens.analyzeOpeningChecked', args[0], () =>
		native.analyzeOpeningChecked(...args)
	);
}

export function wordFrequencies(
	...args: P<typeof native.wordFrequencies>
): R<typeof native.wordFrequencies> {
	return routeByText('narrative-lens.wordFrequencies', args[0], () =>
		native.wordFrequencies(...args)
	);
}

// As três funções de ritmo recebem números já derivados do texto: idioma só pelo contexto.
export function aggregatePacing(
	...args: P<typeof native.aggregatePacing>
): R<typeof native.aggregatePacing> {
	return routeByContext('narrative-lens.aggregatePacing', () => native.aggregatePacing(...args));
}

export function analyzePacing(
	...args: P<typeof native.analyzePacing>
): R<typeof native.analyzePacing> {
	return routeByContext('narrative-lens.analyzePacing', () => native.analyzePacing(...args));
}

export function explainPacing(
	...args: P<typeof native.explainPacing>
): R<typeof native.explainPacing> {
	return routeByContext('narrative-lens.explainPacing', () => native.explainPacing(...args));
}

export function detectThemesSmart(
	...args: P<typeof native.detectThemesSmart>
): R<typeof native.detectThemesSmart> {
	return routeByText('narrative-lens.detectThemesSmart', joinTexts(args[0]), () =>
		native.detectThemesSmart(...args)
	);
}

export function analyzeForeshadowing(
	...args: P<typeof native.analyzeForeshadowing>
): R<typeof native.analyzeForeshadowing> {
	const text = args[0].map((tokens) => tokens.join(' '));
	return routeByText('narrative-lens.analyzeForeshadowing', joinTexts(text), () =>
		native.analyzeForeshadowing(...args)
	);
}

export function analyzeSyntaxTension(
	...args: P<typeof native.analyzeSyntaxTension>
): R<typeof native.analyzeSyntaxTension> {
	return routeByText('narrative-lens.analyzeSyntaxTension', args[0], () =>
		native.analyzeSyntaxTension(...args)
	);
}

export function buildTimeline(
	...args: P<typeof native.buildTimeline>
): R<typeof native.buildTimeline> {
	const text = joinTexts(args[0].map(([, body]) => body));
	return routeByText('narrative-lens.buildTimeline', text, () => native.buildTimeline(...args));
}

export function genreFromLabel(
	...args: P<typeof native.genreFromLabel>
): R<typeof native.genreFromLabel> {
	return routeByContext('narrative-lens.genreFromLabel', () => native.genreFromLabel(...args));
}

export function measureVoiceDriftFromText(
	...args: P<typeof native.measureVoiceDriftFromText>
): R<typeof native.measureVoiceDriftFromText> {
	const text = joinTexts([...args[1], ...args[2]]);
	return routeByText('narrative-lens.measureVoiceDriftFromText', text, () =>
		native.measureVoiceDriftFromText(...args)
	);
}

export function trackWorldState(
	...args: P<typeof native.trackWorldState>
): R<typeof native.trackWorldState> {
	return routeByText('narrative-lens.trackWorldState', joinTexts(args[0]), () =>
		native.trackWorldState(...args)
	);
}

export function listManuscriptRules(
	...args: P<typeof native.listManuscriptRules>
): R<typeof native.listManuscriptRules> {
	return routeByContext('narrative-lens.listManuscriptRules', () =>
		native.listManuscriptRules(...args)
	);
}

export function listStructureTemplates(
	...args: P<typeof native.listStructureTemplates>
): R<typeof native.listStructureTemplates> {
	return routeByContext('narrative-lens.listStructureTemplates', () =>
		native.listStructureTemplates(...args)
	);
}

export function parseManuscriptReport(
	...args: P<typeof native.parseManuscriptReport>
): R<typeof native.parseManuscriptReport> {
	return routeByContext('narrative-lens.parseManuscriptReport', () =>
		native.parseManuscriptReport(...args)
	);
}

export function extractNamedEntities(
	...args: P<typeof native.extractNamedEntities>
): R<typeof native.extractNamedEntities> {
	return routeByText('narrative-lens.extractNamedEntities', joinTexts(args[0]), () =>
		native.extractNamedEntities(...args)
	);
}
