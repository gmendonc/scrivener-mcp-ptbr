import { ForeignSpanChangedError } from '../../../src/locale/errors.js';
import { assertForeignSpansPreserved } from '../../../src/locale/pt-BR/text/foreign-guard.js';

const BEFORE =
	"Ana esperou na fila do cartório.\n— I told you, don't do this here, this is not the place for that — disse o estrangeiro.";
const OPTIONS = { documentLanguage: 'pt-BR' as const, embedded: ['en'] };

function changed(after: string) {
	try {
		assertForeignSpansPreserved(BEFORE, after, OPTIONS);
		return undefined;
	} catch (error) {
		return (error as ForeignSpanChangedError).changed;
	}
}

describe('foreign span guard (R3.11, D4)', () => {
	it('accepts a rewrite that keeps the speech, even with typographic apostrophes', () => {
		expect(changed(BEFORE.replace('esperou', 'aguardou'))).toBeUndefined();
		expect(changed(BEFORE.replace("don't", 'don’t'))).toBeUndefined();
	});

	it('rejects a translated speech with both languages', () => {
		expect(
			changed(
				BEFORE.replace(
					/I told you.*for that/u,
					'Eu te disse, não faça isso aqui, este não é o lugar'
				)
			)
		).toEqual([expect.objectContaining({ languageBefore: 'en', languageAfter: 'pt-BR' })]);
	});

	it('rejects a removed speech without claiming it was translated', () => {
		expect(changed('Ana esperou na fila do cartório.')).toEqual([
			expect.objectContaining({ after: '', languageAfter: 'undetermined' }),
		]);
	});
});
