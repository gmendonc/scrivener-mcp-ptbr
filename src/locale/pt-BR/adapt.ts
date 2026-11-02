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
	const units = excludeForeignUnits(text);
	// O travessão de diálogo vira espaço: a nativa não separa frase antes dele ("Ele saiu. — Ela
	// ficou." era uma frase só; revisão do estágio 3a).
	for (const dash of dialogueDashes(text)) units[dash] = ' ';
	// Pontos de abreviação dentro de trecho apagado ficam apagados.
	for (const dot of nonTerminalDots(text)) if (units[dot] === '.') units[dot] = ABBREVIATION_DOT;
	const masked = units.join('');
	return { text: masked, restore: (value) => restore(value, text, masked) };
}

/** Travessões que abrem ou separam fala: no começo da linha ou com espaço antes. */
function dialogueDashes(text: string): number[] {
	const out: number[] = [];
	for (const match of text.matchAll(/(?:^|(?<=\s))[—–]/gmu)) out.push(match.index);
	return out;
}

/**
 * Puts the original text back into native results. bluepencil locations carry `offset` and
 * `length` in UTF-8 bytes; the mask changes byte lengths ("—" 3 bytes → space 1; "." 1 → U+2024 3)
 * but not UTF-16 lengths, so each location goes masked bytes → UTF-16 index → original bytes, as
 * the native function would have returned for the original text. An untruncated excerpt is rebuilt
 * from the original (dashes and dots included); other strings only lose the dot mask.
 */
function restore<T>(value: T, original: string, masked: string): T {
	const maps = { masked: byteMap(masked), original: byteMap(original) };
	const walk = (v: unknown): unknown => {
		if (typeof v === 'string') return v.split(ABBREVIATION_DOT).join('.');
		if (Array.isArray(v)) return v.map(walk);
		if (!v || typeof v !== 'object') return v;
		const record = v as Record<string, unknown>;
		const out = Object.fromEntries(Object.entries(record).map(([k, x]) => [k, walk(x)]));
		if (typeof record.offset === 'number' && typeof record.length === 'number') {
			const start = toUtf16(maps.masked, record.offset);
			const end = toUtf16(maps.masked, record.offset + record.length);
			out.offset = maps.original[start];
			out.length = maps.original[end] - maps.original[start];
			// A nativa conta a coluna em pontos de código; apagar um emoji (2 unidades UTF-16) com
			// dois espaços muda a contagem. Recalcula pelo texto original (revisão do estágio 3b).
			if (typeof record.column === 'number') {
				const lineStart = original.lastIndexOf('\n', start - 1) + 1;
				out.column = [...original.slice(lineStart, start)].length + 1;
			}
			// A nativa normaliza espaços no excerto; truncado (com …), não bate e fica como veio.
			if (
				typeof record.excerpt === 'string' &&
				collapse(masked.slice(start, end)) === collapse(record.excerpt)
			)
				out.excerpt = original.slice(start, end);
		}
		return out;
	};
	return walk(value) as T;
}

/** Byte offset (UTF-8) of every UTF-16 index of `text`, plus one past the end. */
function byteMap(text: string): number[] {
	const map: number[] = new Array(text.length + 1);
	let bytes = 0;
	for (let i = 0; i < text.length; i++) {
		map[i] = bytes;
		const code = text.codePointAt(i)!;
		if (code > 0xffff) {
			map[i + 1] = bytes;
			i++;
		}
		bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
	}
	map[text.length] = bytes;
	return map;
}

function toUtf16(map: readonly number[], byte: number): number {
	let lo = 0;
	let hi = map.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (map[mid] <= byte) lo = mid;
		else hi = mid - 1;
	}
	// Par substituto: as duas unidades têm o mesmo byte; fica com a primeira.
	while (lo > 0 && map[lo - 1] === map[lo]) lo--;
	return lo;
}

/**
 * The text with spans in another language blanked by spaces (newlines kept), recording coverage
 * and excluded spans in the call context. For pt-BR implementations, which split abbreviations
 * themselves and need no dot mask.
 */
export function excludeForeign(text: string): string {
	return excludeForeignUnits(text).join('');
}

function excludeForeignUnits(text: string): string[] {
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
	return units;
}

function collapse(text: string): string {
	return text.replace(/\s+/gu, ' ').trim();
}
