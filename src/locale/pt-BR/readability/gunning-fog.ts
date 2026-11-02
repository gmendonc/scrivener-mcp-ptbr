import { round2, type TextCounts } from './counts.js';

/**
 * Gunning Fog como no NILC-Metrix (Leal et al., arXiv 2201.03445): 0,4 × (palavras por frase +
 * porcentagem de palavras com mais de duas sílabas), com a divisão silábica pt-BR.
 */
export function gunningFog(counts: TextCounts): number {
	if (!counts.words || !counts.sentences) return 0;
	return round2(
		0.4 * (counts.words / counts.sentences + (100 * counts.polysyllables) / counts.words)
	);
}
