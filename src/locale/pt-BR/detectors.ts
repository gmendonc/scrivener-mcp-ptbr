// fonte: curadoria própria
import { segmentText } from './text/segments.js';
import { splitSentences } from './text/sentences.js';
import { detectSpans } from './text/spans.js';

/**
 * pt-BR detectors evaluated against the corpus (SPEC §12): each returns predicted spans with
 * UTF-16 offsets. `scripts/locale/preannotate.mjs` writes them as draft annotations and
 * `scripts/locale/evaluate-corpus.mjs` matches them against reviewed ones (D5, D6, D16).
 */
export interface Prediction {
	start: number;
	end: number;
	/** Valor do achado, quando há (o idioma, em `language.span`). */
	value?: string;
}

export interface DetectorOptions {
	embedded?: readonly string[];
	allowlist?: readonly string[];
}

export const DETECTORS: Readonly<
	Record<string, (text: string, options?: DetectorOptions) => Prediction[]>
> = {
	// Trechos fora do pt-BR (inclusive indeterminados), que as análises excluem.
	'language.span': (text, options = {}) =>
		detectSpans(text, { documentLanguage: 'pt-BR', ...options })
			.filter((s) => s.language !== 'pt-BR')
			.map((s) => ({ start: s.start, end: s.end, value: s.language })),
	'dialogue.speech': (text) =>
		segmentText(text)
			.filter((s) => s.kind === 'speech')
			.map((s) => ({ start: s.start, end: s.end })),
	'dialogue.tag': (text) =>
		segmentText(text)
			.filter((s) => s.kind === 'tag')
			.map((s) => ({ start: s.start, end: s.end })),
	// Frases, para a promoção de splitIntoSentences e getAccurateSentenceCount (R3.13).
	'text.sentence': (text) => splitSentences(text).map((s) => ({ start: s.start, end: s.end })),
};
