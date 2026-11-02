import { segmentText } from '../../../src/locale/pt-BR/text/segments.js';

const shape = (text: string) =>
	segmentText(text).map(({ kind, text: t, marker, speakerHint }) => ({
		kind,
		text: t,
		...(marker ? { marker } : {}),
		...(speakerHint ? { speakerHint } : {}),
	}));

describe('pt-BR segments (R3.3)', () => {
	it('splits a dash line into speech and tag, keeping the foreign speech whole', () => {
		expect(
			shape('— No sé lo que quieres de mí, pero no voy a quedarme aquí — respondeu Carmen.')
		).toEqual([
			{
				kind: 'speech',
				text: 'No sé lo que quieres de mí, pero no voy a quedarme aquí',
				marker: 'dash',
				speakerHint: 'Carmen',
			},
			{ kind: 'tag', text: 'respondeu Carmen.' },
		]);
	});

	it('resumes speech after the tag', () => {
		expect(shape('— Vamos — disse Ana. — E depressa.').map((s) => [s.kind, s.text])).toEqual([
			['speech', 'Vamos'],
			['tag', 'disse Ana.'],
			['speech', 'E depressa.'],
		]);
	});

	it('runs an unclosed dash speech to the end of the paragraph', () => {
		expect(shape('— Ninguém sobe antes do amanhecer, entendeu?\nEla assentiu.')).toEqual([
			{ kind: 'speech', text: 'Ninguém sobe antes do amanhecer, entendeu?', marker: 'dash' },
			{ kind: 'narration', text: 'Ela assentiu.' },
		]);
	});

	it('finds speech in straight, curly and angle quotes inside narration', () => {
		expect(shape('Ele gritou "Corram!" e ela, “Agora”, e o velho, «Nunca».')).toEqual([
			{ kind: 'narration', text: 'Ele gritou' },
			{ kind: 'speech', text: 'Corram!', marker: 'double' },
			{ kind: 'narration', text: 'e ela,' },
			{ kind: 'speech', text: 'Agora', marker: 'double' },
			{ kind: 'narration', text: ', e o velho,' },
			{ kind: 'speech', text: 'Nunca', marker: 'angle' },
			{ kind: 'narration', text: '.' },
		]);
	});

	it('treats single quotes as a quotation and leaves apostrophes alone', () => {
		expect(shape('A placa dizia ‘a bordo’ perto do pote d’água.')).toEqual([
			{ kind: 'narration', text: 'A placa dizia' },
			{ kind: 'quote', text: 'a bordo', marker: 'single' },
			{ kind: 'narration', text: 'perto do pote d’água.' },
		]);
	});

	it('does not treat a parenthetical dash in narration as dialogue', () => {
		expect(shape('O dirigível — enorme — cruzou o porto.')).toEqual([
			{ kind: 'narration', text: 'O dirigível — enorme — cruzou o porto.' },
		]);
	});

	it('reads a tag that starts with a name when the speech has no final mark (revisão 3a)', () => {
		expect(shape('— Vamos — Ana disse.').map((s) => [s.kind, s.text])).toEqual([
			['speech', 'Vamos'],
			['tag', 'Ana disse.'],
		]);
		expect(shape('— Vamos. — Agora.').map((s) => s.kind)).toEqual(['speech', 'speech']);
	});

	it('keeps a long capitalized second speech as speech (revisão 3b)', () => {
		expect(
			shape("— Wait — Please don't go, I beg you, my dear friend, not now.").map(
				(s) => s.kind
			)
		).toEqual(['speech', 'speech']);
	});

	it('gives each speech the speaker of its own tag', () => {
		const segments = shape('— Você vem? — perguntou Maria. — Não — Pedro respondeu.');
		expect(segments.map((s) => [s.kind, s.text, s.speakerHint])).toEqual([
			['speech', 'Você vem?', 'Maria'],
			['tag', 'perguntou Maria.', undefined],
			['speech', 'Não', 'Pedro'],
			['tag', 'Pedro respondeu.', undefined],
		]);
	});

	it('splits a dash without spaces', () => {
		expect(
			shape('—I told you, this is not the place for that—disse John.').map((s) => [
				s.kind,
				s.text,
			])
		).toEqual([
			['speech', 'I told you, this is not the place for that'],
			['tag', 'disse John.'],
		]);
	});

	it('keeps an en dash range inside a speech', () => {
		expect(shape('— Foi entre 1910–1915 — disse ela.').map((s) => s.text)).toEqual([
			'Foi entre 1910–1915',
			'disse ela.',
		]);
	});

	it('returns offsets that match text.slice', () => {
		const text = 'Narração.\n— Fala um — disse Ana. — Fala dois.\n«Citação» final.';
		for (const s of segmentText(text)) expect(text.slice(s.start, s.end)).toBe(s.text);
	});
});
