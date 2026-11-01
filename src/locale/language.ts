import { currentLocale, recordResolution } from './context.js';
import type { ProjectLocale } from './project-locale.js';
import { FUNCTION_WORDS, type FunctionWordLanguage } from './pt-BR/data/function-words.js';

export type Language = 'en' | 'pt-BR';
export type RequestedLanguage = Language | 'auto';
export type DetectedLanguage = Language | 'es' | 'fr' | 'it' | 'de' | 'undetermined';
export type LanguageSource = 'argument' | 'project' | 'env' | 'detected' | 'default';

export interface Detection {
	language: DetectedLanguage;
	margin: number;
	tokens: number;
	scores: Readonly<Record<Exclude<DetectedLanguage, 'undetermined'>, number>>;
}

export interface Resolution {
	language: Language;
	source: LanguageSource;
	detection?: Detection;
}

export const ENV_VAR = 'SCRIVENER_MCP_LANGUAGE';
// Valores iniciais; a calibração contra o corpus é a R3.9.
export const DETECTION_MIN_TOKENS = 5;
export const DETECTION_MIN_MARGIN = 0.05;

const DETECTABLE: readonly FunctionWordLanguage[] = ['pt-BR', 'en', 'es', 'fr', 'it', 'de'];
const WORD = /\p{L}+(?:['’-]\p{L}+)*/gu;

export function isLanguage(value: unknown): value is Language {
	return value === 'en' || value === 'pt-BR';
}

/** Reduz uma etiqueta BCP-47 ao idioma detectável; pt-PT conta como pt-BR (SPEC §3). */
function normalizeTag(tag: string): DetectedLanguage | undefined {
	const primary = tag.toLowerCase().split(/[-_]/u)[0];
	if (primary === 'pt') return 'pt-BR';
	return (DETECTABLE as readonly string[]).includes(primary)
		? (primary as DetectedLanguage)
		: undefined;
}

export function detectLanguage(
	text: string,
	options: { candidates?: readonly DetectedLanguage[]; embedded?: readonly string[] } = {}
): Detection {
	const words = (text.match(WORD) ?? []).map((w) => w.toLowerCase());
	const tokens = words.length;
	const scores = Object.fromEntries(DETECTABLE.map((lang) => [lang, 0])) as Record<
		FunctionWordLanguage,
		number
	>;
	const candidates = DETECTABLE.filter((lang) => options.candidates?.includes(lang) ?? true);
	if (tokens > 0) {
		for (const lang of candidates) {
			const set = FUNCTION_WORDS[lang];
			scores[lang] = words.filter((w) => set.has(w)).length / tokens;
		}
	}
	const ranked = [...candidates].sort((a, b) => scores[b] - scores[a]);
	const [first, second] = ranked;
	const margin = first ? scores[first] - (second ? scores[second] : 0) : 0;
	const undetermined: Detection = { language: 'undetermined', margin, tokens, scores };
	if (!first || tokens < DETECTION_MIN_TOKENS || scores[first] === 0) return undetermined;
	if (margin >= DETECTION_MIN_MARGIN) return { language: first, margin, tokens, scores };

	// Empate: só um idioma declarado como embutido desempata.
	const embedded = new Set((options.embedded ?? []).map(normalizeTag));
	const tied = ranked.filter((lang) => scores[first] - scores[lang] < DETECTION_MIN_MARGIN);
	const declared = tied.filter((lang) => embedded.has(lang));
	return declared.length === 1 ? { language: declared[0], margin, tokens, scores } : undetermined;
}

/**
 * Passos 1 a 3 da precedência (SPEC §6.1): argumento, projeto, variável de ambiente.
 * `undefined` quando nenhum se aplica ou quando o pedido é `auto`.
 */
export function configuredResolution(
	call:
		{ requested?: RequestedLanguage; project?: ProjectLocale; documentId?: string } | undefined,
	hint?: RequestedLanguage
): Resolution | undefined {
	const requested = hint ?? call?.requested;
	if (isLanguage(requested)) return { language: requested, source: 'argument' };
	if (requested === 'auto') return undefined;
	const project = call?.project;
	if (project) {
		const forDocument = call?.documentId ? project.documents?.[call.documentId] : undefined;
		return {
			language: isLanguage(forDocument) ? forDocument : project.primary,
			source: 'project',
		};
	}
	const env = process.env[ENV_VAR];
	if (isLanguage(env)) return { language: env, source: 'env' };
	return undefined;
}

export function resolveLanguage(text: string, hint?: RequestedLanguage): Resolution {
	const ctx = currentLocale();
	const resolution = configuredResolution(ctx, hint) ?? detectedResolution(text, ctx?.project);
	recordResolution(resolution);
	return resolution;
}

/**
 * Para funções sem texto (metadados, parse, números já derivados): só os passos 1 a 3.
 * O padrão `en` não é registrado, para não transformar em `mixed` uma chamada pt-BR detectada.
 */
export function resolveContextLanguage(): Resolution {
	const resolution = configuredResolution(currentLocale());
	if (!resolution) return { language: 'en', source: 'default' };
	recordResolution(resolution);
	return resolution;
}

function detectedResolution(text: string, project: ProjectLocale | undefined): Resolution {
	const detection = detectLanguage(text, { embedded: project?.embedded });
	return isLanguage(detection.language)
		? { language: detection.language, source: 'detected', detection }
		: { language: 'en', source: 'default' };
}
