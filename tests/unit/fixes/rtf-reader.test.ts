import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RTFHandler } from '../../../src/services/parsers/rtf-handler.js';
import { scanRawText } from '../../../src/services/parsers/rtf-splice.js';

const FIXTURES = join(__dirname, '..', '..', 'fixtures', 'fixes');
const raw = readFileSync(join(FIXTURES, 'cocoa-cp1252.rtf'), 'utf8');
// Gerado uma vez com `textutil -convert txt -stdout cocoa-cp1252.rtf` no macOS (RC.2).
const expected = readFileSync(join(FIXTURES, 'cocoa-cp1252.txt'), 'utf8');

describe('RTF reader matches textutil on a Scrivener-style cp1252 file (RC.2)', () => {
	it('decodes the body exactly as textutil does', async () => {
		const { plainText } = await new RTFHandler().parseRTF(raw);
		expect(plainText).toBe(expected.trim());
	});

	it('never emits C1 control characters', async () => {
		const { plainText } = await new RTFHandler().parseRTF(raw);
		expect(plainText).not.toMatch(/[\u0080-\u009f]/u);
	});

	it('keeps the splice scanner in step with the reader', async () => {
		const { plainText } = await new RTFHandler().parseRTF(raw);
		expect(scanRawText(raw).text.trim()).toBe(plainText);
	});
});
