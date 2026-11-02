import { createCallContext, runWithLocale } from '../../../src/locale/context.js';
import { CONCEPTS_PT_BR } from '../../../src/locale/pt-BR/search/concepts.js';
import { conceptRevision, conceptsFor } from '../../../src/locale/search.js';

// Os 30 nomes do upstream (src/services/editorial/passage-search.ts), na ordem.
const UPSTREAM_NAMES = [
	'betrayal',
	'trust',
	'grief',
	'fear',
	'anger',
	'affection',
	'isolation',
	'concealment',
	'deception',
	'escape',
	'pursuit',
	'conflict',
	'injury',
	'healing',
	'discovery',
	'memory',
	'authority',
	'rebellion',
	'journey',
	'homecoming',
	'sacrifice',
	'forgiveness',
	'captivity',
	'hunger',
	'weather',
	'wealth',
	'poverty',
	'justice',
	'death',
	'hope',
];
const ENGLISH = UPSTREAM_NAMES.map((name) => ({ name, pattern: /x/u }));
const inPortuguese = <T>(fn: () => T) =>
	runWithLocale(createCallContext({ toolName: 't', project: { primary: 'pt-BR' } }), fn);

describe('pt-BR search concepts (R4.1)', () => {
	it('has the same 30 names in the same order as the upstream', () => {
		expect(CONCEPTS_PT_BR.map((c) => c.name)).toEqual(UPSTREAM_NAMES);
	});

	it('returns the upstream object in English and the pt-BR list in pt-BR', () => {
		expect(conceptsFor(ENGLISH)).toBe(ENGLISH);
		expect(inPortuguese(() => conceptsFor(ENGLISH))).toBe(CONCEPTS_PT_BR);
		expect(conceptRevision('1')).toBe('1');
		expect(inPortuguese(() => conceptRevision('1'))).toBe('1-pt-BR');
	});

	it.each([
		['fear', 'Ela tremia de medo no corredor escuro.'],
		['betrayal', 'Foi uma traição: o amigo a vendeu pelas costas.'],
		['grief', 'No velório, o pranto da viúva encheu a sala.'],
		['weather', 'A tempestade trouxe chuva e trovões a noite inteira.'],
		['death', 'Ele morreu antes do amanhecer.'],
		['healing', 'O médico fez um curativo e disse que ela ia se recuperar.'],
		// revisão da R4.1: flexões que faltavam e o padrão de perda que nunca casava
		['grief', 'Ele chorava a perda de seu amado pai.'],
		['affection', 'Eu te amo.'],
		['death', 'Mataram o guarda ao amanhecer.'],
		['captivity', 'Ele foi preso pela guarda.'],
		['anger', 'Ela odiava o pai.'],
		['fear', 'Ela temia o pior.'],
		['homecoming', 'Voltou pra casa depois da guerra.'],
		['trust', 'Eram os melhores amigos da rua.'],
		['authority', 'O reino caiu.'],
	])('finds %s', (name, text) => {
		const concept = CONCEPTS_PT_BR.find((c) => c.name === name)!;
		expect(concept.pattern.test(text)).toBe(true);
	});

	it.each([
		['healing', 'Ela fez um curso curto sobre a cultura.'],
		['authority', 'Saiu cedo para poder pegar o ônibus.'],
		['grief', 'Eu luto contra isso todos os dias.'],
		['rebellion', 'Levante-se, menino!'],
		['conflict', 'Comeu um brigadeiro na festa.'],
		['death', 'A mata estava úmida e a matéria era difícil.'],
		['wealth', 'O ricochete assustou o cavalo.'],
	])('does not take another sense for %s', (name, text) => {
		const concept = CONCEPTS_PT_BR.find((c) => c.name === name)!;
		expect(concept.pattern.test(text)).toBe(false);
	});
});
