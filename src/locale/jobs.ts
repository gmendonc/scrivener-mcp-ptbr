import { createCallContext, currentLocale, runWithLocale } from './context.js';
import type { RequestedLanguage } from './language.js';
import type { ProjectLocale } from './project-locale.js';

export interface JobLocale {
	requested?: RequestedLanguage;
	documentId?: string;
	project?: ProjectLocale;
}

/**
 * O worker processa o job fora da cadeia assíncrona de quem o enfileirou, e o
 * AsyncLocalStorage se perde (SPEC §8.2). O idioma viaja dentro do próprio payload, e só
 * quando há algo a levar: payload sem `__locale` segue igual ao do upstream.
 */
export function withJobLocale<T extends object>(data: T): T & { __locale?: JobLocale } {
	const ctx = currentLocale();
	if (!ctx) return data;
	const locale: JobLocale = {};
	if (ctx.requested) locale.requested = ctx.requested;
	if (ctx.documentId) locale.documentId = ctx.documentId;
	if (ctx.project) locale.project = ctx.project;
	return Object.keys(locale).length ? { ...data, __locale: locale } : data;
}

/**
 * Reabre o contexto e retira `__locale` do payload antes de processar: validadores do upstream
 * rejeitam chaves desconhecidas (writing-suggestions aceita só prompt, documentId e useContext).
 * A remoção é no próprio objeto porque o processamento relê o payload a partir do job.
 */
export function runWithJobLocale<R>(
	data: { __locale?: JobLocale } | undefined,
	toolName: string,
	fn: () => R
): R {
	const locale = data?.__locale;
	if (data && '__locale' in data) delete data.__locale;
	if (!locale) return fn();
	return runWithLocale(createCallContext({ toolName, ...locale }), fn);
}

/** Lê o payload de um envelope da fila sem depender do formato interno do upstream. */
export function jobPayload(envelope: unknown): { __locale?: JobLocale } | undefined {
	const payload = (envelope as { payload?: unknown } | null)?.payload;
	return payload && typeof payload === 'object'
		? (payload as { __locale?: JobLocale })
		: undefined;
}
