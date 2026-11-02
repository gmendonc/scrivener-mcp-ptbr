import { recordUnsupported } from '../context.js';
import { LanguageUnsupportedError } from '../errors.js';
import { resolveContextLanguage, resolveLanguage, type Resolution } from '../language.js';
import { coverageOf, type FacadeFeature } from '../pt-BR/coverage.js';

/**
 * Gate por cobertura (SPEC §6.6, fase 2). Em inglês a chamada nativa é idêntica; em pt-BR,
 * `coverage.ts` decide: `implemented` chama a implementação pt-BR, `language-neutral` a
 * nativa (pelo adaptador, se a fachada passar um), `unavailable` registra a recusa no contexto da chamada e lança.
 */
export function dispatchPtBR<T>(
	feature: FacadeFeature,
	resolution: Resolution,
	native: () => T,
	implemented?: () => T
): T {
	if (resolution.language === 'en') return native();
	const coverage = coverageOf(feature);
	// `implemented` é a implementação pt-BR ou, para funções neutras, o adaptador (D18).
	if (coverage.state === 'language-neutral') return implemented ? implemented() : native();
	if (coverage.state === 'implemented' && implemented) return implemented();
	const error = new LanguageUnsupportedError(
		feature,
		resolution.language,
		coverage.reason ?? 'not-implemented',
		coverage.alternative
	);
	recordUnsupported(error);
	throw error;
}

export function routeByText<T>(
	feature: FacadeFeature,
	text: string,
	native: () => T,
	implemented?: () => T
): T {
	return dispatchPtBR(feature, resolveLanguage(text), native, implemented);
}

export function routeByContext<T>(feature: FacadeFeature, native: () => T): T {
	return dispatchPtBR(feature, resolveContextLanguage(), native);
}

export function joinTexts(texts: readonly string[]): string {
	return texts.join('\n\n');
}
