import { AsyncLocalStorage } from 'node:async_hooks';
import { configuredResolution } from './language.js';
import type {
	DetectedLanguage,
	Language,
	LanguageSource,
	RequestedLanguage,
	Resolution,
} from './language.js';
import type { ProjectLocale } from './project-locale.js';

export interface ExcludedSpan {
	documentId?: string;
	start: number;
	end: number;
	language: DetectedLanguage;
	reason: 'foreign-language' | 'undetermined' | 'document-other';
}

export interface LocaleCallContext {
	readonly toolName: string;
	readonly requested?: RequestedLanguage;
	readonly documentId?: string;
	readonly project?: ProjectLocale;
	readonly resolutions: Resolution[];
	readonly excluded: ExcludedSpan[];
	analyzedChars: number;
	totalChars: number;
	readonly unavailableMetrics: Set<string>;
}

export interface LocaleSummary {
	language: Language | 'mixed';
	languageSource: LanguageSource;
	coverage: number;
	excludedSpans: ExcludedSpan[];
}

export const MAX_EXCLUDED_SPANS = 200;

const storage = new AsyncLocalStorage<LocaleCallContext>();

export function runWithLocale<T>(ctx: LocaleCallContext, fn: () => T): T {
	return storage.run(ctx, fn);
}

export function currentLocale(): LocaleCallContext | undefined {
	return storage.getStore();
}

export function createCallContext(init: {
	toolName: string;
	requested?: RequestedLanguage;
	documentId?: string;
	project?: ProjectLocale;
}): LocaleCallContext {
	return {
		...init,
		resolutions: [],
		excluded: [],
		analyzedChars: 0,
		totalChars: 0,
		unavailableMetrics: new Set(),
	};
}

export function recordResolution(resolution: Resolution): void {
	currentLocale()?.resolutions.push(resolution);
}

export function recordCoverage(analyzed: number, total: number, excluded: ExcludedSpan[]): void {
	const ctx = currentLocale();
	if (!ctx) return;
	ctx.analyzedChars += analyzed;
	ctx.totalChars += total;
	ctx.excluded.push(...excluded);
}

export function recordUnavailableMetric(name: string): void {
	currentLocale()?.unavailableMetrics.add(name);
}

export function summarize(ctx: LocaleCallContext): LocaleSummary {
	const languages = new Set(ctx.resolutions.map((r) => r.language));
	const coverage = ctx.totalChars === 0 ? 1 : ctx.analyzedChars / ctx.totalChars;
	const excludedSpans = ctx.excluded.slice(0, MAX_EXCLUDED_SPANS);
	if (languages.size > 1) {
		return { language: 'mixed', languageSource: 'detected', coverage, excludedSpans };
	}
	// Sem fachada chamada, a saída ainda declara o idioma configurado da chamada.
	const first = ctx.resolutions[0] ?? configuredResolution(ctx) ?? defaultResolution();
	return { language: first.language, languageSource: first.source, coverage, excludedSpans };
}

function defaultResolution(): Resolution {
	return { language: 'en', source: 'default' };
}
