import type { HandlerContext } from '../handlers/types.js';
import { draftSample } from './project-locale.js';

export interface LocaleToolPolicy {
	/** 'facade': o handler roda e as fachadas decidem por texto.
	 *  'child-process': antes do handler, o invólucro decide se a chamada chega ao processo
	 *  filho do narrative-lens; em pt-BR, responde indisponível sem chamar o handler. */
	mode: 'facade' | 'child-process';
	/** Para 'child-process': true quando estes argumentos chegam ao processo filho. */
	reachesChildProcess?: (args: Record<string, unknown>) => boolean;
	/** Texto usado para decidir o idioma quando não há argumento, projeto nem env. */
	sample?: (args: Record<string, unknown>, context: HandlerContext) => Promise<string>;
	alternative?: string;
}

/** O documento pedido, se houver; senão o começo do Draft. */
async function projectSample(
	args: Record<string, unknown>,
	context: HandlerContext
): Promise<string> {
	const project = context.project;
	if (!project) return '';
	if (typeof args.documentId === 'string') {
		return project.readDocument(args.documentId).catch(() => draftSample(project));
	}
	return draftSample(project);
}

function actionIn(...actions: string[]) {
	return (args: Record<string, unknown>, fallback?: string) =>
		actions.includes(String(args.action ?? fallback));
}

const reachesManuscriptChild = actionIn(
	'analyze',
	'configure',
	'accept_finding',
	'dismiss_finding',
	'recheck_finding'
);
const reachesWorkflowChild = actionIn('start', 'resume');

const FACADE: LocaleToolPolicy = { mode: 'facade' };

export const LOCALE_TOOLS: Readonly<Record<string, LocaleToolPolicy>> = {
	analyze_manuscript_local: {
		mode: 'child-process',
		// O handler trata a ação ausente como 'analyze'.
		reachesChildProcess: (args) => reachesManuscriptChild(args, 'analyze'),
		sample: projectSample,
		alternative: 'check_style_local',
	},
	analyze_narrative_annotations: {
		mode: 'child-process',
		reachesChildProcess: () => true,
		sample: projectSample,
		alternative: 'analyze_document',
	},
	analyze_craft_local: {
		mode: 'child-process',
		reachesChildProcess: (args) => args.policy === 'configured',
		sample: projectSample,
		alternative: 'analyze_craft_local without policy',
	},
	editorial_workflow: {
		mode: 'child-process',
		reachesChildProcess: (args) => reachesWorkflowChild(args),
		sample: projectSample,
		alternative: 'check_style_local',
	},
	analyze_dialogue_tags_local: FACADE,
	analyze_document: FACADE,
	analyze_foreshadowing_local: FACADE,
	analyze_opening_local: FACADE,
	analyze_rhythm_local: FACADE,
	analyze_writing_style: FACADE,
	check_consistency: FACADE,
	check_continuity_local: FACADE,
	check_plot_consistency: FACADE,
	check_style_local: FACADE,
	continuity_findings: FACADE,
	enhance_content: FACADE,
	find_repetition_local: FACADE,
	generate_content: FACADE,
	manuscript_style_report_local: FACADE,
	measure_voice_drift_local: FACADE,
	search_passages: FACADE,
	semantic_search: FACADE,
	suggest_improvements: FACADE,
	compile_documents: FACADE,
	queue_document_analysis: FACADE,
	queue_project_analysis: FACADE,
};
