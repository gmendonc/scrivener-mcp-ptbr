// fonte: curadoria própria
import { recordForeignSpanChange } from '../../context.js';
import { ForeignSpanChangedError, type ChangedForeignSpan } from '../../errors.js';
import { detectLanguage, type Language } from '../../language.js';
import { segmentText } from './segments.js';
import { detectSpans } from './spans.js';

/**
 * Rejects an AI rewrite that changed a passage in another language (SPEC §6.8, D4, R3.11). Every
 * span of `before` detected in a language other than the document's must reappear verbatim
 * (whitespace and quote/apostrophe typography aside) in `after`; otherwise the whole proposal is rejected. The changed spans are
 * paired with the speech or quotation in the same position of the rewrite.
 */
export function assertForeignSpansPreserved(
	before: string,
	after: string,
	options: {
		documentLanguage: Language;
		embedded?: readonly string[];
		allowlist?: readonly string[];
	}
): void {
	const foreign = detectSpans(before, options).filter(
		(s) => s.reason === 'detected' && s.language !== options.documentLanguage
	);
	if (!foreign.length) return;
	const normalizedAfter = normalize(after);
	const beforeSegments = segmentText(before);
	const afterSegments = segmentText(after);
	const changed: ChangedForeignSpan[] = [];
	for (const span of foreign) {
		const text = before.slice(span.start, span.end);
		if (normalizedAfter.includes(normalize(text))) continue;
		const index = beforeSegments.findIndex((s) => s.start === span.start);
		const counterpart = index >= 0 ? afterSegments[index] : undefined;
		const replaced = counterpart?.text ?? '';
		const detected = detectLanguage(replaced, { embedded: options.embedded }).language;
		changed.push({
			start: span.start,
			end: span.end,
			before: text,
			after: replaced,
			languageBefore: span.language,
			// Fala removida não foi traduzida: sem texto, o idioma fica indeterminado.
			languageAfter: !replaced
				? 'undetermined'
				: detected === 'undetermined'
					? options.documentLanguage
					: detected,
		});
	}
	if (!changed.length) return;
	const error = new ForeignSpanChangedError(changed);
	recordForeignSpanChange(error);
	throw error;
}

// Espaços e tipografia de aspas e apóstrofos não contam como alteração (revisão do estágio 3b).
function normalize(text: string): string {
	return text
		.replace(/[‘’ʼ]/gu, "'")
		.replace(/[“”«»]/gu, '"')
		.replace(/\s+/gu, ' ')
		.trim();
}
