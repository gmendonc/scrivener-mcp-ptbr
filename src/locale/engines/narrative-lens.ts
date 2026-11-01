import * as native from 'narrative-lens';
import { joinTexts, routeByContext, routeByText } from './route.js';

export type * from 'narrative-lens';

type P<F extends (...args: never[]) => unknown> = Parameters<F>;
type R<F extends (...args: never[]) => unknown> = ReturnType<F>;

export function computeReadability(
	...args: P<typeof native.computeReadability>
): R<typeof native.computeReadability> {
	return routeByText(args[0], () => native.computeReadability(...args));
}

export function collectProseExamples(
	...args: P<typeof native.collectProseExamples>
): R<typeof native.collectProseExamples> {
	return routeByText(joinTexts(args[0]), () => native.collectProseExamples(...args));
}

export function checkGrammar(
	...args: P<typeof native.checkGrammar>
): R<typeof native.checkGrammar> {
	return routeByText(args[0], () => native.checkGrammar(...args));
}

export function extractDialogue(
	...args: P<typeof native.extractDialogue>
): R<typeof native.extractDialogue> {
	return routeByText(args[0], () => native.extractDialogue(...args));
}

export function analyzeOpeningChecked(
	...args: P<typeof native.analyzeOpeningChecked>
): R<typeof native.analyzeOpeningChecked> {
	return routeByText(args[0], () => native.analyzeOpeningChecked(...args));
}

export function wordFrequencies(
	...args: P<typeof native.wordFrequencies>
): R<typeof native.wordFrequencies> {
	return routeByText(args[0], () => native.wordFrequencies(...args));
}

// As três funções de ritmo recebem números já derivados do texto: idioma só pelo contexto.
export function aggregatePacing(
	...args: P<typeof native.aggregatePacing>
): R<typeof native.aggregatePacing> {
	return routeByContext(() => native.aggregatePacing(...args));
}

export function analyzePacing(
	...args: P<typeof native.analyzePacing>
): R<typeof native.analyzePacing> {
	return routeByContext(() => native.analyzePacing(...args));
}

export function explainPacing(
	...args: P<typeof native.explainPacing>
): R<typeof native.explainPacing> {
	return routeByContext(() => native.explainPacing(...args));
}

export function detectThemesSmart(
	...args: P<typeof native.detectThemesSmart>
): R<typeof native.detectThemesSmart> {
	return routeByText(joinTexts(args[0]), () => native.detectThemesSmart(...args));
}

export function analyzeForeshadowing(
	...args: P<typeof native.analyzeForeshadowing>
): R<typeof native.analyzeForeshadowing> {
	const text = args[0].map((tokens) => tokens.join(' '));
	return routeByText(joinTexts(text), () => native.analyzeForeshadowing(...args));
}

export function analyzeSyntaxTension(
	...args: P<typeof native.analyzeSyntaxTension>
): R<typeof native.analyzeSyntaxTension> {
	return routeByText(args[0], () => native.analyzeSyntaxTension(...args));
}

export function buildTimeline(
	...args: P<typeof native.buildTimeline>
): R<typeof native.buildTimeline> {
	const text = joinTexts(args[0].map(([, body]) => body));
	return routeByText(text, () => native.buildTimeline(...args));
}

export function genreFromLabel(
	...args: P<typeof native.genreFromLabel>
): R<typeof native.genreFromLabel> {
	return routeByContext(() => native.genreFromLabel(...args));
}

export function measureVoiceDriftFromText(
	...args: P<typeof native.measureVoiceDriftFromText>
): R<typeof native.measureVoiceDriftFromText> {
	const text = joinTexts([...args[1], ...args[2]]);
	return routeByText(text, () => native.measureVoiceDriftFromText(...args));
}

export function trackWorldState(
	...args: P<typeof native.trackWorldState>
): R<typeof native.trackWorldState> {
	return routeByText(joinTexts(args[0]), () => native.trackWorldState(...args));
}

export function listManuscriptRules(
	...args: P<typeof native.listManuscriptRules>
): R<typeof native.listManuscriptRules> {
	return routeByContext(() => native.listManuscriptRules(...args));
}

export function listStructureTemplates(
	...args: P<typeof native.listStructureTemplates>
): R<typeof native.listStructureTemplates> {
	return routeByContext(() => native.listStructureTemplates(...args));
}

export function parseManuscriptReport(
	...args: P<typeof native.parseManuscriptReport>
): R<typeof native.parseManuscriptReport> {
	return routeByContext(() => native.parseManuscriptReport(...args));
}

export function extractNamedEntities(
	...args: P<typeof native.extractNamedEntities>
): R<typeof native.extractNamedEntities> {
	return routeByText(joinTexts(args[0]), () => native.extractNamedEntities(...args));
}
