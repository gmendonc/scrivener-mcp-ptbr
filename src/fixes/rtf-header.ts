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
	const prefix = originalRaw.slice(0, scan.offsets[first]);
	const depth = openGroups(prefix);
	if (depth < 1) return fallback(newText);
	// `\uc1` makes the `?` after each `\uN` a fallback character even if the header set `\uc0`.
	const raw = `${prefix}{\\uc1 ${encodeRtfText(newText)}}${'}'.repeat(depth)}`;
	return isStructurallyValidRtf(raw) ? raw : fallback(newText);
}

function openGroups(raw: string): number {
	let depth = 0;
	for (let i = 0; i < raw.length; i++) {
		if (raw[i] === '\\') i++;
		else if (raw[i] === '{') depth++;
		else if (raw[i] === '}') depth--;
	}
	return depth;
}
