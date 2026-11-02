import type { UnsupportedReason } from '../errors.js';

/**
 * State of every facade function in pt-BR (SPEC §6.5). `implemented` needs an evaluation report
 * that meets D5/D16 (fórmulas de legibilidade: conferência com a fonte, R3.6); none exists yet.
 */
export type CoverageState = 'implemented' | 'language-neutral' | 'unavailable';

export interface FeatureCoverage {
	state: CoverageState;
	reason?: UnsupportedReason;
	alternative?: string;
	evaluation?: string;
}

export type FacadeFeature =
	`${'narrative-lens' | 'bluepencil' | 'text-metrics' | 'compromise-pos'}.${string}`;

const NEUTRAL: FeatureCoverage = { state: 'language-neutral' };

// Neutras com o adaptador pt-BR da fachada (D18, R3.12, R3.13).
const ADAPTED: FeatureCoverage = { state: 'language-neutral' };

// Métricas de texto: a contagem de palavras (get_statistics) não depende de idioma.
const METRICS: FeatureCoverage = {
	state: 'unavailable',
	reason: 'not-implemented',
	alternative: 'get_statistics',
};

// Análises de estilo, diálogo e narrativa: sem equivalente pt-BR, o recurso é ler o texto.
const ANALYSIS: FeatureCoverage = {
	state: 'unavailable',
	reason: 'not-implemented',
	alternative: 'read_document',
};

export const PT_BR_COVERAGE: Readonly<Record<FacadeFeature, FeatureCoverage>> = {
	'narrative-lens.computeReadability': METRICS,
	'narrative-lens.collectProseExamples': ANALYSIS,
	'narrative-lens.checkGrammar': ANALYSIS,
	'narrative-lens.extractDialogue': ANALYSIS,
	'narrative-lens.analyzeOpeningChecked': ANALYSIS,
	'narrative-lens.wordFrequencies': METRICS,
	'narrative-lens.aggregatePacing': ANALYSIS,
	'narrative-lens.analyzePacing': ANALYSIS,
	'narrative-lens.explainPacing': ANALYSIS,
	'narrative-lens.detectThemesSmart': ANALYSIS,
	'narrative-lens.analyzeForeshadowing': ANALYSIS,
	'narrative-lens.analyzeSyntaxTension': ANALYSIS,
	'narrative-lens.buildTimeline': ANALYSIS,
	'narrative-lens.genreFromLabel': NEUTRAL,
	'narrative-lens.measureVoiceDriftFromText': ANALYSIS,
	'narrative-lens.trackWorldState': ANALYSIS,
	'narrative-lens.listManuscriptRules': NEUTRAL,
	'narrative-lens.listStructureTemplates': NEUTRAL,
	'narrative-lens.parseManuscriptReport': NEUTRAL,
	'narrative-lens.extractNamedEntities': ANALYSIS,
	'bluepencil.analyzeDialogue': ANALYSIS,
	'bluepencil.analyzeRhythm': ADAPTED,
	'bluepencil.checkStyle': ANALYSIS,
	'bluepencil.findEchoes': ADAPTED,
	'bluepencil.findRepeats': ADAPTED,
	'bluepencil.report': ANALYSIS,
	'bluepencil.sentenceStarters': ADAPTED,
	'text-metrics.getAccurateWordCount': NEUTRAL,
	'text-metrics.countWords': NEUTRAL,
	'text-metrics.getCharacterCount': NEUTRAL,
	'text-metrics.getAccurateParagraphCount': NEUTRAL,
	// Tokenização do compromise, a mesma do countWords (Desvios, estágio 2).
	'text-metrics.splitIntoWords': NEUTRAL,
	'text-metrics.getWordPairs': NEUTRAL,
	'text-metrics.getAccurateSentenceCount': METRICS,
	'text-metrics.splitIntoSentences': METRICS,
	'text-metrics.getWordFrequency': METRICS,
	'text-metrics.getWritingTextMetrics': METRICS,
	'compromise-pos.nlp': METRICS,
};

export function coverageOf(feature: FacadeFeature): FeatureCoverage {
	const coverage = (PT_BR_COVERAGE as Record<string, FeatureCoverage | undefined>)[feature];
	if (!coverage) throw new Error(`No pt-BR coverage entry for ${feature}`);
	return coverage;
}
