import * as native from 'bluepencil-node';
import { adaptForNative } from '../pt-BR/adapt.js';
import { FUNCTION_WORDS } from '../pt-BR/data/function-words.js';
import { routeByText } from './route.js';

export type * from 'bluepencil-node';

type P<F extends (...args: never[]) => unknown> = Parameters<F>;
type R<F extends (...args: never[]) => unknown> = ReturnType<F>;

/** Adaptador pt-BR (D18): texto sem trechos estrangeiros e sem o ponto das abreviações. */
function adapted<T>(text: string, run: (text: string) => T): T {
	const prepared = adaptForNative(text);
	return prepared.restore(run(prepared.text));
}

// Palavras funcionais pt-BR não são eco (arquitetura §6.9: "para" era falso positivo).
const PT_ECHO_IGNORE = [...FUNCTION_WORDS['pt-BR']];

export function analyzeDialogue(
	...args: P<typeof native.analyzeDialogue>
): R<typeof native.analyzeDialogue> {
	return routeByText('bluepencil.analyzeDialogue', args[0], () =>
		native.analyzeDialogue(...args)
	);
}

export function analyzeRhythm(
	...args: P<typeof native.analyzeRhythm>
): R<typeof native.analyzeRhythm> {
	const [text, options] = args;
	return routeByText(
		'bluepencil.analyzeRhythm',
		text,
		() => native.analyzeRhythm(...args),
		() => adapted(text, (t) => native.analyzeRhythm(t, options))
	);
}

export function checkStyle(...args: P<typeof native.checkStyle>): R<typeof native.checkStyle> {
	return routeByText('bluepencil.checkStyle', args[0], () => native.checkStyle(...args));
}

export function findEchoes(...args: P<typeof native.findEchoes>): R<typeof native.findEchoes> {
	const [text, options] = args;
	return routeByText(
		'bluepencil.findEchoes',
		text,
		() => native.findEchoes(...args),
		() =>
			adapted(text, (t) =>
				native.findEchoes(t, {
					...options,
					ignore: [...PT_ECHO_IGNORE, ...(options?.ignore ?? [])],
				})
			)
	);
}

export function findRepeats(...args: P<typeof native.findRepeats>): R<typeof native.findRepeats> {
	const [text, options] = args;
	return routeByText(
		'bluepencil.findRepeats',
		text,
		() => native.findRepeats(...args),
		() => adapted(text, (t) => native.findRepeats(t, options))
	);
}

export function report(...args: P<typeof native.report>): R<typeof native.report> {
	return routeByText('bluepencil.report', args[0], () => native.report(...args));
}

export function sentenceStarters(
	...args: P<typeof native.sentenceStarters>
): R<typeof native.sentenceStarters> {
	const [text, options] = args;
	return routeByText(
		'bluepencil.sentenceStarters',
		text,
		() => native.sentenceStarters(...args),
		() => adapted(text, (t) => native.sentenceStarters(t, options))
	);
}
