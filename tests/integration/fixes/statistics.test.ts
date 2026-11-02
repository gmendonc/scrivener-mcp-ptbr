import { getStatisticsHandler } from '../../../src/handlers/compilation-handlers.js';
import type { HandlerContext } from '../../../src/handlers/types.js';
import { CHAPTER_1, withProjectCopy } from './project-copy.js';

interface Stats {
	draftDocuments: number;
	researchDocuments: number;
	trashedDocuments: number;
	totalCharacters: number;
	title: string;
}

describe('get_statistics fills per-folder counts, characters and title (RC.9)', () => {
	it('counts the pt-BR fixture correctly before and after a delete', async () => {
		await withProjectCopy(async ({ project }) => {
			const context = { project } as unknown as HandlerContext;
			const run = async () =>
				(await getStatisticsHandler.handler({}, context))
					.structuredContent as unknown as Stats;

			let expectedCharacters = 0;
			for (const id of [
				CHAPTER_1,
				CHAPTER_1.replace(/1$/, '2'),
				CHAPTER_1.replace(/1$/, '3'),
			])
				expectedCharacters += (await project.readDocument(id)).length;

			const before = await run();
			expect(before).toMatchObject({
				draftDocuments: 3,
				researchDocuments: 0,
				trashedDocuments: 0,
				totalCharacters: expectedCharacters,
				title: 'sample-project-pt',
			});
			expect(before.totalCharacters).toBeGreaterThan(0);

			await project.deleteDocument(CHAPTER_1, { force: true });
			const after = await run();
			expect(after).toMatchObject({ draftDocuments: 2, trashedDocuments: 1 });
		});
	});
});
