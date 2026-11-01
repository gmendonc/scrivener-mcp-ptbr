import * as native from 'bluepencil-node';
import { routeByText } from './route.js';

export type * from 'bluepencil-node';

type P<F extends (...args: never[]) => unknown> = Parameters<F>;
type R<F extends (...args: never[]) => unknown> = ReturnType<F>;

export function analyzeDialogue(
	...args: P<typeof native.analyzeDialogue>
): R<typeof native.analyzeDialogue> {
	return routeByText(args[0], () => native.analyzeDialogue(...args));
}

export function analyzeRhythm(
	...args: P<typeof native.analyzeRhythm>
): R<typeof native.analyzeRhythm> {
	return routeByText(args[0], () => native.analyzeRhythm(...args));
}

export function checkStyle(...args: P<typeof native.checkStyle>): R<typeof native.checkStyle> {
	return routeByText(args[0], () => native.checkStyle(...args));
}

export function findEchoes(...args: P<typeof native.findEchoes>): R<typeof native.findEchoes> {
	return routeByText(args[0], () => native.findEchoes(...args));
}

export function findRepeats(...args: P<typeof native.findRepeats>): R<typeof native.findRepeats> {
	return routeByText(args[0], () => native.findRepeats(...args));
}

export function report(...args: P<typeof native.report>): R<typeof native.report> {
	return routeByText(args[0], () => native.report(...args));
}

export function sentenceStarters(
	...args: P<typeof native.sentenceStarters>
): R<typeof native.sentenceStarters> {
	return routeByText(args[0], () => native.sentenceStarters(...args));
}
