import { detectSpans, isExcluded, type SpanOptions } from '../../../src/locale/pt-BR/text/spans.js';

const PT: SpanOptions = { documentLanguage: 'pt-BR' };
const shape = (text: string, options: SpanOptions = PT) =>
	detectSpans(text, options).map((s) => ({
		text: text.slice(s.start, s.end),
		language: s.language,
		reason: s.reason,
	}));

describe('pt-BR language spans (R3.4)', () => {
	it('marks a Spanish speech and lets the tag inherit pt-BR', () => {
		expect(
			shape('— No sé lo que quieres de mí, pero no voy a quedarme aquí — respondeu Carmen.', {
				...PT,
				embedded: ['es'],
			})
		).toEqual([
			{
				text: 'No sé lo que quieres de mí, pero no voy a quedarme aquí',
				language: 'es',
				reason: 'detected',
			},
			{ text: 'respondeu Carmen.', language: 'pt-BR', reason: 'inherited' },
		]);
	});

	it('lets short speeches inherit the document language', () => {
		expect(shape('— Sim.')).toEqual([{ text: 'Sim.', language: 'pt-BR', reason: 'inherited' }]);
		expect(shape('Ele disse "Okay." e saiu.').find((s) => s.text === 'Okay.')).toEqual({
			text: 'Okay.',
			language: 'pt-BR',
			reason: 'inherited',
		});
	});

	it('lets a short speech inherit the same speaker’s earlier language', () => {
		const text =
			'— I told you, this is not the place for that — disse John.\n— Okay — disse John.';
		const spans = shape(text);
		expect(spans[0]).toMatchObject({ language: 'en', reason: 'detected' });
		expect(spans[2]).toEqual({ text: 'Okay', language: 'en', reason: 'inherited' });
	});

	it('leaves a tie undetermined, excluded, unless embedded breaks it', () => {
		const text = '— Paco de Lucía que no sabe tocar a guitarra — disse ela.';
		const [speech] = detectSpans(text, PT);
		expect(speech).toMatchObject({ language: 'undetermined', reason: 'undetermined' });
		expect(isExcluded(speech, 'pt-BR')).toBe(true);
		expect(detectSpans(text, { ...PT, embedded: ['es'] })[0]).toMatchObject({
			language: 'es',
			reason: 'detected',
		});
	});

	it('does not turn allowlisted or loan words into a foreign signal', () => {
		expect(shape('Ela comprou um laptop.', { ...PT, allowlist: ['laptop'] })).toEqual([
			{ text: 'Ela comprou um laptop.', language: 'pt-BR', reason: 'inherited' },
		]);
		expect(shape('— Laptop — disse ela.', { ...PT, allowlist: ['laptop'] })[0]).toEqual({
			text: 'Laptop',
			language: 'pt-BR',
			reason: 'allowlist',
		});
		const loans = shape('Ele mandou o e-mail para o board antes do meeting de amanhã cedo.');
		expect(loans.every((s) => s.language === 'pt-BR')).toBe(true);
	});
});

describe('pt-BR narration spans', () => {
	it('keeps tied short narration in the document language', () => {
		expect(shape('A Dra. Ana olhou a chuva.')).toEqual([
			{ text: 'A Dra. Ana olhou a chuva.', language: 'pt-BR', reason: 'inherited' },
		]);
	});

	it('still marks a clearly English narration paragraph', () => {
		const [span] = shape(
			'She looked at the window and thought about the letter that was on the table.'
		);
		expect(span).toMatchObject({ language: 'en', reason: 'detected' });
	});
});
