import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import Ajv from 'ajv';
import { ContentAnalyzer } from '../../../src/analysis/base-analyzer.js';
import {
	analysisHandlers,
	semanticSearchHandler,
} from '../../../src/handlers/analysis-handlers.js';
import { asyncHandlerDefinitions } from '../../../src/handlers/async-handler-definitions.js';
import { bluepencilHandlers } from '../../../src/handlers/bluepencil-handlers.js';
import { compilationHandlers } from '../../../src/handlers/compilation-handlers.js';
import { localSearchHandlers } from '../../../src/handlers/local-search-handlers.js';
import { manuscriptAnalysisHandlers } from '../../../src/handlers/manuscript-analysis-handlers.js';
import { narrativeLensHandlers } from '../../../src/handlers/narrative-lens-handlers.js';
import {
	closeProjectHandler,
	openProjectHandler,
} from '../../../src/handlers/project-handlers/lifecycle.js';
import { continuityHandlers, storyHandlers } from '../../../src/handlers/story-handlers.js';
import type { HandlerContext, HandlerResult, ToolDefinition } from '../../../src/handlers/types.js';
import { workflowHandlers } from '../../../src/handlers/workflow-handlers.js';
import { setProjectLanguageHandler } from '../../../src/locale/set-project-language.js';
import { LOCALE_TOOLS } from '../../../src/locale/tool-policies.js';
import { withLocale } from '../../../src/locale/with-locale.js';
import { NarrativeAnalysis } from '../../../src/services/editorial/narrative-analysis.js';
import { PT_BR_COVERAGE } from '../../../src/locale/pt-BR/coverage.js';
import * as nativeLens from 'narrative-lens';
import * as nativeBluepencil from 'bluepencil-node';
import * as nativeTextMetrics from '../../../src/utils/text-metrics.js';

// Cada função nativa vira um jest.fn que chama a real, para saber se o gate a deixou rodar.
function mockPassthrough(actual: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(actual).map(([k, v]) =>
			typeof v === 'function'
				? [k, jest.fn((...a: unknown[]) => (v as (...x: unknown[]) => unknown)(...a))]
				: [k, v]
		)
	);
}
jest.mock('narrative-lens', () => mockPassthrough(jest.requireActual('narrative-lens')));
jest.mock('bluepencil-node', () => mockPassthrough(jest.requireActual('bluepencil-node')));
jest.mock('../../../src/utils/text-metrics.js', () =>
	mockPassthrough(jest.requireActual('../../../src/utils/text-metrics.js'))
);

const NATIVE_MODULES: Record<string, Record<string, unknown>> = {
	'narrative-lens': nativeLens as unknown as Record<string, unknown>,
	bluepencil: nativeBluepencil as unknown as Record<string, unknown>,
	'text-metrics': nativeTextMetrics as unknown as Record<string, unknown>,
};

/** As funções nativas que o gate precisa barrar em pt-BR. */
function refusedNatives(): Map<string, jest.Mock> {
	const spies = new Map<string, jest.Mock>();
	for (const [feature, coverage] of Object.entries(PT_BR_COVERAGE)) {
		if (coverage.state !== 'unavailable') continue;
		const [module, name] = feature.split('.');
		const fn = NATIVE_MODULES[module]?.[name];
		if (jest.isMockFunction(fn)) spies.set(feature, fn);
	}
	return spies;
}

const ROOT = join(__dirname, '..', '..', '..');
const PT_FIXTURE = join(ROOT, 'tests', 'fixtures', 'pt-BR', 'sample-project-pt.scriv');
const EN_FIXTURE = join(ROOT, 'tests', 'sample-project.scriv');

const ORIGINALS = new Map<string, ToolDefinition>(
	[
		...analysisHandlers,
		semanticSearchHandler,
		...asyncHandlerDefinitions,
		...bluepencilHandlers,
		...compilationHandlers,
		...localSearchHandlers,
		...manuscriptAnalysisHandlers,
		...narrativeLensHandlers,
		...storyHandlers,
		...continuityHandlers,
		...workflowHandlers,
	].map((tool) => [tool.name, tool as ToolDefinition])
);

