import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCallContext, currentLocale, runWithLocale } from '../../../src/locale/context.js';
import { computeReadability } from '../../../src/locale/engines/narrative-lens.js';
import { countText } from '../../../src/locale/pt-BR/readability/counts.js';
import { daleChall } from '../../../src/locale/pt-BR/readability/dale-chall.js';
import { fleschBand, fleschEase } from '../../../src/locale/pt-BR/readability/flesch.js';
import { gunningFog } from '../../../src/locale/pt-BR/readability/gunning-fog.js';
import { computeReadabilityPtBR } from '../../../src/locale/pt-BR/readability/index.js';

const SENTENCE = 'O pássaro voava sobre a montanha distante.';

describe('pt-BR readability (R3.6–R3.8)', () => {
	// Fórmula: Martins, Ghiraldelo, Nunes e Oliveira Jr. (1996), Notas do ICMC-USP n. 28 — o
	// Flesch inglês mais 42 pontos —, e Leal et al., NILC-Metrix, arXiv 2201.03445:
	// 248,835 − 1,015 × (palavras/frase) − 84,6 × (sílabas/palavra).
	it('computes the adapted Flesch for the reference sentence (R3.6)', () => {
		const counts = countText(SENTENCE);
		expect(counts).toMatchObject({ words: 7, syllables: 16, sentences: 1 });
		expect(fleschEase(counts)).toBeCloseTo(248.835 - 1.015 * 7 - 84.6 * (16 / 7), 2);
		expect(Math.abs(fleschEase(counts) - 48.36)).toBeLessThanOrEqual(0.01);
		expect(fleschBand(48.36)).toBe('pouco difícil (colegial e nível superior)');
		expect(fleschBand(80)).toBe('muito fácil (1ª a 4ª série)');
	});

	it('computes the adapted Dale-Chall with a word list (R3.7)', () => {
		const counts = countText(SENTENCE);
		const simple = new Set(['o', 'pássaro', 'sobre', 'a', 'montanha']);
		// 2 de 7 palavras fora da lista ("voava", "distante") → 28,571...%
		expect(daleChall(counts, simple)).toBeCloseTo(
			0.1579 * ((100 * 2) / 7) + 0.0496 * 7 + 3.6365,
			2
		);
	});

	it('computes the NILC Gunning Fog with pt-BR syllables', () => {
		const counts = countText(SENTENCE);
		// "pássaro", "voava", "montanha", "distante": 4 de 7 com mais de duas sílabas
		expect(counts.polysyllables).toBe(4);
		expect(gunningFog(counts)).toBeCloseTo(0.4 * (7 + (100 * 4) / 7), 2);
	});

	it('marks the fields the semantics table lists as unavailable (R3.8)', () => {
		// A tabela de docs/pt-br/semantica-campos.md é a fonte: campo com "`0` e `unavailableMetrics`".
		const doc = readFileSync(
			join(__dirname, '..', '..', '..', 'docs', 'pt-br', 'semantica-campos.md'),
			'utf8'
		);
		const documented = [...doc.matchAll(/^\| `(\w+)` \|[^\n]*`unavailableMetrics` \|$/gmu)].map(
			(m) => m[1]
		);
		const { result, unavailable } = computeReadabilityPtBR(SENTENCE);
		expect(unavailable.sort()).toEqual(documented.sort());
		for (const name of documented) expect(result[name as keyof typeof result]).toBe(0);
		expect(doc).toMatch(/`smog` \/ `smogAvailable`[^\n]*`smogAvailable: false`/u);
		expect(result.smogAvailable).toBe(false);
		expect(result.gradeLevels.fkgl).toBe('indisponível em pt-BR');
		expect(result.charCount).toBe('Opássarovoavasobreamontanhadistante'.length);
	});

	it('goes through the facade in a pt-BR call and reports unavailable metrics', () => {
		runWithLocale(createCallContext({ toolName: 't', project: { primary: 'pt-BR' } }), () => {
			const result = computeReadability(SENTENCE);
			expect(result.fleschEase).toBeCloseTo(48.36, 2);
			expect([...currentLocale()!.unavailableMetrics].sort()).toEqual(
				['ari', 'colemanLiau', 'daleChall', 'fkgl', 'readabilityVariance'].sort()
			);
		});
	});

	it('does not count a blanked foreign speech as a sentence (revisão 3b)', () => {
		const pt =
			'Ana abriu a janela da cozinha e viu que a rua ainda estava molhada da chuva da noite.';
		const blanked = `${pt}\n—                                  \n—                       `;
		expect(countText(blanked).sentences).toBe(countText(pt).sentences);
		expect(fleschEase(countText(blanked))).toBe(fleschEase(countText(pt)));
	});

	it('handles empty text without dividing by zero', () => {
		const { result } = computeReadabilityPtBR('');
		expect(result).toMatchObject({ wordCount: 0, fleschEase: 0, gunningFog: 0 });
	});
});
