// fonte: curadoria própria
import { currentLocale } from '../context.js';
import { resolveLanguage, type Language } from '../language.js';
import { assertForeignSpansPreserved } from './text/foreign-guard.js';

/**
 * Language directive for AI prompts (SPEC §6.11, D4, R3.10). In English the system prompt stays
 * byte for byte the upstream's; in pt-BR the directive goes at its end: answer in Brazilian
 * Portuguese, in the text's register, without translating speech, quotations or passages in
 * another language, keeping JSON keys in English.
 */
export const PT_BR_DIRECTIVE =
	'Responda em português do Brasil, no mesmo registro do texto, e não traduza falas, citações ' +
	'ou trechos em outro idioma: mantenha-os exatamente como estão, inclusive a pontuação. ' +
	'Quando a resposta for JSON, mantenha as chaves em inglês, como pedido, e escreva em português ' +
	'só os valores de texto livre; valores de uma lista fechada no esquema (como low, medium, high ' +
	'ou nomes de papéis) ficam exatamente como pedidos.';

/** Definições pt-BR dos tipos de `ENHANCEMENT_INSTRUCTIONS` (ai-content-enhancer.ts). */
export const IMPROVEMENT_DEFINITIONS_PT_BR: Readonly<Record<string, string>> = {
	grammar:
		'Corrija apenas gramática, ortografia e pontuação segundo a norma brasileira e o Acordo ' +
		'Ortográfico de 1990, inclusive crase e colocação pronominal. Não faça mudanças de estilo.',
	style:
		'Refine o estilo e a voz da prosa preservando sentido, personagens e diálogos, inclusive a ' +
		'pontuação de diálogo com travessão.',
	clarity: 'Deixe o texto mais claro e simplifique construções confusas sem perder o sentido.',
	expand: 'Amplie o trecho com detalhes ricos e coerentes, mantendo a voz.',
	summarize: 'Condense o trecho ao essencial, preservando sentido e tom.',
	creative:
		'Retrabalhe o trecho de forma criativa, reforçando imagens e impacto, preservando a intenção ' +
		'e a pontuação de diálogo com travessão.',
};

export function languageDirective(language: Language): string {
	return language === 'pt-BR' ? PT_BR_DIRECTIVE : '';
}

export function promptLanguage(text: string): Language {
	return resolveLanguage(authorText(text)).language;
}

// Marcadores de `untrustedBlock` (src/utils/prompt-input.ts), copiados: src/locale/pt-BR não
// importa o upstream (§4.3).
const BLOCK = /--- BEGIN UNTRUSTED INPUT[^\n]*---\n([\s\S]*?)\n--- END UNTRUSTED INPUT ---/gu;

/**
 * The author's text inside a prompt: the contents of its untrusted blocks, or the whole text when
 * it has none. Detecting on the English scaffolding around the passage made pt-BR prompts read as
 * `en` in projects without a saved language (revisão do estágio 3b).
 */
export function authorText(text: string): string {
	const blocks = [...text.matchAll(BLOCK)].map((m) => m[1]);
	return blocks.length ? blocks.join('\n\n') : text;
}

/**
 * The upstream system prompt plus the pt-BR directive (and, for `enhance_content`, the pt-BR
 * definition of the enhancement type). Returns `system` unchanged in English.
 */
export function withLanguageDirective(
	system: string,
	text: string,
	enhancementType?: string
): string {
	const directive = languageDirective(promptLanguage(text));
	if (!directive) return system;
	const definition = enhancementType ? IMPROVEMENT_DEFINITIONS_PT_BR[enhancementType] : undefined;
	return `${system}\n\n${directive}${definition ? `\nTipo de melhoria: ${definition}` : ''}`;
}

/**
 * D4 for `enhance_content`: in pt-BR, a rewrite that changed a passage in another language is
 * rejected whole (throws `ForeignSpanChangedError`). No-op in English.
 */
export function guardForeignSpans(original: string, rewritten: string): void {
	if (promptLanguage(original) !== 'pt-BR') return;
	assertForeignSpansPreserved(original, rewritten, {
		documentLanguage: 'pt-BR',
		embedded: currentLocale()?.project?.embedded,
		allowlist: currentLocale()?.project?.allowlist,
	});
}
