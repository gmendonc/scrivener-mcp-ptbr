import type {
	HandlerContext,
	HandlerResult,
	ToolDefinition,
	ToolSchema,
} from '../handlers/types.js';
import type { JSONValue } from '../types/index.js';
import {
	createCallContext,
	recordResolution,
	runWithLocale,
	summarize,
	type LocaleCallContext,
} from './context.js';
import {
	ForeignSpanChangedError,
	LanguageUnsupportedError,
	type ChangedForeignSpan,
} from './errors.js';
import {
	configuredResolution,
	detectLanguage,
	isLanguage,
	type RequestedLanguage,
	type Resolution,
} from './language.js';
import { readProjectLocale } from './project-locale.js';
import { LOCALE_TOOLS, type LocaleToolPolicy } from './tool-policies.js';

export const LANGUAGE_INPUT_PROPERTY: JSONValue = {
	type: 'string',
	enum: ['en', 'pt-BR', 'auto'],
	description:
		"Language of the analyzed text. Omit to use the project's saved language, then the " +
		"SCRIVENER_MCP_LANGUAGE environment variable, then detection; 'auto' forces detection.",
};

const SPAN_SCHEMA: JSONValue = {
	type: 'object',
	description: 'A span left out of language-dependent analysis.',
	properties: {
		documentId: { type: 'string', description: 'Document the span belongs to, when known.' },
		start: { type: 'number', description: 'UTF-16 start offset in the analyzed text.' },
		end: { type: 'number', description: 'UTF-16 end offset (exclusive).' },
		language: { type: 'string', description: 'Language detected for the span.' },
		reason: {
			type: 'string',
			enum: ['foreign-language', 'undetermined', 'document-other'],
			description: 'Why the span was excluded.',
		},
	},
};

const CHANGED_SPAN_SCHEMA: JSONValue = {
	type: 'object',
	description: 'A span in another language that the rewrite altered.',
	properties: {
		start: { type: 'number', description: 'UTF-16 start offset in the original text.' },
		end: { type: 'number', description: 'UTF-16 end offset (exclusive) in the original.' },
		before: { type: 'string', description: 'Original span text.' },
		after: { type: 'string', description: 'Text the rewrite put in its place.' },
		languageBefore: { type: 'string', description: 'Language of the original span.' },
		languageAfter: { type: 'string', description: 'Language of the rewritten span.' },
	},
};

export const LOCALE_OUTPUT_PROPERTIES: Record<string, JSONValue> = {
	language: {
		type: 'string',
		enum: ['en', 'pt-BR', 'mixed'],
		description: "Language the analysis ran in; 'mixed' when texts resolved differently.",
	},
	languageSource: {
		type: 'string',
		enum: ['argument', 'project', 'env', 'detected', 'default'],
		description: 'Where the language came from.',
	},
	coverage: {
		type: 'number',
		minimum: 0,
		maximum: 1,
		description: 'Share of the received characters that language-dependent analysis used.',
	},
	excludedSpans: {
		type: 'array',
		description: 'Spans left out of the analysis (at most 200; coverage counts all).',
		items: SPAN_SCHEMA,
	},
	available: {
		type: 'boolean',
		description: 'false when the analysis is not available for the language.',
	},
	reason: {
		type: 'string',
		enum: [
			'not-implemented',
			'data-missing',
			'child-process',
			'sidecar-missing',
			'foreign-span-changed',
		],
		description: 'Why the analysis is unavailable.',
	},
	alternative: {
		type: 'string',
		description: 'Tool or command to use instead.',
	},
	unavailableMetrics: {
		type: 'array',
		description: 'Metrics returned as 0 because no validated formula exists for the language.',
		items: { type: 'string' },
	},
	changedSpans: {
		type: 'array',
		description: 'Spans in another language that a rewrite changed.',
		items: CHANGED_SPAN_SCHEMA,
	},
};

const LOCALE_SUMMARY_FIELDS = ['language', 'languageSource', 'coverage', 'excludedSpans'];

/**
 * Os campos de locale ficam agrupados numa chave só (decisão do autor, 2026-11-01): campos
 * soltos no topo já colidiam com `coverage` de cinco ferramentas do upstream.
 */
export const LOCALE_OUTPUT_KEY = 'locale';

export const LOCALE_OUTPUT_PROPERTY: JSONValue = {
	type: 'object',
	description:
		'Language of this result: resolved language, its source, analysis coverage and, when the analysis is unavailable for the language, why.',
	properties: LOCALE_OUTPUT_PROPERTIES,
	required: LOCALE_SUMMARY_FIELDS,
};

const COMBINATORS = ['anyOf', 'oneOf', 'allOf'] as const;

