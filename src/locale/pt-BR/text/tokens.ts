// fonte: curadoria própria

/** A word, number or punctuation run with UTF-16 offsets into the original text (SPEC §6.8). */
export interface Token {
	text: string;
	start: number;
	end: number;
	kind: 'word' | 'number' | 'punct';
}

// Palavra: letras (com acentos combinantes), com hífen ou apóstrofo internos ("guarda-chuva",
// "pegá-lo", "d'água"). Número: dígitos com separador decimal ou de milhar ("3,5", "1.000").
const TOKEN =
	/(\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*)|(\p{N}+(?:[.,]\p{N}+)*)|([^\s\p{L}\p{N}]+)/gu;

export function tokenize(text: string): Token[] {
	const tokens: Token[] = [];
	for (const match of text.matchAll(TOKEN)) {
		const start = match.index;
		const kind = match[1] !== undefined ? 'word' : match[2] !== undefined ? 'number' : 'punct';
		tokens.push({ text: match[0], start, end: start + match[0].length, kind });
	}
	return tokens;
}

export function words(text: string): string[] {
	return tokenize(text)
		.filter((t) => t.kind === 'word')
		.map((t) => t.text);
}
