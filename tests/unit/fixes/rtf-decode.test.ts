import { getLogger } from '../../../src/core/logger.js';
import {
	decodeRtfHex,
	escapedLineBreakLength,
	isRawLineBreak,
	rtfCodepage,
} from '../../../src/fixes/rtf-decode.js';

describe('rtf-decode (RC.1)', () => {
	it.each([
		['92', '’'],
		['93', '“'],
		['94', '”'],
		['96', '–'],
		['97', '—'],
		['85', '…'],
		['e9', 'é'],
		['e3', 'ã'],
		['e7', 'ç'],
		['ab', '«'],
		['41', 'A'],
	])("decodes \\'%s in cp1252 as %s", (hex, char) => {
		expect(decodeRtfHex(hex, 1252)).toBe(char);
	});

	it('reads the code page from the header', () => {
		expect(rtfCodepage('{\\rtf1\\ansi\\ansicpg1252\\cocoartf2822 x}')).toBe(1252);
		expect(rtfCodepage('{\\rtf1\\ansi\\ansicpg1250 x}')).toBe(1250);
		expect(rtfCodepage('{\\rtf1\\mac x}')).toBe(10000);
		expect(rtfCodepage('{\\rtf1\\ansi x}')).toBe(1252);
	});

	it('decodes another declared code page', () => {
		expect(decodeRtfHex('8e', 10000)).toBe('é');
		expect(decodeRtfHex('9a', 1250)).toBe('š');
	});

	it('falls back to Latin-1 with a warning on an unsupported code page', () => {
		const warn = jest.spyOn(getLogger('fixes/rtf-decode'), 'warn');
		expect(decodeRtfHex('e9', 99999)).toBe('é');
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('recognizes raw and escaped line breaks', () => {
		expect(isRawLineBreak('\n')).toBe(true);
		expect(isRawLineBreak('\r')).toBe(true);
		expect(isRawLineBreak(' ')).toBe(false);
		expect(escapedLineBreakLength('a\\\nb', 1)).toBe(2);
		expect(escapedLineBreakLength('a\\\r\nb', 1)).toBe(3);
		expect(escapedLineBreakLength('a\\~b', 1)).toBe(0);
	});
});
