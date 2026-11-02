import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ScrivenerProject } from '../../../src/scrivener-project.js';

const ROOT = join(__dirname, '..', '..', '..');
export const PT_FIXTURE = join(ROOT, 'tests', 'fixtures', 'pt-BR', 'sample-project-pt.scriv');
export const FIXES_FIXTURES = join(ROOT, 'tests', 'fixtures', 'fixes');
export const CHAPTER_1 = 'A1B2C3D4-0001-4000-8000-000000000001';

export interface ProjectCopy {
	path: string;
	project: ScrivenerProject;
	scrivx(): Promise<string>;
	contentPath(documentId: string): string;
}

/** Runs `fn` on a loaded temporary copy of the pt-BR fixture, optionally replacing bodies. */
export async function withProjectCopy<T>(
	fn: (copy: ProjectCopy) => Promise<T>,
	contents: Record<string, string> = {}
): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), 'fixes-'));
	const path = join(dir, 'sample-project-pt.scriv');
	await cp(PT_FIXTURE, path, { recursive: true });
	const contentPath = (id: string) => join(path, 'Files', 'Data', id, 'content.rtf');
	for (const [id, raw] of Object.entries(contents)) await writeFile(contentPath(id), raw);
	const project = new ScrivenerProject(path);
	try {
		await project.loadProject();
		return await fn({
			path,
			project,
			contentPath,
			scrivx: () => readFile(join(path, 'sample-project-pt.scrivx'), 'utf8'),
		});
	} finally {
		await project.close();
		await rm(dir, { recursive: true, force: true });
	}
}
