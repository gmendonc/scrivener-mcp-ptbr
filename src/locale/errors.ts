import type { DetectedLanguage, Language } from './language.js';

export type UnsupportedReason =
	'not-implemented' | 'data-missing' | 'child-process' | 'sidecar-missing';

export class LanguageUnsupportedError extends Error {
	readonly code = 'LANGUAGE_UNSUPPORTED';

	constructor(
		readonly feature: string,
		readonly language: Language,
		readonly reason: UnsupportedReason,
		readonly alternative?: string
	) {
		super(`${feature} is not available for ${language} (${reason})`);
		this.name = 'LanguageUnsupportedError';
	}
}

export interface ChangedForeignSpan {
	start: number;
	end: number;
	before: string;
	after: string;
	languageBefore: DetectedLanguage;
	languageAfter: DetectedLanguage;
}

export class ForeignSpanChangedError extends Error {
	readonly code = 'FOREIGN_SPAN_CHANGED';

	constructor(readonly changed: ChangedForeignSpan[]) {
		super(`${changed.length} span(s) in another language were changed`);
		this.name = 'ForeignSpanChangedError';
	}
}
