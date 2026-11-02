import { round2, type TextCounts } from './counts.js';

/**
 * Flesch adaptado ao português do Brasil (Martins, Ghiraldelo, Nunes e Oliveira Jr., 1996):
 * o Flesch inglês (206,835 − 1,015 × palavras/frase − 84,6 × sílabas/palavra) mais 42 pontos.
 * Conferido no artigo original (Notas do ICMC-USP n. 28) e em Leal et al., arXiv 2201.03445.
 */
export function fleschEase(counts: TextCounts): number {
	if (!counts.words || !counts.sentences) return 0;
	return round2(
		248.835 -
			1.015 * (counts.words / counts.sentences) -
			84.6 * (counts.syllables / counts.words)
	);
}

/** Faixas de Martins et al. (1996), com os rótulos do artigo. */
export function fleschBand(score: number): string {
	if (score >= 75) return 'muito fácil (1ª a 4ª série)';
	if (score >= 50) return 'fácil (5ª a 8ª série)';
	if (score >= 25) return 'pouco difícil (colegial e nível superior)';
	return 'muito difícil (textos acadêmicos)';
}