// Argumentos mínimos por ferramenta; `doc` é um documento de texto do fixture aberto.
function minimalArgs(name: string, doc: string, text: string): Record<string, unknown> | null {
	const args: Record<string, Record<string, unknown> | null> = {
		semantic_search: { query: 'medo' },
		search_passages: { query: 'medo' },
		analyze_document: { documentId: doc },
		enhance_content: { documentId: doc, enhancementType: 'grammar' },
		generate_content: { prompt: 'Continue a cena.' },
		check_consistency: {},
		analyze_craft_local: { documentId: doc },
		check_continuity_local: {},
		analyze_foreshadowing_local: {},
		measure_voice_drift_local: { characterName: 'Ana' },
		analyze_opening_local: {},
		analyze_manuscript_local: { action: 'analyze' },
		analyze_narrative_annotations: {
			kind: 'causality',
			input: { nodes: [], interventions: [] },
		},
		check_style_local: { documentId: doc },
		find_repetition_local: { documentId: doc },
		analyze_rhythm_local: { documentId: doc },
		analyze_dialogue_tags_local: { documentId: doc },
		manuscript_style_report_local: {},
		continuity_findings: { action: 'list' },
		compile_documents: {},
		queue_document_analysis: { documentId: doc, content: text },
		// Exige um projectId de fila e documentos com conteúdo: coberto pelos testes da fila.
		queue_project_analysis: null,
		// Sem provedor de IA (SCRIVENER_LOCAL_ONLY) estas duas falham nos dois idiomas, antes de
		// qualquer fachada; a cobertura delas é a do provedor (fase 3, R3.10).
		suggest_improvements: null,
		analyze_writing_style: null,
		check_plot_consistency: { documents: [{ id: doc }] },
		editorial_workflow: { action: 'list' },
	};
	// Ferramenta nova em LOCALE_TOOLS sem entrada aqui falha, em vez de ser pulada em silêncio.
	if (!(name in args)) throw new Error(`gate.test: no minimal args for ${name}`);
	return args[name];
}

interface Opened {
	path: string;
	context: HandlerContext;
	doc: string;
	text: string;
}

async function openCopy(workdir: string, fixture: string): Promise<Opened> {
	const path = join(workdir, `${Math.random().toString(36).slice(2)}-${basename(fixture)}`);
	await cp(fixture, path, { recursive: true });
	const context: HandlerContext = {
		project: null,
		memoryManager: null,
		contentAnalyzer: new ContentAnalyzer(),
	};
	await openProjectHandler.handler({ path }, context);
	const documents = await context.project!.getProjectStructure();
	const flat = (nodes: typeof documents): typeof documents =>
		nodes.flatMap((n) => [n, ...flat(n.children ?? [])]);
	// Um documento do manuscrito: algumas ferramentas recusam documentos fora do Draft.
	const draft = documents.find((d) => (d.type as string) === 'DraftFolder');
	const doc = flat(draft?.children ?? documents).find((d) => d.type === 'Text')!.id;
	return { path, context, doc, text: await context.project!.readDocument(doc) };
}

function locale(result: HandlerResult): Record<string, unknown> | undefined {
	return (result.structuredContent as { locale?: Record<string, unknown> } | undefined)?.locale;
}

const ajv = new Ajv({ strict: false, allErrors: true });

