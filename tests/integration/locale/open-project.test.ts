import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
	closeProjectHandler,
	openProjectHandler,
} from '../../../src/handlers/project-handlers/lifecycle.js';
import type { HandlerContext } from '../../../src/handlers/types.js';
import { compact } from '../../../src/core/response-formatter.js';

const ROOT = join(__dirname, '..', '..', '..');
const PT_FIXTURE = join(ROOT, 'tests', 'fixtures', 'pt-BR', 'sample-project-pt.scriv');
const EN_FIXTURE = join(ROOT, 'tests', 'sample-project.scriv');

function emptyContext(): HandlerContext {
	return { project: null, memoryManager: null, contentAnalyzer: {} as never };
}

describe('open_project suggests a language (R1.15)', () => {
	let workdir: string;
	beforeAll(async () => {
		workdir = await mkdtemp(join(tmpdir(), 'locale-open-'));
	});
	afterAll(async () => {
		await rm(workdir, { recursive: true, force: true });
	});

	async function open(fixture: string) {
		const path = join(workdir, basename(fixture));
		await cp(fixture, path, { recursive: true });
		const context = emptyContext();
		const result = await openProjectHandler.handler({ path }, context);
		return { path, context, text: result.content[0].text ?? '' };
	}

	it('suggests pt-BR for an unconfigured Portuguese project without saving it', async () => {
		const { path, context, text } = await open(PT_FIXTURE);
		try {
			expect(text).toMatch(
				/\n\nDetected language: pt-BR \(margin \d\.\d\d\)\. Save it with set_project_language\.$/
			);
			await context.memoryManager!.saveMemory();
			const memory = JSON.parse(
				await readFile(join(path, '.ai-memory', 'project-memory.json'), 'utf8')
			) as { customContext?: Record<string, unknown> };
			expect(memory.customContext ?? {}).not.toHaveProperty('locale');
		} finally {
			await closeProjectHandler.handler({}, context);
		}
	});

	it('keeps the English text identical to upstream', async () => {
		const { context, text } = await open(EN_FIXTURE);
		try {
			const metadata = await context.project!.getProjectMetadata();
			expect(text).toBe(
				`Project opened: ${metadata.title || 'sample-project.scriv'}\n\n${compact(metadata)}`
			);
		} finally {
			await closeProjectHandler.handler({}, context);
		}
	});
});
