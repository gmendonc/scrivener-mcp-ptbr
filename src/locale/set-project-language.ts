import {
	HandlerError,
	requireMemoryManager,
	requireProject,
	type HandlerContext,
	type HandlerResult,
	type ToolDefinition,
} from '../handlers/types.js';
import type { JSONValue } from '../types/index.js';
import {
	parseProjectLocale,
	PROJECT_LOCALE_KEY,
	readProjectLocale,
	writeProjectLocale,
	type ProjectLocale,
} from './project-locale.js';

const LOCALE_SCHEMA: JSONValue = {
	type: ['object', 'null'],
	description: 'Language settings saved in the project memory; null when cleared.',
	properties: {
		primary: { type: 'string', description: 'Main language of the project.' },
		documents: {
			type: 'object',
			description: 'Per-document language overrides keyed by document id.',
			additionalProperties: { type: 'string', description: "'en', 'pt-BR' or 'other'." },
		},
		embedded: {
			type: 'array',
			description: 'BCP-47 languages that appear on purpose inside the text.',
			items: { type: 'string' },
		},
		allowlist: {
			type: 'array',
			description: 'Intentional foreign words that never count as another language.',
			items: { type: 'string' },
		},
	},
};

export const setProjectLanguageHandler: ToolDefinition = {
	name: 'set_project_language',
	title: 'Set Project Language',
	description:
		'Save the language of the open project (en or pt-BR) in its project memory, so analysis ' +
		'tools resolve it without detection. Optionally set per-document overrides, languages ' +
		'embedded on purpose (for example English dialogue), and intentional foreign words. ' +
		'Pass clear: true to remove the saved setting. Requires an open project.',
	annotations: {
		readOnlyHint: false,
		destructiveHint: false,
		idempotentHint: true,
		openWorldHint: false,
	},
	inputSchema: {
		type: 'object',
		properties: {
			primary: {
				type: 'string',
				enum: ['en', 'pt-BR'],
				description: 'Main language of the project. Required unless clear is true.',
			},
			documents: {
				type: 'object',
				description:
					"Per-document overrides: document id → 'en', 'pt-BR' or 'other' (excluded).",
				additionalProperties: { type: 'string', enum: ['en', 'pt-BR', 'other'] },
			},
			embedded: {
				type: 'array',
				description:
					"BCP-47 languages embedded on purpose, e.g. ['en'] for English dialogue.",
				items: { type: 'string' },
			},
			allowlist: {
				type: 'array',
				description: "Foreign words used on purpose, e.g. ['laptop'].",
				items: { type: 'string' },
			},
			clear: {
				type: 'boolean',
				description: 'Remove the saved language setting instead of writing one.',
			},
		},
	},
	outputSchema: {
		type: 'object',
		properties: {
			locale: LOCALE_SCHEMA,
			previous: { ...(LOCALE_SCHEMA as object), description: 'Setting before this call.' },
		},
		required: ['locale'],
	},
	handler: setProjectLanguage,
};

async function setProjectLanguage(
	args: Record<string, unknown>,
	context: HandlerContext
): Promise<HandlerResult> {
	requireProject(context);
	const memory = requireMemoryManager(context);
	const previous = readProjectLocale(memory);
	let locale: ProjectLocale | null = null;
	if (args.clear === true) {
		// MemoryManager não tem remoção de chave; undefined some na serialização JSON.
		memory.setCustomContext(PROJECT_LOCALE_KEY, undefined);
		await memory.saveMemory();
	} else {
		const { clear: _clear, ...fields } = args;
		try {
			locale = parseProjectLocale(fields);
		} catch (error) {
			throw new HandlerError((error as Error).message, 'INVALID_ARGUMENT');
		}
		await writeProjectLocale(memory, locale);
	}
	const structuredContent = { locale, ...(previous ? { previous } : {}) };
	return {
		content: [
			{
				type: 'text',
				text: locale
					? `Project language saved: ${JSON.stringify(locale)}`
					: 'Project language setting cleared.',
			},
		],
		structuredContent,
	};
}
