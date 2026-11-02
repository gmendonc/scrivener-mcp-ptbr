// fonte: curadoria própria

/**
 * Segments a pt-BR text into narration, speech, dialogue tags and quotations (SPEC §6.8, R3.3).
 * Brazilian dialogue opens a paragraph with a dash; a dash after the speech closes it, and what
 * follows is the narrator's tag when it starts in lowercase ("— Vamos — disse Ana.") or a new
 * speech when it starts in uppercase ("— Vamos. — Agora."). Without a closing dash, the speech
 * runs to the end of the paragraph. Double and angle quotes mark speech inside narration; single
 * quotes mark a quotation.
 */

export type SegmentKind = 'narration' | 'speech' | 'tag' | 'quote';

export interface Segment {
	kind: SegmentKind;
	start: number;
	end: number;
	text: string;
	marker?: 'dash' | 'double' | 'angle' | 'single';
	speakerHint?: string;
}

const DIALOGUE_DASH = /^[ \t]*[—–][ \t]*/u;
const INNER_DASH = /[ \t]+[—–][ \t]*/gu;
const PAIRS: ReadonlyArray<{
	open: string;
	close: string;
	marker: Segment['marker'];
	kind: SegmentKind;
}> = [
	{ open: '“', close: '”', marker: 'double', kind: 'speech' },
	{ open: '"', close: '"', marker: 'double', kind: 'speech' },
	{ open: '«', close: '»', marker: 'angle', kind: 'speech' },
	{ open: '‘', close: '’', marker: 'single', kind: 'quote' },
];

export function segmentText(text: string): Segment[] {
	const segments: Segment[] = [];
	for (const paragraph of paragraphs(text)) {
		const lead = DIALOGUE_DASH.exec(paragraph.text);
		if (lead) segments.push(...dialogue(text, paragraph.start + lead[0].length, paragraph.end));
		else segments.push(...narration(text, paragraph.start, paragraph.end));
	}
	return segments;
}

function paragraphs(text: string): Array<{ start: number; end: number; text: string }> {
	const out: Array<{ start: number; end: number; text: string }> = [];
	let start = 0;
	for (const match of text.matchAll(/\r?\n/gu)) {
		out.push({ start, end: match.index, text: text.slice(start, match.index) });
		start = match.index + match[0].length;
	}
	out.push({ start, end: text.length, text: text.slice(start) });
	return out.filter((p) => p.text.trim());
}

function dialogue(text: string, from: number, to: number): Segment[] {
	const out: Segment[] = [];
	const body = text.slice(from, to);
	const dashes = [...body.matchAll(INNER_DASH)];
	let cursor = 0;
	let kind: SegmentKind = 'speech';
	let speaker: string | undefined;
	const pending: Segment[] = [];
	for (const dash of dashes) {
		const piece = trimmed(text, from + cursor, from + dash.index);
		if (piece)
			pending.push({ ...piece, kind, ...(kind === 'speech' ? { marker: 'dash' } : {}) });
		cursor = dash.index + dash[0].length;
		const next = body.slice(cursor);
		kind = /^\p{Ll}/u.test(next) && kind === 'speech' ? 'tag' : 'speech';
	}
	const last = trimmed(text, from + cursor, to);
	if (last) pending.push({ ...last, kind, ...(kind === 'speech' ? { marker: 'dash' } : {}) });
	for (const segment of pending) if (segment.kind === 'tag') speaker ??= speakerOf(segment.text);
	for (const segment of pending)
		out.push(
			segment.kind === 'speech' && speaker ? { ...segment, speakerHint: speaker } : segment
		);
	return out;
}

function narration(text: string, from: number, to: number): Segment[] {
	const out: Segment[] = [];
	let cursor = from;
	let i = from;
	while (i < to) {
		const pair = PAIRS.find((p) => text[i] === p.open && opensAt(text, i, p));
		if (!pair) {
			i++;
			continue;
		}
		const close = findClose(text, i + 1, to, pair);
		if (close === -1) {
			i++;
			continue;
		}
		const before = trimmed(text, cursor, i);
		if (before) out.push({ ...before, kind: 'narration' });
		const inner = trimmed(text, i + 1, close);
		if (inner) out.push({ ...inner, kind: pair.kind, marker: pair.marker });
		cursor = close + 1;
		i = close + 1;
	}
	const rest = trimmed(text, cursor, to);
	if (rest) out.push({ ...rest, kind: 'narration' });
	return out;
}

/** Aspa simples só abre no começo de palavra (não é o apóstrofo de "d’água"). */
function opensAt(text: string, i: number, pair: (typeof PAIRS)[number]): boolean {
	if (pair.marker !== 'single' && pair.open !== '"') return true;
	const prev = text[i - 1];
	return (prev === undefined || /[\s(—–]/u.test(prev)) && /\p{L}/u.test(text[i + 1] ?? '');
}

function findClose(text: string, from: number, to: number, pair: (typeof PAIRS)[number]): number {
	for (let k = from; k < to; k++) {
		if (text[k] !== pair.close) continue;
		// ’ entre letras é apóstrofo, não fechamento.
		if (pair.marker === 'single' && /\p{L}/u.test(text[k + 1] ?? '')) continue;
		return k;
	}
	return -1;
}

function trimmed(text: string, start: number, end: number): Omit<Segment, 'kind'> | undefined {
	while (start < end && /\s/u.test(text[start])) start++;
	while (end > start && /\s/u.test(text[end - 1])) end--;
	return end > start ? { start, end, text: text.slice(start, end) } : undefined;
}

/** Primeiro nome próprio da tag: "respondeu Carmen." → "Carmen". */
function speakerOf(tag: string): string | undefined {
	return /(?<![\p{L}\p{N}_])\p{Lu}[\p{L}\p{M}]+/u.exec(tag)?.[0];
}
