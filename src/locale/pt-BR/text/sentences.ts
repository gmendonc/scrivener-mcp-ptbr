// fonte: curadoria própria

/**
 * Sentence splitting for pt-BR prose (SPEC §6.8, R3.1). The `compromise` splitter breaks after
 * "Dra." and "pág."; here a terminal mark ends a sentence only when followed by whitespace and
 * a sentence opener, and never right after a title, an initial or an abbreviation that is
 * followed by a lowercase word or a number.
 */

/** Títulos e tratamentos: o ponto nunca termina frase, porque o que vem depois é um nome. */
export const TITLE_ABBREVIATIONS: readonly string[] = [
	'Sr.',
	'Sra.',
	'Srta.',
	'Srs.',
	'Sras.',
	'Dr.',
	'Dra.',
	'Drs.',
	'Dras.',
	'Prof.',
	'Profa.',
	'Profs.',
	'Exa.',
	'Exas.',
	'Exmo.',
	'Exma.',
	'Ilmo.',
	'Ilma.',
	'Sto.',
	'Sta.',
	'Pe.',
	'Fr.',
	'D.',
	'S.',
	'Gal.',
	'Cel.',
	'Ten.',
	'Cap.',
	'Sgt.',
	'Av.',
	'R.',
	'Jr.',
];

/** Abreviações comuns: o ponto só termina frase quando a palavra seguinte é maiúscula. */
export const ABBREVIATIONS: readonly string[] = [
	...TITLE_ABBREVIATIONS,
	'pág.',
	'págs.',
	'p.',
	'pp.',
	'cap.',
	'caps.',
	'art.',
	'arts.',
	'etc.',
	'ex.',
	'obs.',
	'n.',
	'nº.',
	'vol.',
	'vols.',
	'ed.',
	'fl.',
	'fls.',
	'tel.',
	'aprox.',
	'séc.',
	'v.',
	'cf.',
	'apud.',
];

const TITLES = new Set(TITLE_ABBREVIATIONS.map((a) => a.toLowerCase()));
const OTHERS = new Set(
	ABBREVIATIONS.filter((a) => !TITLES.has(a.toLowerCase())).map((a) => a.toLowerCase())
);

// Fim de frase candidato: . ! ? … (em sequência), seguido de fechamento de aspas/parênteses
// opcional e de espaço.
const TERMINAL = /[.!?…]+["”’»)\]]*(?=\s)/gu;
// Abre frase: maiúscula, número, travessão de fala ou abertura de aspas.
const OPENER = /^\s+(?=[\p{Lu}\p{N}—–"“«'‘(¿¡])/u;
const PREVIOUS_WORD = /(\p{L}[\p{L}\p{M}]*\.?)$/u;

export interface SentenceSpan {
	text: string;
	start: number;
	end: number;
}

export function splitSentences(text: string): SentenceSpan[] {
	// Quebra de linha fecha frase: título, verso ou fala sem ponto final não se juntam à linha
	// seguinte (revisão do estágio 3a).
	const spans: SentenceSpan[] = [];
	let lineStart = 0;
	for (const line of text.split('\n')) {
		spans.push(...splitLine(text, lineStart, lineStart + line.length));
		lineStart += line.length + 1;
	}
	return spans;
}

// Tag de diálogo depois de ? ! … ("— Você vem? — perguntou ela."): a frase continua.
const DIALOGUE_TAG = /^\s+[—–]\s*\p{Ll}/u;

function splitLine(text: string, from: number, to: number): SentenceSpan[] {
	const spans: SentenceSpan[] = [];
	const line = text.slice(from, to);
	let start = skipSpace(line, 0);
	for (const match of line.matchAll(TERMINAL)) {
		const end = match.index + match[0].length;
		if (end <= start) continue;
		const rest = line.slice(end, end + 80);
		if (!OPENER.exec(rest) || DIALOGUE_TAG.test(rest)) continue;
		if (match[0] === '.' && keepsSentence(line.slice(start, end), rest.trimStart())) continue;
		spans.push({ text: line.slice(start, end), start: from + start, end: from + end });
		start = skipSpace(line, end);
	}
	const end = trimEnd(line);
	if (end > start)
		spans.push({ text: line.slice(start, end), start: from + start, end: from + end });
	return spans;
}

/** Ponto que não termina frase: título, inicial ("V.", "J."), abreviação antes de minúscula. */
function keepsSentence(before: string, next: string): boolean {
	const word = PREVIOUS_WORD.exec(before)?.[1];
	if (!word) return false;
	const lower = word.toLowerCase();
	if (TITLES.has(lower)) return true;
	// Inicial de nome: consoante maiúscula isolada ("J.", "V."); vogal isolada é palavra ("É.", "A.").
	if (/^[B-DF-HJ-NP-TV-Z]\.$/u.test(word)) return true;
	if (OTHERS.has(lower)) return !/^\p{Lu}/u.test(next);
	return false;
}

function skipSpace(text: string, index: number): number {
	while (index < text.length && /\s/u.test(text[index])) index++;
	return index;
}

function trimEnd(text: string): number {
	let end = text.length;
	while (end > 0 && /\s/u.test(text[end - 1])) end--;
	return end;
}

/** Offsets of dots that do not end a sentence (titles, initials, abbreviations). */
export function nonTerminalDots(text: string): number[] {
	const dots: number[] = [];
	for (const match of text.matchAll(TERMINAL)) {
		if (match[0] !== '.') continue;
		const end = match.index + 1;
		// Janela curta: a palavra anterior e o começo da seguinte bastam (evita custo quadrático).
		const before = text.slice(Math.max(0, end - 40), end);
		if (keepsSentence(before, text.slice(end, end + 40).trimStart())) dots.push(match.index);
	}
	return dots;
}
