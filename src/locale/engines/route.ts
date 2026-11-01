import { resolveContextLanguage, resolveLanguage } from '../language.js';

// Fase 1 (SPEC §13): o idioma é resolvido e registrado, mas pt-BR ainda delega ao nativo.
// O gate por cobertura (dispatchPtBR) entra na fase 2.

export function routeByText<T>(text: string, native: () => T): T {
	resolveLanguage(text);
	return native();
}

export function routeByContext<T>(native: () => T): T {
	resolveContextLanguage();
	return native();
}

export function joinTexts(texts: readonly string[]): string {
	return texts.join('\n\n');
}
