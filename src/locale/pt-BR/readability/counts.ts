import { splitSentences } from '../text/sentences.js';
import { countSyllables } from '../text/syllables.js';
import { tokenize } from '../text/tokens.js';

/** Counts the pt-BR readability formulas share (SPEC §6.8, docs/pt-br/semantica-campos.md). */
export interface TextCounts {
	sentences: number;
	words: number;
	syllables: number;
	letters: number;
	/** Palavras com três ou mais sílabas ("mais de duas", no Gunning Fog do NILC-Metrix). */
	polysyllables: number;
	wordList: readonly string[];
}

export function countText(text: string): TextCounts {
	const wordList = tokenize(text)
		.filter((t) => t.kind === 'word')
		.map((t) => t.text);
	let syllables = 0;
	let polysyllables = 0;
	let letters = 0;
	for (const word of wordList) {
		const n = countSyllables(word);
		syllables += n;
		if (n >= 3) polysyllables++;
		letters += (word.match(/\p{L}/gu) ?? []).length;
	}
	// Só frases com palavra: um trecho estrangeiro apagado deixa o travessão sozinho, que não é
	// frase (revisão do estágio 3b).
	const sentences = splitSentences(text).filter((s) => /\p{L}/u.test(s.text)).length;
	return { sentences, words: wordList.length, syllables, letters, polysyllables, wordList };
}

export function round2(value: number): number {
	return Math.round(value * 100) / 100;
}
