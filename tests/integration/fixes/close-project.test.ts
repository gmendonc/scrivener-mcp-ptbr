import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	closeProjectHandler,
	openProjectHandler,
} from '../../../src/handlers/project-handlers/lifecycle.js';
import type { HandlerContext } from '../../../src/handlers/types.js';
import { PT_FIXTURE } from './project-copy.js';

describe('close_project (RC.14, erro 11)', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), 'fixes-close-'));
	});
	afterAll(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it('answers in under 5 s after open_project on the fixture', async () => {
		const path = join(dir, 'sample-project-pt.scriv');
		await cp(PT_FIXTURE, path, { recursive: true });
		const context: HandlerContext = {
			project: null,
			memoryManager: null,
			contentAnalyzer: {} as never,
		};
		await openProjectHandler.handler({ path }, context);
		const started = Date.now();
		await closeProjectHandler.handler({}, context);
		expect(Date.now() - started).toBeLessThan(5000);
		expect(context.project).toBeNull();
	});
});