const DESCRIPTION_SUFFIX =
	' Supports Brazilian Portuguese (pt-BR) via the optional language argument; unsupported analyses answer locale.available: false.';

const wrapped = new WeakMap<ToolDefinition, ToolDefinition>();
const wrappers = new WeakSet<ToolDefinition>();

export function withLocale(tool: ToolDefinition): ToolDefinition {
	const policy = LOCALE_TOOLS[tool.name];
	if (!policy || wrappers.has(tool)) return tool;
	let result = wrapped.get(tool);
	if (!result) {
		result = {
			...tool,
			description: tool.description + DESCRIPTION_SUFFIX,
			inputSchema: {
				...tool.inputSchema,
				properties: { ...tool.inputSchema.properties, language: LANGUAGE_INPUT_PROPERTY },
			},
			...(tool.outputSchema
				? { outputSchema: augmentOutputSchema(tool.name, tool.outputSchema) }
				: {}),
			handler: localeHandler(tool, policy),
		};
		wrapped.set(tool, result);
		wrappers.add(result);
	}
	return result;
}

/** Acrescenta a chave de locale onde o schema enumera propriedades, inclusive em ramos fechados. */
function withLocaleProperty(
	toolName: string,
	schema: Record<string, unknown>
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...schema };
	const properties = schema.properties as Record<string, unknown> | undefined;
	if (properties && LOCALE_OUTPUT_KEY in properties) {
		// Um merge do upstream que crie esse campo precisa falhar alto, não ser sobrescrito.
		throw new Error(
			`${toolName}: output property "${LOCALE_OUTPUT_KEY}" collides with the pt-BR fork`
		);
	}
	if (properties || schema.additionalProperties === false) {
		next.properties = { ...properties, [LOCALE_OUTPUT_KEY]: LOCALE_OUTPUT_PROPERTY };
	}
	for (const keyword of COMBINATORS) {
		const variants = schema[keyword];
		if (Array.isArray(variants)) {
			next[keyword] = variants.map((v) =>
				v && typeof v === 'object'
					? withLocaleProperty(toolName, v as Record<string, unknown>)
					: v
			);
		}
	}
	return next;
}

function augmentOutputSchema(toolName: string, schema: ToolSchema): ToolSchema {
	const augmented = withLocaleProperty(toolName, schema as unknown as Record<string, unknown>);
	// As restrições originais valem para a resposta normal; a indisponível tem só a chave de locale.
	const normal: Record<string, unknown> = { description: 'Result in the resolved language.' };
	for (const keyword of ['required', ...COMBINATORS] as const) {
		if (augmented[keyword] !== undefined) {
			normal[keyword] = augmented[keyword];
			delete augmented[keyword];
		}
	}
	const unavailable = {
		description: 'Analysis not available for the resolved language.',
		properties: {
			[LOCALE_OUTPUT_KEY]: {
				description: 'Locale block of an unavailable answer.',
				required: ['available', 'reason', 'language'],
			},
		},
	};
	return {
		...(augmented as unknown as ToolSchema),
		properties: {
			...(schema.properties ?? {}),
			[LOCALE_OUTPUT_KEY]: LOCALE_OUTPUT_PROPERTY,
		},
		required: [LOCALE_OUTPUT_KEY],
		anyOf: [normal as JSONValue, unavailable],
	};
}

function requestedLanguage(value: unknown): RequestedLanguage | undefined {
	return isLanguage(value) || value === 'auto' ? value : undefined;
}

function localeHandler(tool: ToolDefinition, policy: LocaleToolPolicy): ToolDefinition['handler'] {
	const hasOutputSchema = Boolean(tool.outputSchema);
	return async (args, context, options) => {
		const { language, ...rest } = args;
		const ctx = createCallContext({
			toolName: tool.name,
			requested: requestedLanguage(language),
			documentId: typeof rest.documentId === 'string' ? rest.documentId : undefined,
			project: readProjectLocale(context.memoryManager),
		});
		return runWithLocale(ctx, async () => {
			if (policy.mode === 'child-process' && policy.reachesChildProcess?.(rest)) {
				const resolution = await childProcessLanguage(ctx, policy, rest, context);
				if (resolution.language !== 'en') {
					recordResolution(resolution);
					return unavailable(ctx, hasOutputSchema, {
						feature: `tool:${tool.name}`,
						reason: 'child-process',
						alternative: policy.alternative,
					});
				}
			}
			let result: HandlerResult;
			try {
				result = await tool.handler(rest, context, options);
			} catch (error) {
				const changed =
					error instanceof ForeignSpanChangedError ? error : ctx.foreignChange;
				if (changed) {
					return unavailable(ctx, hasOutputSchema, {
						feature: tool.name,
						reason: 'foreign-span-changed',
						changedSpans: changed.changed,
					});
				}
				const refused = refusalBehind(error, ctx);
				if (refused) return unavailableFrom(ctx, hasOutputSchema, refused);
				throw error;
			}
			// Resultado com isError sai como veio: o erro pode não ter relação com o gate (provedor
			// ausente); recusas engolidas aparecem em unavailableMetrics.
			return decorate(result, ctx, hasOutputSchema);
		});
	};
}

