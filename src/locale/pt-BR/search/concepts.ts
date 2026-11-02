// fonte: curadoria própria

/**
 * The 30 story concepts of the local passage search, in Brazilian Portuguese (SPEC §9.H, R4.1),
 * in the same order as the upstream list: the order is the embedding dimension. Patterns use
 * Unicode word boundaries (the JavaScript word boundary is ASCII-only) and avoid short stems
 * that catch other senses ("cur-" would match "curso", "mat-" would match "matéria").
 */
export interface Concept {
	name: string;
	pattern: RegExp;
}

const L = '\\p{L}*';
function words(...alternatives: string[]): RegExp {
	return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, 'iu');
}

export const CONCEPTS_PT_BR: readonly Concept[] = [
	{
		name: 'betrayal',
		pattern: words(
			`traiç${L}`,
			`traidor${L}`,
			'traiu',
			'trair',
			`traíd${L}`,
			'traíra',
			`delat${L}`,
			'pelas costas',
			'jogo duplo'
		),
	},
	{
		name: 'trust',
		pattern: words(
			`confiança${L}`,
			'confi(?:ar|o|a|as|am|ou|ava|avam|ei|amos|ável|áveis)',
			`leal${L}`,
			'fiel',
			'fiéis',
			'fidelidade',
			'melhor(?:es)? amig[oa]s?',
			`cumpri${L} (?:a|sua) promessa`
		),
	},
	{
		name: 'grief',
		pattern: words(
			'(?:de|o|em) luto',
			'luto pel[oa]s?',
			`enlutad${L}`,
			'pranto',
			`prante${L}`,
			`funera${L}`,
			`velório${L}`,
			`enterro${L}`,
			`sepultad${L}`,
			`perda de .{0,20}(?:amad|querid)${L}`
		),
	},
	{
		name: 'fear',
		pattern: words(
			`medo${L}`,
			`temor${L}`,
			'tem(?:ia|iam|eu|eram)',
			`assust${L}`,
			`apavor${L}`,
			'trem(?:e|em)',
			'pavor',
			'terror',
			'pânico',
			'susto',
			'trem(?:ia|iam|eu|endo|er)',
			`arrepi${L}`,
			'coração disparou',
			'mãos tremiam',
			'suor frio'
		),
	},
	{
		name: 'anger',
		pattern: words(
			'raiva',
			'ira',
			'irad[oa]s?',
			`furios${L}`,
			'fúria',
			'ódio',
			'odi(?:ava|avam|ou|ar|ei|o|a|amos)',
			`enfurec${L}`,
			`zangad${L}`,
			'punhos cerrados',
			`cerr${L} os punhos`,
			`indignad${L}`
		),
	},
	{
		name: 'affection',
		pattern: words(
			'amor',
			'amores',
			'am(?:o|a|am|ar|ando|ava|avam|ou|ei|amos)',
			`afeto${L}`,
			'afeição',
			`carinh${L}`,
			`beij${L}`,
			'ternura',
			`ador(?:ava|o|a|ou|ável)`,
			'paixão',
			`apaixonad${L}`,
			'de mãos dadas',
			`segurou .{0,20} mão`
		),
	},
	{
		name: 'isolation',
		pattern: words(
			`isolad${L}`,
			'isolamento',
			'solidão',
			`solitári${L}`,
			`sozinh${L}`,
			`abandon${L}`,
			'ninguém veio',
			'sem amigos'
		),
	},
	{
		name: 'concealment',
		pattern: words(
			`segredo${L}`,
			`escond${L}`,
			`ocult${L}`,
			`disfarç${L}`,
			'às escondidas',
			'nome falso',
			`encobri${L}`
		),
	},
	{
		name: 'deception',
		pattern: words(
			'mentir',
			`mentia${L}`,
			'mentiu',
			`mentira${L}`,
			`mentiros${L}`,
			`engan${L}`,
			`embuste${L}`,
			`farsa${L}`,
			`fraude${L}`,
			'falsidade',
			`ludibri${L}`
		),
	},
	{
		name: 'escape',
		pattern: words(
			'fugir',
			'fugiu',
			'fugia',
			'fugiram',
			'fuga',
			`fugitiv${L}`,
			`escap${L}`,
			`evadi${L}`,
			'correu para longe',
			'libertou-se',
			'se libertou'
		),
	},
	{
		name: 'pursuit',
		pattern: words(
			`persegu${L}`,
			`caçad${L}`,
			'caçar',
			'caçava',
			`rastre${L}`,
			'no encalço',
			'em seu encalço',
			`seguiu .{0,20} rastro`
		),
	},
	{
		name: 'conflict',
		pattern: words(
			`conflito${L}`,
			'luta',
			'lutas',
			'lutou',
			'lutar',
			'lutavam',
			'briga',
			'brigas',
			'brig(?:ou|aram|ava|avam|ar|ando|ado|uei|ue|am)',
			`batalha${L}`,
			`combate${L}`,
			`guerra${L}`,
			`duelo${L}`,
			`confronto${L}`
		),
	},
	{
		name: 'injury',
		pattern: words(
			`ferid${L}`,
			`ferimento${L}`,
			'sangue',
			`sangr${L}`,
			`ensanguentad${L}`,
			`fratur${L}`,
			'osso quebrado',
			`cicatriz${L}`,
			`machucad${L}`
		),
	},
	{
		name: 'healing',
		pattern: words(
			'cura',
			'curou',
			'curar',
			'curad[oa]s?',
			`recuper${L}`,
			`médic${L}`,
			`enfermeir${L}`,
			`curativo${L}`,
			`remédio${L}`,
			'tratamento',
			`convalesc${L}`
		),
	},
	{
		name: 'discovery',
		pattern: words(
			`descobr${L}`,
			`descobert${L}`,
			`revel${L}`,
			`desvend${L}`,
			'percebeu',
			'se deu conta',
			'soube a verdade'
		),
	},
	{
		name: 'memory',
		pattern: words(
			`memória${L}`,
			`lembr${L}`,
			'record(?:ou|ava|ação|ações|ar)',
			`reminisc${L}`,
			'anos antes',
			'infância'
		),
	},
	{
		name: 'authority',
		pattern: words(
			`autoridade${L}`,
			'(?:o|do|no|ao) poder',
			`poderos${L}`,
			`governante${L}`,
			'rei',
			'reis',
			`reino${L}`,
			`rainha${L}`,
			`govern${L}`,
			`comandante${L}`,
			`trono${L}`,
			`soberan${L}`
		),
	},
	{
		name: 'rebellion',
		pattern: words(
			`rebel${L}`,
			`revolt${L}`,
			`resistência${L}`,
			'levante (?:popular|armado)',
			'insurreição',
			'motim',
			`amotin${L}`,
			`derrub${L} o (?:rei|governo|tirano)`,
			`desafi${L}`
		),
	},
	{
		name: 'journey',
		pattern: words(
			'viagem',
			'viagens',
			`viaj${L}`,
			`jornada${L}`,
			'expedição',
			'travessia',
			`zarp${L}`,
			'navegou',
			'partiu rumo',
			'estrada para',
			'a caminho de'
		),
	},
	{
		name: 'homecoming',
		pattern: words(
			`volt${L} (?:para|pra) casa`,
			'de volta (?:para|pra|a) casa',
			`regress${L}`,
			`reencontr${L}`,
			'bem-vind[oa]s? de volta'
		),
	},
	{
		name: 'sacrifice',
		pattern: words(
			`sacrifíci${L}`,
			`sacrific${L}`,
			'(?:deu|dar|dando) a (?:própria )?vida',
			'pelo bem de'
		),
	},
	{
		name: 'forgiveness',
		pattern: words(
			`perdo${L}`,
			'perdão',
			`reconcili${L}`,
			'fizeram as pazes',
			'fazer as pazes',
			`deixou de lado .{0,20} rancor`
		),
	},
	{
		name: 'captivity',
		pattern: words(
			`cativ${L}`,
			'prisão',
			'prisões',
			`prisioneir${L}`,
			`encarcer${L}`,
			`masmorra${L}`,
			`jaula${L}`,
			`acorrentad${L}`,
			'cela',
			'pres[oa]s? (?:na|numa|em|pela|pelos|por)',
			'foi pres[oa]',
			'refém',
			'reféns'
		),
	},
	{
		name: 'hunger',
		pattern: words(
			'fome',
			`famint${L}`,
			`esfomead${L}`,
			`inaniç${L}`,
			'estômago vazio',
			'não comia',
			'não tinha comido'
		),
	},
	{
		name: 'weather',
		pattern: words(
			`tempestade${L}`,
			`chuv${L}`,
			'neve',
			`nevasca${L}`,
			'trovão',
			'trovões',
			`trovoada${L}`,
			`relâmpago${L}`,
			`garoa${L}`,
			`ventania${L}`,
			'sol a pino'
		),
	},
	{
		name: 'wealth',
		pattern: words(
			`riqueza${L}`,
			'ric[oa]s?',
			`fortuna${L}`,
			`tesouro${L}`,
			'ouro',
			'prata',
			'dinheiro',
			`moeda${L}`
		),
	},
	{
		name: 'poverty',
		pattern: words(
			'pobreza',
			'pobres?',
			'miséria',
			'miserável',
			'miseráveis',
			`indigent${L}`,
			`mendig${L}`,
			'sem dinheiro',
			'não podia pagar'
		),
	},
	{
		name: 'justice',
		pattern: words(
			'justiça',
			`julg${L}`,
			'tribunal',
			`veredito${L}`,
			`culpad${L}`,
			`inocen${L}`,
			`puni${L}`,
			`castig${L}`
		),
	},
	{
		name: 'death',
		pattern: words(
			'morte',
			'mortes',
			'mort[oa]s?',
			'morreu',
			`morre(?:r|ria|ram|ndo)`,
			'morria',
			'matou',
			'matar',
			'mat(?:aram|ava|avam|ei|aria|ara)',
			'morrera',
			'morreram',
			`assassin${L}`,
			`cadáver${L}`,
			`túmulo${L}`,
			`sepultura${L}`
		),
	},
	{
		name: 'hope',
		pattern: words(
			`esperança${L}`,
			`esperanços${L}`,
			`otimis${L}`,
			'recomeço',
			'(?:nova|segunda) chance',
			'dias melhores',
			'luz no fim do túnel'
		),
	},
];
