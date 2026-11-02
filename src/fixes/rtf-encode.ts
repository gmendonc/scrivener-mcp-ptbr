/**
 * Plain text → RTF body text without a reverse character map (SPEC §9.L, erro 5). The
 * upstream map inverted `\ldblquote`/`\rdblquote` → `"` into one key, so every straight
 * quote was written as a closing curly quote. Here ASCII is written as itself (escaping only
 * `\`, `{`, `}`), line breaks and tabs as control words, and every other UTF-16 unit as
 * `\uN?`, which Scrivener and `textutil` read back unchanged.
 */
export function encodeRtfText(text: string): string {
	let out = '';
	const normalized = text.replace(/\r\n?/g, '\n');
	for (let index = 0; index < normalized.length; index++) {
		const ch = normalized[index];
		const code = normalized.charCodeAt(index);
		if (ch === '\\') out += '\\\\';
		else if (ch === '{') out += '\\{';
		else if (ch === '}') out += '\\}';
		else if (ch === '\n') out += '\\par\n';
		else if (ch === '\t') out += '\\tab ';
		else if (code >= 0x20 && code < 0x7f) out += ch;
		else out += `\\u${code > 32767 ? code - 65536 : code}?`;
	}
	return out;
}
