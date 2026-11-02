// fonte: curadoria própria
import {
	DETECTION_MIN_TOKENS,
	detectLanguage,
	type DetectedLanguage,
	type Language,
} from '../../language.js';
import { segmentText, type Segment } from './segments.js';

/**
 * Language of each stretch of a document (SPEC §6.8, R3.4; arquitetura §3.5). Segments first,
 * then detects: dialogue tags take the document language; a segment below the detection
 * thresholds inherits (the same speaker's previous speech, else the document); a tie in a speech
 * or quotation that `embedded` does not break is `undetermined`, while tied narration inherits; allowlisted words are not a foreign signal.
 */
export interface LanguageSpan {
	start: number;
	end: number;
	language: DetectedLanguage;
	reason: 'detected' | 'inherited' | 'undetermined' | 'document-override' | 'allowlist';
	margin: number;
}

export interface SpanOptions {
	documentLanguage: Language;
	embedded?: readonly string[];
	allowlist?: readonly string[];
}

const WORD = /\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*/gu;

export function detectSpans(text: string, options: SpanOptions): LanguageSpan[] {
	const allow = new Set((options.allowlist ?? []).map((w) => w.toLowerCase()));
	const bySpeaker = new Map<string, DetectedLanguage>();
	return segmentText(text).map((segment) => {
		const span = spanOf(segment, options, allow, bySpeaker);
		if (segment.kind === 'speech' && segment.speakerHint && span.reason === 'detected')
			bySpeaker.set(segment.speakerHint, span.language);
		return span;
	});
}

function spanOf(
	segment: Segment,
	options: SpanOptions,
	allow: ReadonlySet<string>,
	bySpeaker: ReadonlyMap<string, DetectedLanguage>
): LanguageSpan {
	const base = { start: segment.start, end: segment.end };
	const inherit = (): LanguageSpan => ({
		...base,
		language:
			(segment.speakerHint && bySpeaker.get(segment.speakerHint)) || options.documentLanguage,
		reason: 'inherited',
		margin: 0,
	});
	if (segment.kind === 'tag')
		return { ...base, language: options.documentLanguage, reason: 'inherited', margin: 0 };
	const words = segment.text.match(WORD) ?? [];
	const kept = words.filter((w) => !allow.has(w.toLowerCase()));
	if (words.length && !kept.length)
		return { ...base, language: options.documentLanguage, reason: 'allowlist', margin: 0 };
	const detection = detectLanguage(kept.join(' '), { embedded: options.embedded });
	if (detection.language !== 'undetermined')
		return {
			...base,
			language: detection.language,
			reason: 'detected',
			margin: detection.margin,
		};
	const best = Math.max(...Object.values(detection.scores));
	// Poucas palavras ou nenhum sinal: herda. Empate com sinal real: indeterminado nas falas e
	// citações; a narração é o texto do autor e só sai do idioma do documento quando outro
	// idioma vence com margem (Desvios, estágio 3a).
	if (detection.tokens < DETECTION_MIN_TOKENS || best === 0) return inherit();
	if (segment.kind === 'narration') return inherit();
	return { ...base, language: 'undetermined', reason: 'undetermined', margin: detection.margin };
}

/** Span fora do idioma do documento, que as funções dependentes de idioma não analisam. */
export function isExcluded(span: LanguageSpan, documentLanguage: Language): boolean {
	return span.language !== documentLanguage;
}
