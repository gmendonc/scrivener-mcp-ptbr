import { getLogger } from '../core/logger.js';

/**
 * RTF text decoding shared by the reader (`rtf-handler.ts`) and the splice scanner
 * (`rtf-splice.ts`), so both turn the same raw bytes into the same characters (SPEC §9.L,
 * erro 4). Scrivener writes `\ansicpg1252` and encodes every non-ASCII character of that code
 * page as `\'hh`: `\'92` is ’ and `\'97` is —, not the C1 controls U+0092/U+0097.
 */

const logger = getLogger('fixes/rtf-decode');

export const DEFAULT_CODEPAGE = 1252;

/** Code page declared in the RTF header: `\ansicpgN`, `\mac` (Mac Roman), else 1252. */
export function rtfCodepage(raw: string): number {
	const head = raw.slice(0, 2000);
	const declared = /\\ansicpg(\d+)/.exec(head);
	if (declared) return Number(declared[1]);
	if (/\\mac(?![a-z])/i.test(head)) return 10000;
	return DEFAULT_CODEPAGE;
}

const decoders = new Map<number, TextDecoder | null>();

function decoderFor(codepage: number): TextDecoder | null {
	if (decoders.has(codepage)) return decoders.get(codepage)!;
	const label = codepage === 10000 ? 'macintosh' : `windows-${codepage}`;
	let decoder: TextDecoder | null = null;
	try {
		decoder = new TextDecoder(label);
	} catch {
		logger.warn("Unsupported RTF code page; decoding \\'hh as Latin-1", { codepage });
	}
	decoders.set(codepage, decoder);
	return decoder;
}

/** One `\'hh` escape (the two hex digits) in the given code page. */
export function decodeRtfHex(hex: string, codepage: number = DEFAULT_CODEPAGE): string {
	const byte = parseInt(hex, 16);
	if (Number.isNaN(byte)) return '';
	if (byte < 0x80) return String.fromCharCode(byte);
	const decoder = decoderFor(codepage);
	return decoder ? decoder.decode(Uint8Array.of(byte)) : String.fromCharCode(byte);
}

/** Raw CR/LF in the body are source line wraps, not text (RTF 1.9, "Conventions"). */
export function isRawLineBreak(ch: string | undefined): boolean {
	return ch === '\n' || ch === '\r';
}

/**
 * Length of a `\` + line break control symbol at `i` (Cocoa's paragraph mark, same as
 * `\par`), or 0 when `raw[i]` does not start one.
 */
export function escapedLineBreakLength(raw: string, i: number): number {
	if (raw[i] !== '\\') return 0;
	if (raw[i + 1] === '\r') return raw[i + 2] === '\n' ? 3 : 2;
	return raw[i + 1] === '\n' ? 2 : 0;
}
