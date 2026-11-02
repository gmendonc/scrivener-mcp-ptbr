import { isStructurallyValidRtf } from '../services/parsers/rtf-validation.js';
import { scanRawText } from '../services/parsers/rtf-splice.js';
import { encodeRtfText } from './rtf-encode.js';

/**
 * Regenerate an existing document without swapping its header (SPEC §9.L, erro 9). When the
 * splice can't preserve an edit, the upstream rewrote the whole file with a fixed
 * Helvetica/Cochin/Optima header and no `\ansicpg`. This keeps every raw byte before the
 * first text character (font and color tables, code page, page setup and the first
 * paragraph's formatting) and replaces only the body. Inline formatting inside the body is
 * still lost, which the caller reports as `regenerated`.
 */
export function regenerateKeepingHeader(
	originalRaw: string,
	newText: string,
	fallback: (text: string) => string
): string {
	const scan = scanRawText(originalRaw);
	const first = scan.text.search(/\S/u);
	if (first === -1) return fallback(newText);
	// O primeiro texto pode estar dentro de um grupo (epígrafe em itálico, campo): corta antes
	// do grupo aberto mais externo além do {\rtf1, para o corpo novo não herdar o estilo dele.
	const open = openGroupStarts(originalRaw.slice(0, scan.offsets[first]));
	if (open.length < 1) return fallback(newText);
	const prefix = originalRaw.slice(0, open.length > 1 ? open[1] : scan.offsets[first]);
	// `\uc1` makes the `?` after each `\uN` a fallback character even if the header set `\uc0`.
	const raw = `${prefix}{\\uc1 ${encodeRtfText(newText)}}}`;
	return isStructurallyValidRtf(raw) ? raw : fallback(newText);
}

/** Offsets of the `{` of every group still open at the end of `raw`, outermost first. */
function openGroupStarts(raw: string): number[] {
	const stack: number[] = [];
	for (let i = 0; i < raw.length; i++) {
		if (raw[i] === '\\') i++;
		else if (raw[i] === '{') stack.push(i);
		else if (raw[i] === '}') stack.pop();
	}
	return stack;
}
