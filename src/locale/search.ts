import { resolveContextLanguage } from './language.js';
import { CONCEPTS_PT_BR } from './pt-BR/search/concepts.js';

/**
 * Story concepts of the passage search for the call's language (SPEC §9.H, R4.1). Takes the
 * upstream list and returns it unchanged in English, so the English path stays the same object;
 * in pt-BR returns the Portuguese list with the same names in the same order (the order is the
 * embedding dimension).
 */
export function conceptsFor<T extends { name: string; pattern: RegExp }>(
	english: readonly T[]
): readonly T[] {
	if (resolveContextLanguage().language === 'en') return english;
	return CONCEPTS_PT_BR as unknown as readonly T[];
}

/** Revision of the concept embedding space: `'1'` in English, `'1-pt-BR'` in pt-BR (R4.2). */
export function conceptRevision(base: string): string {
	return resolveContextLanguage().language === 'en' ? base : `${base}-pt-BR`;
}
