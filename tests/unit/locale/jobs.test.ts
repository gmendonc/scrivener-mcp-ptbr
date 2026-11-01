import { createCallContext, currentLocale, runWithLocale } from '../../../src/locale/context.js';
import { runWithJobLocale, withJobLocale } from '../../../src/locale/jobs.js';

describe('locale propagation through the queue (R1.13)', () => {
	it('stores the call locale in the job data', () => {
		const ctx = createCallContext({
			toolName: 'queue_document_analysis',
			project: { primary: 'pt-BR' },
			documentId: 'd1',
		});
		const data = runWithLocale(ctx, () => withJobLocale({ documentId: 'd1', content: 'x' }));
		expect(data).toEqual({
			documentId: 'd1',
			content: 'x',
			__locale: { project: { primary: 'pt-BR' }, documentId: 'd1' },
		});
		// O payload passa por JSON no envelope da fila.
		expect(JSON.parse(JSON.stringify(data))).toEqual(data);
	});

	it('reopens the context when processing', async () => {
		const data = runWithLocale(
			createCallContext({ toolName: 't', project: { primary: 'pt-BR' } }),
			() => withJobLocale({ content: 'x' })
		);
		const seen = await runWithJobLocale(data, 'analyze-document', async () => {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return currentLocale();
		});
		expect(seen?.project?.primary).toBe('pt-BR');
		expect(seen?.toolName).toBe('analyze-document');
	});

	it('runs without context for jobs without __locale', () => {
		expect(withJobLocale({ content: 'x' })).toEqual({ content: 'x' });
		expect(runWithJobLocale({}, 't', () => currentLocale())).toBeUndefined();
		expect(runWithJobLocale(undefined, 't', () => currentLocale())).toBeUndefined();
	});
});