describe('pt-BR gate (R2.3–R2.6)', () => {
	let workdir: string;
	const env = { ...process.env };

	beforeAll(async () => {
		workdir = await mkdtemp(join(tmpdir(), 'locale-gate-'));
		process.env.SCRIVENER_LOCAL_ONLY = 'true';
		process.env.SCRIVENER_DISABLE_KEY_DISCOVERY = '1';
		process.env.SCRIVENER_DATA_DIR = join(workdir, 'state');
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.OPENAI_API_KEY;
		delete process.env.SCRIVENER_MCP_LANGUAGE;
	});
	afterAll(async () => {
		process.env = { ...env };
		await rm(workdir, { recursive: true, force: true });
	});

	it('every LOCALE_TOOLS name has an original definition here', () => {
		expect(Object.keys(LOCALE_TOOLS).filter((name) => !ORIGINALS.has(name))).toEqual([]);
	});

	it('answers unavailable or only language-neutral results in a pt-BR project (R2.3)', async () => {
		const opened = await openCopy(workdir, PT_FIXTURE);
		try {
			await setProjectLanguageHandler.handler({ primary: 'pt-BR' }, opened.context);
			const spies = refusedNatives();
			expect(spies.size).toBeGreaterThan(20);
			for (const [name, original] of ORIGINALS) {
				if (!LOCALE_TOOLS[name]) continue;
				const args = minimalArgs(name, opened.doc, opened.text);
				if (!args) continue;
				const tool = withLocale(original);
				for (const spy of spies.values()) spy.mockClear();
				const result = await tool.handler(args, opened.context);
				// Nenhuma métrica inglesa sobre texto português: nativas não neutras nunca rodam.
				const ran = [...spies].filter(([, spy]) => spy.mock.calls.length).map(([f]) => f);
				expect({ name, ran }).toEqual({ name, ran: [] });
				const block = locale(result);
				const summary = {
					name,
					isError: Boolean(result.isError),
					available: block?.available,
				};
				// generate_content e enhance_content respondem isError sem provedor, nos dois idiomas.
				if (!['generate_content', 'enhance_content'].includes(name))
					expect(summary).toEqual({ ...summary, isError: false });
				if (tool.outputSchema && result.structuredContent) {
					const validate = ajv.compile(tool.outputSchema);
					expect({
						name,
						valid: validate(result.structuredContent),
						errors: validate.errors,
					}).toMatchObject({ name, valid: true });
					expect({ name, language: block?.language }).toEqual({
						name,
						language: 'pt-BR',
					});
				}
				if (block?.available === false) {
					expect({ name, reason: block.reason, alternative: block.alternative }).toEqual({
						name,
						reason: expect.any(String),
						alternative: expect.any(String),
					});
				}
			}
		} finally {
			await closeProjectHandler.handler({}, opened.context);
		}
	}, 180_000);

	it('blocks only the child-process paths (R2.4)', async () => {
		const opened = await openCopy(workdir, PT_FIXTURE);
		const serialized = jest.spyOn(NarrativeAnalysis.prototype, 'serializedAnalysis');
		try {
			await setProjectLanguageHandler.handler({ primary: 'pt-BR' }, opened.context);
			const run = (name: string, args: Record<string, unknown>) =>
				withLocale(ORIGINALS.get(name)!).handler(args, opened.context);

			expect(
				locale(await run('analyze_manuscript_local', { action: 'analyze' }))
			).toMatchObject({
				available: false,
				reason: 'child-process',
			});
			expect(serialized).not.toHaveBeenCalled();
			expect(
				locale(await run('analyze_manuscript_local', { action: 'capabilities' }))
			).not.toHaveProperty('available');
			expect(
				locale(
					await run('analyze_craft_local', {
						documentId: opened.doc,
						policy: 'configured',
					})
				)
			).toMatchObject({ available: false, reason: 'child-process' });
			// Sem policy, passa pela fachada: em pt-BR a fachada recusa, não o processo filho.
			expect(
				locale(await run('analyze_craft_local', { documentId: opened.doc }))
			).toMatchObject({
				available: false,
				reason: 'not-implemented',
			});
			expect(locale(await run('editorial_workflow', { action: 'list' }))).not.toHaveProperty(
				'available'
			);
			expect(locale(await run('editorial_workflow', { action: 'start' }))).toMatchObject({
				available: false,
				reason: 'child-process',
			});
		} finally {
			serialized.mockRestore();
			await closeProjectHandler.handler({}, opened.context);
		}
	}, 120_000);

	it('keeps every upstream field in English (R2.5)', async () => {
		const opened = await openCopy(workdir, EN_FIXTURE);
		try {
			for (const [name, original] of ORIGINALS) {
				if (!LOCALE_TOOLS[name]) continue;
				const args = minimalArgs(name, opened.doc, opened.text);
				if (!args) continue;
				// Aquecimento: a primeira chamada indexa ou grava estado; a comparação é entre as
				// chamadas seguintes, original e envolta.
				await original.handler(args, opened.context);
				const plain = normalize(await original.handler(args, opened.context));
				const wrapped = await withLocale(original).handler(args, opened.context);
				const block = locale(wrapped);
				if (wrapped.structuredContent)
					expect({ name, language: block?.language }).toEqual({ name, language: 'en' });
				const { locale: _ignored, ...rest } = (wrapped.structuredContent ?? {}) as Record<
					string,
					unknown
				>;
				expect({
					name,
					result: normalize({
						...wrapped,
						structuredContent: wrapped.structuredContent ? rest : undefined,
					}),
				}).toEqual({ name, result: plain });
			}
		} finally {
			await closeProjectHandler.handler({}, opened.context);
		}
	}, 180_000);

	it('detects pt-BR when the project has no saved language (R2.6)', async () => {
		const opened = await openCopy(workdir, PT_FIXTURE);
		try {
			const result = await withLocale(ORIGINALS.get('check_style_local')!).handler(
				{ documentId: opened.doc },
				opened.context
			);
			expect(locale(result)).toMatchObject({
				available: false,
				language: 'pt-BR',
				languageSource: 'detected',
			});
		} finally {
			await closeProjectHandler.handler({}, opened.context);
		}
	}, 60_000);
});

// Campos que mudam entre duas chamadas idênticas (relógio, ids aleatórios), não por idioma.
const VOLATILE =
	/^(generatedAt|createdAt|updatedAt|timestamp|jobId|requestId|reportId|analyzedAt|durationMs|elapsedMs|_ref|_file)$/;

function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value))
			out[k] = VOLATILE.test(k) ? '<volatile>' : normalize(v);
		return out;
	}
	if (typeof value === 'string' && /^[[{]/.test(value)) {
		try {
			return normalize(JSON.parse(value));
		} catch {
			// texto comum que começa com chave
		}
	}
	if (typeof value === 'string')
		return (
			value
				.replace(/\b[0-9a-f]{64}-[0-9a-f-]{36}\b/g, '<job>')
				// ids aleatórios do spool e da fila (os ids do Binder são maiúsculos)
				.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
				.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<time>')
		);
	return value;
}
