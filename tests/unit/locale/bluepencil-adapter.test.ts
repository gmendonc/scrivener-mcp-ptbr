import * as native from 'bluepencil-node';
import { createCallContext, currentLocale, runWithLocale } from '../../../src/locale/context.js';
import {
	analyzeRhythm,
	findEchoes,
	findRepeats,
	sentenceStarters,
} from '../../../src/locale/engines/bluepencil.js';

function inPortuguese<T>(fn: () => T): T {
	return runWithLocale(
		createCallContext({ toolName: 'test', project: { primary: 'pt-BR' } }),
		fn
	);
}

describe('bluepencil adapter for pt-BR (R3.12, D18)', () => {
	it('keeps "Dra." inside its sentence', () => {
		const text = 'A Dra. Ana chegou. Ela saiu.';
		expect(native.analyzeRhythm(text).lengths).toHaveLength(3);
		expect(inPortuguese(() => analyzeRhythm(text)).lengths).toEqual([4, 2]);
	});

	it('keeps line, column and offset of findings and restores the dot in excerpts', () => {
		const text =
			'A Dra. Ana olhou a chuva.\nA Dra. Ana olhou a chuva de novo.\nE a Dra. Ana olhou a chuva.';
		const repeats = inPortuguese(() => findRepeats(text));
		const phrase = repeats.find((r) => r.phrase.includes('ana olhou'))!;
		expect(phrase).toBeDefined();
		for (const location of phrase.locations) {
			expect(
				text.slice(location.offset, location.offset + location.length).toLowerCase()
			).toContain('ana olhou');
			expect(location.excerpt).not.toContain('․');
		}
		const echoes = inPortuguese(() => findEchoes(text));
		for (const echo of echoes) {
			const line = text.split('\n')[echo.first.line - 1];
			expect(
				line
					.slice(echo.first.column - 1)
					.toLowerCase()
					.startsWith(echo.word)
			).toBe(true);
		}
	});

	it('splits Brazilian dash dialogue into sentences (revisão 3a)', () => {
		expect(native.analyzeRhythm('— Sim, vou agora.\n— Não vai não.').lengths).toEqual([6]);
		expect(
			inPortuguese(() => analyzeRhythm('— Sim, vou agora.\n— Não vai não.')).lengths
		).toEqual([3, 3]);
		expect(inPortuguese(() => analyzeRhythm('Ele saiu. — Ela ficou.')).lengths).toEqual([2, 2]);
		const starters = inPortuguese(() =>
			sentenceStarters(
				'— Ela vai voltar.\n— Ela não vai.\n— Ela vai sim.\nEla saiu. Ela voltou.'
			)
		);
		expect(starters.sentence.find((w) => w.word === 'ela')?.count).toBe(5);
	});

	it('returns locations in the native unit (UTF-8 bytes of the original) with original excerpts', () => {
		// Narração com acentos, travessão parentético e abreviação: a máscara muda o tamanho em bytes.
		const text =
			'Ação: a Dra. Ana — calma — olhou a chuva da varanda.\nAção: a Dra. Ana — calma — olhou a chuva da varanda de novo.';
		const adapted = inPortuguese(() => findRepeats(text));
		const nativeRepeats = native.findRepeats(text);
		const offsets = (rs: typeof adapted) =>
			rs
				.flatMap((r) => r.locations.map((l) => [l.offset, l.length]))
				.sort((a, b) => a[0] - b[0]);
		const locations = adapted.flatMap((r) => r.locations);
		expect(locations.length).toBeGreaterThan(0);
		const bytes = Buffer.from(text, 'utf8');
		for (const l of locations) {
			const slice = bytes.subarray(l.offset, l.offset + l.length).toString('utf8');
			expect(slice.replace(/\s+/g, ' ')).toContain(l.excerpt.replace(/\s+/g, ' ').trim());
		}
		expect(locations.some((l) => l.excerpt.includes('—') && l.excerpt.includes('Dra.'))).toBe(
			true
		);
		// A nativa sem máscara acha as mesmas frases repetidas nas mesmas posições em bytes.
		expect(
			offsets(adapted).filter((o) => offsets(nativeRepeats).some((n) => n[0] === o[0]))
		).not.toHaveLength(0);
	});

	it('keeps the native column when a blanked foreign span has an emoji (revisão 3b)', () => {
		const text =
			'— I told you 😀, this is not the place for that — disse John, e olhou a janela. Depois a janela fechou.';
		const echo = inPortuguese(() => findEchoes(text)).find((e) => e.word === 'janela');
		const nativeEcho = native.findEchoes(text).find((e) => e.word === 'janela');
		expect(echo?.first.column).toBe(nativeEcho?.first.column);
		expect(echo?.first.offset).toBe(nativeEcho?.first.offset);
	});

	it('does not put a dot mask inside a blanked foreign span', () => {
		const text = '— Dr. Smith, I told you this is not the place for that — disse John.';
		inPortuguese(() => {
			const { adaptForNative } = jest.requireActual('../../../src/locale/pt-BR/adapt.js');
			expect(adaptForNative(text).text).not.toContain('\u2024');
		});
	});

	it('ignores Portuguese function words as echoes', () => {
		const text =
			'Ela olhou para a janela e voltou para a cama. Depois foi para a cozinha olhar para a rua.';
		const words = inPortuguese(() => findEchoes(text)).map((e) => e.word);
		expect(native.findEchoes(text).map((e) => e.word)).toContain('para');
		expect(words).not.toContain('para');
	});

	it('runs sentence starters on the adapted text', () => {
		const text = 'Ela abriu. Ela olhou. Ela saiu. A Dra. Ana ficou.';
		const report = inPortuguese(() => sentenceStarters(text));
		expect(report.sentence.find((w) => w.word === 'ela')?.count).toBe(3);
	});
});