/**
 * The gate refusal behind a thrown error: the error itself, or an upstream wrapper of it
 * (`handleError` builds a new AppError that keeps the original message). An unrelated error
 * thrown after a swallowed refusal is not one.
 */
function refusalBehind(
	error: unknown,
	ctx: LocaleCallContext
): LanguageUnsupportedError | undefined {
	if (error instanceof LanguageUnsupportedError) return error;
	const message = error instanceof Error ? error.message : String(error);
	return ctx.unsupported.find((refusal) => message.includes(refusal.message));
}

async function childProcessLanguage(
	ctx: LocaleCallContext,
	policy: LocaleToolPolicy,
	args: Record<string, unknown>,
	context: HandlerContext
): Promise<Resolution> {
	const configured = configuredResolution(ctx);
	if (configured) return configured;
	const sample = policy.sample ? await policy.sample(args, context).catch(() => '') : '';
	const detection = detectLanguage(sample, { embedded: ctx.project?.embedded });
	return isLanguage(detection.language)
		? { language: detection.language, source: 'detected', detection }
		: { language: 'en', source: 'default' };
}

function unavailableFrom(
	ctx: LocaleCallContext,
	hasOutputSchema: boolean,
	error: LanguageUnsupportedError
): HandlerResult {
	return unavailable(ctx, hasOutputSchema, {
		feature: error.feature,
		reason: error.reason,
		alternative: error.alternative,
	});
}

function unavailable(
	ctx: LocaleCallContext,
	hasOutputSchema: boolean,
	info: {
		feature: string;
		reason: string;
		alternative?: string;
		changedSpans?: ChangedForeignSpan[];
	}
): HandlerResult {
	const summary = summarize(ctx);
	const languageName = summary.language === 'pt-BR' ? 'Brazilian Portuguese' : summary.language;
	const text = `pt-BR: ${info.feature} is not available for ${languageName} yet (${info.reason}).${
		info.alternative ? ` Try ${info.alternative}.` : ''
	}`;
	const result: HandlerResult = { isError: false, content: [{ type: 'text', text }] };
	if (hasOutputSchema) {
		result.structuredContent = {
			[LOCALE_OUTPUT_KEY]: {
				available: false,
				reason: info.reason,
				...(info.alternative ? { alternative: info.alternative } : {}),
				...(info.changedSpans ? { changedSpans: info.changedSpans } : {}),
				...summary,
				coverage: 0,
			},
		};
	}
	return result;
}

function decorate(
	result: HandlerResult,
	ctx: LocaleCallContext,
	hasOutputSchema: boolean
): HandlerResult {
	// Resultados com isError também passam: o SDK valida o structuredContent deles contra o
	// outputSchema, que exige a chave de locale.
	const summary = summarize(ctx);
	const unavailableMetrics = [...ctx.unavailableMetrics];
	let decorated = result;
	if (hasOutputSchema && result.structuredContent) {
		decorated = {
			...decorated,
			structuredContent: {
				...result.structuredContent,
				[LOCALE_OUTPUT_KEY]: {
					...summary,
					...(unavailableMetrics.length ? { unavailableMetrics } : {}),
				},
			},
		};
	}
	// Em inglês o texto fica byte a byte igual ao do upstream (D15).
	if (summary.language !== 'en') {
		const note =
			`pt-BR: language ${summary.language} (${summary.languageSource}), coverage ` +
			`${Math.round(summary.coverage * 100)}%${
				unavailableMetrics.length
					? `; unavailable metrics: ${unavailableMetrics.join(', ')}`
					: ''
			}.`;
		decorated = { ...decorated, content: appendToLastText(decorated.content, note) };
	}
	return decorated;
}

function appendToLastText(
	content: HandlerResult['content'],
	note: string
): HandlerResult['content'] {
	const index = content.map((c) => c.type === 'text').lastIndexOf(true);
	if (index === -1) return [...content, { type: 'text', text: note }];
	return content.map((c, i) => (i === index ? { ...c, text: `${c.text ?? ''}\n\n${note}` } : c));
}
