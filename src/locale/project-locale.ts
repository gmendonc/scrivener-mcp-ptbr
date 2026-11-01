import { getLogger } from '../core/logger.js';
import type { MemoryManager } from '../memory-manager.js';
import type { ScrivenerProject } from '../scrivener-project.js';
import type { ScrivenerDocument } from '../types/index.js';
import { detectLanguage, isLanguage, type Detection, type Language } from './language.js';

export interface ProjectLocale {
	primary: Language;
	documents?: Record<string, Language | 'other'>;
	embedded?: string[];
	allowlist?: string[];
}

export const PROJECT_LOCALE_KEY = 'locale';

type MemoryReader = Pick<MemoryManager, 'getCustomContext'>;
type MemoryWriter = Pick<MemoryManager, 'setCustomContext' | 'saveMemory'>;

const logger = getLogger('locale');
const warned = new WeakSet<object>();

function stringList(value: unknown, field: string): string[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value) || !value.every((v) => typeof v === 'string' && v.length > 0)) {
		throw new Error(`Invalid project locale: ${field} must be an array of non-empty strings`);
	}
	return [...value];
}

export function parseProjectLocale(value: unknown): ProjectLocale {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Invalid project locale: expected an object');
	}
	const raw = value as Record<string, unknown>;
	if (!isLanguage(raw.primary)) {
		throw new Error(
			`Invalid project locale: primary must be 'en' or 'pt-BR', got ${JSON.stringify(raw.primary)}`
		);
	}
	const locale: ProjectLocale = { primary: raw.primary };
	if (raw.documents !== undefined) {
		if (
			typeof raw.documents !== 'object' ||
			raw.documents === null ||
			Array.isArray(raw.documents)
		) {
			throw new Error('Invalid project locale: documents must be an object');
		}
		const documents: Record<string, Language | 'other'> = {};
		for (const [id, lang] of Object.entries(raw.documents)) {
			if (!isLanguage(lang) && lang !== 'other') {
				throw new Error(
					`Invalid project locale: documents.${id} must be 'en', 'pt-BR' or 'other'`
				);
			}
			documents[id] = lang;
		}
		locale.documents = documents;
	}
	const embedded = stringList(raw.embedded, 'embedded');
	if (embedded) locale.embedded = embedded;
	const allowlist = stringList(raw.allowlist, 'allowlist');
	if (allowlist) locale.allowlist = allowlist;
	return locale;
}

export function readProjectLocale(
	memory: MemoryReader | null | undefined
): ProjectLocale | undefined {
	const value = memory?.getCustomContext(PROJECT_LOCALE_KEY);
	if (value === undefined || !memory) return undefined;
	try {
		return parseProjectLocale(value);
	} catch (error) {
		// Memória corrompida não pode derrubar ferramentas; o projeto segue como sem idioma.
		if (!warned.has(memory)) {
			warned.add(memory);
			logger.warn('Ignoring invalid project locale', { error: (error as Error).message });
		}
		return undefined;
	}
}

export async function writeProjectLocale(
	memory: MemoryWriter,
	locale: ProjectLocale
): Promise<void> {
	memory.setCustomContext(PROJECT_LOCALE_KEY, locale);
	await memory.saveMemory();
}

export async function suggestProjectLanguage(sample: () => Promise<string>): Promise<Detection> {
	return detectLanguage(await sample());
}

/**
 * Linha de sugestão para o `open_project`, já com a separação do texto anterior; `''` quando
 * o projeto tem idioma gravado, quando a amostra não é pt-BR ou quando a leitura falha
 * (sugestão nunca pode impedir a abertura do projeto).
 */
export async function localeSuggestionText(
	memory: MemoryReader | null | undefined,
	sample: () => Promise<string>
): Promise<string> {
	let detection: Detection;
	try {
		if (memory?.getCustomContext(PROJECT_LOCALE_KEY) !== undefined) return '';
		detection = await suggestProjectLanguage(sample);
	} catch (error) {
		logger.warn('Could not suggest a project language', {
			error: (error as Error).message,
		});
		return '';
	}
	if (detection.language !== 'pt-BR') return '';
	return `\n\nDetected language: pt-BR (margin ${detection.margin.toFixed(2)}). Save it with set_project_language.`;
}

export const SAMPLE_MAX_WORDS = 2000;

type DraftReader = Pick<ScrivenerProject, 'getProjectStructure' | 'readDocument'>;

/** Os primeiros documentos de texto do Draft, em ordem do binder, até SAMPLE_MAX_WORDS. */
export async function draftSample(project: DraftReader): Promise<string> {
	const tree = await project.getProjectStructure();
	const draft = findDraft(tree);
	const parts: string[] = [];
	let words = 0;
	const walk = async (nodes: ScrivenerDocument[]): Promise<void> => {
		for (const node of nodes) {
			if (words >= SAMPLE_MAX_WORDS) return;
			if (node.type === 'Text') {
				const text = await project.readDocument(node.id).catch(() => '');
				const tokens = text.split(/\s+/u).filter(Boolean);
				parts.push(tokens.slice(0, SAMPLE_MAX_WORDS - words).join(' '));
				words += tokens.length;
			}
			if (node.children?.length) await walk(node.children);
		}
	};
	await walk(draft ? (draft.children ?? []) : tree);
	return parts.join('\n\n');
}

function findDraft(nodes: ScrivenerDocument[]): ScrivenerDocument | undefined {
	for (const node of nodes) {
		if ((node.type as string) === 'DraftFolder') return node;
		const found = node.children?.length ? findDraft(node.children) : undefined;
		if (found) return found;
	}
	return undefined;
}
