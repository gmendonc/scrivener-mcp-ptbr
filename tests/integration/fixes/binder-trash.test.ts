import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseStringPromise } from 'xml2js';
import { CHAPTER_1, withProjectCopy } from './project-copy.js';

const CHAPTER_2 = 'A1B2C3D4-0001-4000-8000-000000000002';
const DRAFT = 'A1B2C3D4-0000-4000-8000-0000000000D0';
const TRASH = 'A1B2C3D4-0000-4000-8000-0000000000F0';

interface XmlItem {
	$: { UUID: string; Type: string };
	Title?: string;
	Children?: { BinderItem?: XmlItem | XmlItem[] } | '';
}

function list<T>(value: T | T[] | undefined): T[] {
	return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

async function binderOf(xml: string): Promise<{ items: XmlItem[]; searchResults: unknown }> {
	const parsed = await parseStringPromise(xml, { explicitArray: false });
	const binder = parsed.ScrivenerProject.Binder;
	return { items: list<XmlItem>(binder.BinderItem), searchResults: binder.SearchResults };
}

const childIds = (item: XmlItem | undefined) =>
	list(item?.Children ? item.Children.BinderItem : undefined).map((child) => child.$.UUID);

describe('delete_document and restore_document use the native trash (RC.6, RC.7)', () => {
	it('moves a deleted document into the TrashFolder without creating SearchResults', async () => {
		await withProjectCopy(async ({ project, scrivx }) => {
			await project.deleteDocument(CHAPTER_1, { force: true });
			const { items, searchResults } = await binderOf(await scrivx());
			const trash = items.find((item) => item.$.Type === 'TrashFolder');
			expect(trash?.$.UUID).toBe(TRASH);
			expect(childIds(trash)).toEqual([CHAPTER_1]);
			expect(searchResults).toBeUndefined();
			const trashed = await project.getTrashDocuments();
			expect(trashed.map((doc) => doc.id)).toContain(CHAPTER_1);
		});
	});

	it('creates a TrashFolder when the project has none', async () => {
		await withProjectCopy(async ({ path, project, scrivx }) => {
			const file = join(path, 'sample-project-pt.scrivx');
			const xml = await readFile(file, 'utf8');
			const withoutTrash = xml.replace(
				/\s*<BinderItem UUID="A1B2C3D4-0000-4000-8000-0000000000F0"[\s\S]*?<\/BinderItem>/,
				''
			);
			expect(withoutTrash).not.toContain('TrashFolder');
			await writeFile(file, withoutTrash);
			await project.loadProject();
			await project.deleteDocument(CHAPTER_1, { force: true });
			const { items } = await binderOf(await scrivx());
			const trash = items[items.length - 1];
			expect(trash?.$.Type).toBe('TrashFolder');
			expect(trash?.Title).toBe('Trash');
			expect(childIds(trash)).toEqual([CHAPTER_1]);
		});
	});

	it('restores an item that Scrivener put in the TrashFolder into the Draft', async () => {
		await withProjectCopy(async ({ path, project, scrivx }) => {
			// Scrivener moves trashed items into the TrashFolder itself; simulate that on disk.
			const file = join(path, 'sample-project-pt.scrivx');
			const xml = await readFile(file, 'utf8');
			const chapter =
				/\s*<BinderItem UUID="A1B2C3D4-0001-4000-8000-000000000002"[\s\S]*?<\/BinderItem>/.exec(
					xml
				)![0];
			const moved = xml
				.replace(chapter, '')
				.replace(
					'<Title>Lixeira</Title>',
					`<Title>Lixeira</Title>\n<Children>${chapter}</Children>`
				);
			await writeFile(file, moved);
			await project.loadProject();
			await project.recoverFromTrash(CHAPTER_2, undefined, { force: true });
			const xml2 = await scrivx();
			// Emptying the trash must not leave an attribute-less <BinderItem/> behind.
			expect(xml2).not.toMatch(/<BinderItem\s*\/>/);
			const { items } = await binderOf(xml2);
			const draft = items.find((item) => item.$.UUID === DRAFT);
			expect(childIds(draft).slice(-1)[0]).toBe(CHAPTER_2);
			expect(childIds(items.find((item) => item.$.UUID === TRASH))).toEqual([]);
		});
	});

	it('still restores an item parked in SearchResults by earlier versions', async () => {
		await withProjectCopy(async ({ path, project, scrivx }) => {
			const file = join(path, 'sample-project-pt.scrivx');
			const xml = await readFile(file, 'utf8');
			const chapter =
				/\s*<BinderItem UUID="A1B2C3D4-0001-4000-8000-000000000002"[\s\S]*?<\/BinderItem>/.exec(
					xml
				)![0];
			const legacy = xml
				.replace(chapter, '')
				.replace(
					'</Binder>',
					`<SearchResults><Children>${chapter}</Children></SearchResults></Binder>`
				);
			await writeFile(file, legacy);
			await project.loadProject();
			await project.recoverFromTrash(CHAPTER_2, DRAFT, { force: true });
			const { items } = await binderOf(await scrivx());
			expect(childIds(items.find((item) => item.$.UUID === DRAFT))).toContain(CHAPTER_2);
		});
	});

	it('answers NOT_FOUND for an empty trash and for an id that is not in it', async () => {
		await withProjectCopy(async ({ project }) => {
			await expect(
				project.recoverFromTrash(CHAPTER_1, undefined, { force: true })
			).rejects.toThrow('Trash is empty');
			await project.deleteDocument(CHAPTER_2, { force: true });
			await expect(
				project.recoverFromTrash(CHAPTER_1, undefined, { force: true })
			).rejects.toThrow('not found in trash');
		});
	});
});

describe('the Draft is a valid move and restore target (erro 7)', () => {
	it('moves a document into the DraftFolder', async () => {
		await withProjectCopy(async ({ project, scrivx }) => {
			await project.moveDocument(CHAPTER_2, DRAFT, 0, { force: true });
			const { items } = await binderOf(await scrivx());
			expect(childIds(items.find((item) => item.$.UUID === DRAFT))[0]).toBe(CHAPTER_2);
		});
	});

	it('still refuses the TrashFolder as a move target', async () => {
		await withProjectCopy(async ({ project }) => {
			await expect(
				project.moveDocument(CHAPTER_2, TRASH, 0, { force: true })
			).rejects.toThrow('not found');
		});
	});
});
