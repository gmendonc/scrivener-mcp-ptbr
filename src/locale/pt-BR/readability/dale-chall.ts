import { round2, type TextCounts } from './counts.js';

/**
 * Dale-Chall adaptado (Leal et al., arXiv 2201.03445): 0,1579 × % de palavras fora do
 * Dicionário de Palavras Simples (Biderman, 1998) + 0,0496 × palavras por frase + 3,6365. Os
 * coeficientes foram calibrados com essa lista; sem ela, a métrica fica indisponível (R3.7).
 */
export function daleChall(counts: TextCounts, simpleWords: ReadonlySet<string>): number {
	if (!counts.words || !counts.sentences) return 0;
	const unfamiliar = counts.wordList.filter((w) => !simpleWords.has(w.toLowerCase())).length;
	return round2(
		0.1579 * ((100 * unfamiliar) / counts.words) +
			0.0496 * (counts.words / counts.sentences) +
			3.6365
	);
}
