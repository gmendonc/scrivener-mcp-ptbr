import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RTFHandler } from '../../../src/services/parsers/rtf-handler.js';
import { CHAPTER_1, FIXES_FIXTURES, withProjectCopy } from './project-copy.js';

const COCOA = join(FIXES_FIXTURES, 'cocoa-cp1252.rtf');
const HEADER = [
	'\\ansicpg1252',
	'{\\fonttbl\\f0\\fnil\\fcharset0 Palatino-Roman;\\f1\\fnil\\fcharset0 Palatino-Italic;}',
	'{\\colortbl;\\red255\\green255\\blue255;}',
];

describe('write_document preserves a Scrivener document (RC.4)', () => {
	let original: string;
	// O texto que um cliente envia é o texto certo (o do textutil), não o que o leitor devolve.
	let text: string;
	beforeAll(async () => {
		original = await readFile(COCOA, 'utf8');
		text = (await readFile(join(FIXES_FIXTURES, 'cocoa-cp1252.txt'), 'utf8')).trim();
	});

	it('leaves every byte alone when the text is unchanged', async () => {
		await withProjectCopy(
			async ({ project, contentPath }) => {
				await project.readDocument(CHAPTER_1);
				const fidelity = await project.writeDocumentPreserving(CHAPTER_1, text, {
					force: true,
				});
				expect(fidelity.mode).toBe('preserved');
				expect((await readFile(contentPath(CHAPTER_1))).equals(Buffer.from(original))).toBe(
					true
				);
			},
			{ [CHAPTER_1]: original }
		);
	});

	it('changes only the edited word and keeps the header and the italic run', async () => {
		await withProjectCopy(
			async ({ project, contentPath }) => {
				await project.readDocument(CHAPTER_1);
				const edited = text.replace('grumete', 'marujo');
				const fidelity = await project.writeDocumentPreserving(CHAPTER_1, edited, {
					force: true,
				});
				expect(fidelity.mode).toBe('preserved');
				const raw = await readFile(contentPath(CHAPTER_1), 'utf8');
				const at = original.indexOf('grumete');
				expect(raw.slice(0, at)).toBe(original.slice(0, at));
				expect(raw.endsWith(original.slice(at + 'grumete'.length))).toBe(true);
				for (const part of HEADER) expect(raw).toContain(part);
				expect(raw).toContain('\\f1\\i Albatroz');
				expect((await new RTFHandler().parseRTF(raw)).plainText).toBe(edited);
			},
			{ [CHAPTER_1]: original }
		);
	});

	it('keeps the original header when the edit forces a full regeneration', async () => {
		await withProjectCopy(
			async ({ project, contentPath }) => {
				await project.readDocument(CHAPTER_1);
				const edited = text.replace('dirigível Albatroz balançava', 'navio flutuava');
				const fidelity = await project.writeDocumentPreserving(CHAPTER_1, edited, {
					force: true,
					allowFormattingLoss: true,
				});
				expect(fidelity.mode).toBe('regenerated');
				const raw = await readFile(contentPath(CHAPTER_1), 'utf8');
				for (const part of HEADER) expect(raw).toContain(part);
				expect(raw).not.toContain('Helvetica');
				expect((await new RTFHandler().parseRTF(raw)).plainText).toBe(edited);
			},
			{ [CHAPTER_1]: original }
		);
	});
});
