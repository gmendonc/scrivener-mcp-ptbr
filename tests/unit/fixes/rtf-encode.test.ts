import { RTFHandler } from '../../../src/services/parsers/rtf-handler.js';
import { encodeRtfText } from '../../../src/fixes/rtf-encode.js';

const handler = new RTFHandler();

describe('RTF writer keeps the characters it receives (RC.3)', () => {
	it.each([
		'Ele disse "oi" e ela respondeu \'tchau\'.',
		'“Aspas curvas” e ‘simples’, «angulares» — travessão – meia-risca… fim.',
		'Ninguém subiu ao convés; a capitã, o grumete e três marinheiros esperavam.',
		'Barra \\ e chaves { } literais.\nSegundo parágrafo.\tCom tabulação.',
		'Emoji fora do BMP: 🎈 e símbolo ™.',
	])('round-trips %p', async (text) => {
		const { plainText } = await handler.parseRTF(handler.convertToRTF(text));
		expect(plainText).toBe(text);
	});

	it('never turns straight quotes into curly-quote control words', () => {
		const rtf = handler.convertToRTF('"a" \'b\'');
		expect(rtf).not.toMatch(/\\(?:ldblquote|rdblquote|lquote|rquote)/);
	});

	it('encodes non-ASCII as \\uN with a ? fallback and keeps ASCII literal', () => {
		expect(encodeRtfText('é "x" —')).toBe('\\u233? "x" \\u8212?');
		expect(encodeRtfText('🎈')).toBe('\\u-10180?\\u-8312?');
	});
});
