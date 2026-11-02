import { currentLocale, recordCoverage, type ExcludedSpan } from '../context.js';
import { detectSpans, isExcluded } from './text/spans.js';
import { nonTerminalDots } from './text/sentences.js';

/**
 * Prepares pt-BR text for a native function that is language-neutral once adapted (SPEC §6.8,
 * D18, R3.5, R3.12). Spans in another language are blanked with spaces, so offsets, lines and
 * columns of the native findings stay valid, and recorded as excluded. Dots of abbreviations
 * become U+2024 (same UTF-16 length) so the native splitter does not end a sentence at "Dra.";
 * `restore` puts the dots back in every string of the native result.
 */
export const ABBREVIATION_DOT = '․';

export interface AdaptedText {
	text: string;
	restore<T>(value: T): T;
}

export function adaptForNative(text: string): AdaptedText {
	const ctx = currentLocale();
	const spans = detectSpans(text, {
		documentLanguage: 'pt-BR',
		embedded: ctx?.project?.embedded,
		allowlist: ctx?.project?.allowlist,
	});
	// Unidades UTF-16: os offsets dos spans e dos achados nativos são UTF-16.
	const units = text.split('');
	const excluded: ExcludedSpan[] = [];
	let excludedChars = 0;
	for (const span of spans) {
		if (!isExcluded(span, 'pt-BR')) continue;
		for (let i = span.start; i < span.end; i++) if (units[i] !== '\n') units[i] = ' ';
		excludedChars += span.end - span.start;
		excluded.push({
			...(ctx?.documentId ? { documentId: ctx.documentId } : {}),
			start: span.start,
			end: span.end,
			language: span.language,
			reason: span.language === 'undetermined' ? 'undetermined' : 'foreign-language',
		});
	}
	recordCoverage(text.length - excludedChars, text.length, excluded);
	for (const dot of nonTerminalDots(text)) units[dot] = ABBREVIATION_DOT;
	return { text: units.join(''), restore: (value) => restoreDots(value) };
}

function restoreDots<T>(value: T): T {
	if (typeof value === 'string') return value.split(ABBREVIATION_DOT).join('.') as T;
	if (Array.isArray(value)) return value.map(restoreDots) as T;
	if (value && typeof value === 'object')
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, restoreDots(v)])) as T;
	return value;
}
