import { splitSentences } from '../../../src/locale/pt-BR/text/sentences.js';
import { tokenize } from '../../../src/locale/pt-BR/text/tokens.js';

const texts = (text: string) => splitSentences(text).map((s) => s.text);

describe('pt-BR sentences (R3.1)', () => {
	it('does not break after titles and page abbreviations', () => {
		expect(texts('A Dra. Ana chegou. Viu a pág. 3 e saiu.')).toEqual([
			'A Dra. Ana chegou.',
			'Viu a pág. 3 e saiu.',
		]);
	});

	it('handles honorifics, initials and an ellipsis', () => {
		expect(texts('O Sr. Almeida, a Sra. Lima e o V. Exa. chegaram... Tarde.')).toEqual([
			'O Sr. Almeida, a Sra. Lima e o V. Exa. chegaram...',
			'Tarde.',
		]);
	});

	it('breaks between dialogue lines opened by a dash', () => {
		expect(texts('— Sim. — Não.')).toEqual(['— Sim.', '— Não.']);
	});

	it('breaks after etc. only before an uppercase word', () => {
		expect(texts('Comprou pão, leite etc. e voltou. Depois dormiu.')).toHaveLength(2);
		expect(texts('Comprou pão, leite etc. Depois dormiu.')).toHaveLength(2);
	});

	it('keeps closing quotes with their sentence', () => {
		expect(texts('Ela disse: “Vou embora.” E foi.')).toEqual([
			'Ela disse: “Vou embora.”',
			'E foi.',
		]);
	});

	it('returns offsets that match text.slice', () => {
		const text = '  O Sr. Almeida, a Sra. Lima e o V. Exa. chegaram... Tarde.  — Sim! — Não?';
		for (const s of splitSentences(text)) expect(text.slice(s.start, s.end)).toBe(s.text);
	});
});

describe('pt-BR tokens', () => {
	it('keeps accents, hyphens and apostrophes inside words and offsets exact', () => {
		const text = 'Pegá-lo no guarda-chuva d’água custou 3,5 reais — ou 1.000?';
		const tokens = tokenize(text);
		expect(tokens.filter((t) => t.kind === 'word').map((t) => t.text)).toEqual([
			'Pegá-lo',
			'no',
			'guarda-chuva',
			'd’água',
			'custou',
			'reais',
			'ou',
		]);
		expect(tokens.filter((t) => t.kind === 'number').map((t) => t.text)).toEqual([
			'3,5',
			'1.000',
		]);
		for (const t of tokens) expect(text.slice(t.start, t.end)).toBe(t.text);
	});
});
