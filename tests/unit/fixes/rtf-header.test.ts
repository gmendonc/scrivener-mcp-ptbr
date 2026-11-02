import { RTFHandler } from '../../../src/services/parsers/rtf-handler.js';
import { regenerateKeepingHeader } from '../../../src/fixes/rtf-header.js';

const handler = new RTFHandler();
const fallback = (text: string) => handler.convertToRTF(text);
const HEADER =
	'{\\rtf1\\ansi\\ansicpg1252\\cocoartf2822\n{\\fonttbl\\f0\\fnil\\fcharset0 Palatino-Roman;\\f1\\fnil\\fcharset0 Palatino-Italic;}\n{\\colortbl;\\red255\\green255\\blue255;}\n\\pard\\f0\\fs26 \\cf0 ';

describe('regenerateKeepingHeader (RC.4, revisão do estágio C)', () => {
	it('keeps the original header and code page', async () => {
		const raw = regenerateKeepingHeader(
			`${HEADER}Era uma vez um rei.}`,
			'Texto novo.',
			fallback
		);
		expect(raw.startsWith(HEADER)).toBe(true);
		expect((await handler.parseRTF(raw)).plainText).toBe('Texto novo.');
	});

	it('does not make the whole regenerated body italic when the text opens in italics', async () => {
		const original = `${HEADER}{\\f1\\i Era uma vez}\\f0  um rei.\\\nFim.}`;
		const raw = regenerateKeepingHeader(original, 'Texto novo\nsegunda linha', fallback);
		const parsed = await handler.parseRTF(raw);
		expect(parsed.plainText).toBe('Texto novo\nsegunda linha');
		expect(parsed.formattedText.some((segment) => segment.style?.italic)).toBe(false);
		expect(raw).toContain('Palatino-Roman');
	});

	it('does not wrap the body in a field group that opens the document', async () => {
		const original = `${HEADER}{\\field{\\*\\fldinst HYPERLINK "x"}{\\fldrslt Link}} e texto.}`;
		const raw = regenerateKeepingHeader(original, 'Sem link.', fallback);
		expect(raw).not.toContain('\\field');
		expect((await handler.parseRTF(raw)).plainText).toBe('Sem link.');
	});
});
