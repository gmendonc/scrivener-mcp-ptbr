import * as native from '../../utils/text-metrics.js';
import { joinTexts, routeByText } from './route.js';

export type { WritingTextMetrics } from '../../utils/text-metrics.js';

type P<F extends (...args: never[]) => unknown> = Parameters<F>;
type R<F extends (...args: never[]) => unknown> = ReturnType<F>;

export function getAccurateWordCount(
	...args: P<typeof native.getAccurateWordCount>
): R<typeof native.getAccurateWordCount> {
	return routeByText(args[0], () => native.getAccurateWordCount(...args));
}

export function getAccurateSentenceCount(
	...args: P<typeof native.getAccurateSentenceCount>
): R<typeof native.getAccurateSentenceCount> {
	return routeByText(args[0], () => native.getAccurateSentenceCount(...args));
}

export function getAccurateParagraphCount(
	...args: P<typeof native.getAccurateParagraphCount>
): R<typeof native.getAccurateParagraphCount> {
	return routeByText(args[0], () => native.getAccurateParagraphCount(...args));
}

export function splitIntoSentences(
	...args: P<typeof native.splitIntoSentences>
): R<typeof native.splitIntoSentences> {
	return routeByText(args[0], () => native.splitIntoSentences(...args));
}

export function getWritingTextMetrics(
	...args: P<typeof native.getWritingTextMetrics>
): R<typeof native.getWritingTextMetrics> {
	return routeByText(args[0], () => native.getWritingTextMetrics(...args));
}

export function getCharacterCount(
	...args: P<typeof native.getCharacterCount>
): R<typeof native.getCharacterCount> {
	return routeByText(args[0], () => native.getCharacterCount(...args));
}

export function getWordFrequency(
	...args: P<typeof native.getWordFrequency>
): R<typeof native.getWordFrequency> {
	return routeByText(args[0], () => native.getWordFrequency(...args));
}

export function splitIntoWords(
	...args: P<typeof native.splitIntoWords>
): R<typeof native.splitIntoWords> {
	return routeByText(args[0], () => native.splitIntoWords(...args));
}

export function getWordPairs(
	...args: P<typeof native.getWordPairs>
): R<typeof native.getWordPairs> {
	const [input] = args;
	return routeByText(typeof input === 'string' ? input : joinTexts(input), () =>
		native.getWordPairs(...args)
	);
}

export function countWords(...args: P<typeof native.countWords>): R<typeof native.countWords> {
	return routeByText(args[0], () => native.countWords(...args));
}
