import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { countSyllables, syllabify } from '../../../src/locale/pt-BR/text/syllables.js';

const TSV = join(__dirname, '..', '..', 'fixtures', 'pt-BR', 'silabas.tsv');

describe('pt-BR syllables (R3.2)', () => {
	it.each([
		['janela', 'ja-ne-la'],
		['saudade', 'sau-da-de'],
		['país', 'pa-ís'],
		['rainha', 'ra-i-nha'],
		['guerra', 'guer-ra'],
		['pássaro', 'pás-sa-ro'],
		['voava', 'vo-a-va'],
		['montanha', 'mon-ta-nha'],
	])('%s → %s', (word, division) => {
		expect(syllabify(word).join('-')).toBe(division);
	});

	it('matches every word of the curated list (silabas.tsv)', () => {
		const rows = readFileSync(TSV, 'utf8')
			.split('\n')
			.filter((line) => line && !line.startsWith('#'))
			.map((line) => line.split('\t'));
		expect(rows.length).toBeGreaterThanOrEqual(200);
		const wrong = rows
			.map(([word, division]) => ({
				word,
				expected: division,
				got: syllabify(word).join('-'),
			}))
			.filter((r) => r.got !== r.expected);
		expect(wrong).toEqual([]);
	});

	it('counts syllables and keeps one-syllable words whole', () => {
		expect(countSyllables('pássaro')).toBe(3);
		expect(syllabify('mãe')).toEqual(['mãe']);
		expect(syllabify('Pneu')).toEqual(['Pneu']);
	});
});
